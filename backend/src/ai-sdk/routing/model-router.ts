import { AiError, AttemptRecord, toAiError } from '../core/errors';
import type { AiProvider, AiRequest, AiResult } from '../core/types';
import type { AiCallEvent, AiEventListener } from '../observability/metrics';
import { Bulkhead } from '../resilience/bulkhead';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { RetryOptions, withRetry } from '../resilience/retry';
import type { RouteTarget } from './route-spec';

export interface RouterOptions {
  providers: readonly AiProvider[];
  /** Fallback chain per task name. */
  routes: Record<string, RouteTarget[]>;
  /** Used for any task without its own route. */
  defaultRoute: RouteTarget[];
  defaults: { timeoutMs: number; retries: number; temperature: number };
  bulkhead: Bulkhead;
  breaker?: { failureThreshold?: number; cooldownMs?: number; now?: () => number };
  retry?: Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'sleep' | 'random'>;
  listeners?: AiEventListener[];
}

/**
 * Picks the model for a task and keeps the request alive across failures.
 *
 * For each target in the task's chain it: skips unconfigured providers and open circuits, queues
 * behind the bulkhead, retries transient errors with backoff, validates the answer with the
 * caller's parser, and on failure moves to the next target. The caller gets one result, or one
 * `AiError` carrying the full attempt history.
 */
export class ModelRouter {
  private readonly providers: Map<string, AiProvider>;
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly options: RouterOptions) {
    this.providers = new Map(options.providers.map((provider) => [provider.name, provider]));
  }

  chainFor(task: string): RouteTarget[] {
    return this.options.routes[task] ?? this.options.defaultRoute;
  }

  /** True if at least one provider in any route could actually be called. */
  hasUsableProvider(): boolean {
    const chains = [this.options.defaultRoute, ...Object.values(this.options.routes)];
    return chains.some((chain) => chain.some((target) => this.providers.get(target.provider)?.isConfigured()));
  }

  breakerStates(): Array<{ key: string; open: boolean }> {
    return [...this.breakers.entries()].map(([key, breaker]) => ({ key, open: breaker.isOpen }));
  }

  async execute<T = string>(request: AiRequest<T>): Promise<AiResult<T>> {
    const chain = this.chainFor(request.task);
    const attempts: AttemptRecord[] = [];

    for (const [index, target] of chain.entries()) {
      const provider = this.providers.get(target.provider);
      if (!provider) continue;

      const model = (index === 0 ? request.model : undefined) ?? target.model ?? provider.defaultModel;
      const record = (partial: Pick<AttemptRecord, 'ok' | 'latencyMs'> & Partial<AttemptRecord>): AttemptRecord => {
        const attempt = { provider: provider.name, model, ...partial };
        attempts.push(attempt);
        return attempt;
      };

      if (!provider.isConfigured()) {
        record({ ok: false, latencyMs: 0, reason: 'not_configured', message: `${provider.name} has no API key.` });
        continue;
      }

      const breaker = this.breakerFor(`${provider.name}:${model}`);
      if (!breaker.canRequest()) {
        record({ ok: false, latencyMs: 0, reason: 'circuit_open', message: `${provider.name}:${model} is paused after repeated failures.` });
        continue;
      }

      const startedAt = Date.now();
      try {
        const raw = await this.options.bulkhead.run(() =>
          withRetry(() => this.callOnce(provider, model, request), {
            retries: request.retries ?? this.options.defaults.retries,
            ...this.options.retry,
          }),
        );
        breaker.recordSuccess(); // the provider answered, even if the answer is rejected below

        const value = this.parse(request, raw.text, provider.name, model);
        const latencyMs = Date.now() - startedAt;
        record({ ok: true, latencyMs });
        this.emit({ task: request.task, provider: provider.name, model, ok: true, latencyMs, usage: raw.usage, fallback: index > 0 });

        return {
          value,
          text: raw.text,
          provider: provider.name,
          model,
          usage: raw.usage,
          latencyMs,
          fallbackUsed: index > 0,
          attempts,
        };
      } catch (error) {
        const failure = toAiError(error, provider.name, model);
        const latencyMs = Date.now() - startedAt;
        if (failure.tripsBreaker) breaker.recordFailure();
        record({ ok: false, latencyMs, reason: failure.reason, message: failure.message });
        this.emit({ task: request.task, provider: provider.name, model, ok: false, latencyMs, reason: failure.reason, fallback: index > 0 });
      }
    }

    throw this.exhausted(request.task, attempts);
  }

  private async callOnce<T>(provider: AiProvider, model: string, request: AiRequest<T>) {
    const timeoutMs = request.timeoutMs ?? this.options.defaults.timeoutMs;
    try {
      return await provider.generate({
        model,
        system: request.system,
        prompt: request.prompt,
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature ?? this.options.defaults.temperature,
        jsonSchema: request.jsonSchema,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw toAiError(error, provider.name, model);
    }
  }

  private parse<T>(request: AiRequest<T>, text: string, provider: string, model: string): T {
    if (!request.parse) return text as unknown as T;
    try {
      return request.parse(text);
    } catch (error) {
      throw new AiError('invalid_output', `Output rejected by parser: ${(error as Error).message}`, { provider, model });
    }
  }

  private exhausted(task: string, attempts: AttemptRecord[]): AiError {
    const last = attempts[attempts.length - 1];
    // Skipped providers (no key / open circuit) are self-explanatory; real failures carry the provider's own message.
    const summary = attempts
      .map((a) => `${a.provider}:${a.model}=${a.reason ?? 'ok'}${a.message && a.latencyMs > 0 ? ` [${a.message}]` : ''}`)
      .join(', ');
    return new AiError(last?.reason ?? 'not_configured', `No AI provider could serve "${task}" (${summary || 'empty route'}).`, { attempts });
  }

  private breakerFor(key: string): CircuitBreaker {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      const { failureThreshold, cooldownMs, now } = this.options.breaker ?? {};
      breaker = new CircuitBreaker(failureThreshold, cooldownMs, now);
      this.breakers.set(key, breaker);
    }
    return breaker;
  }

  private emit(event: AiCallEvent): void {
    for (const listener of this.options.listeners ?? []) {
      try {
        listener(event);
      } catch {
        // observability must never break a request
      }
    }
  }
}
