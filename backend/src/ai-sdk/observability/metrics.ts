import type { AiFailureReason } from '../core/errors';
import type { TokenUsage } from '../core/types';

/** One model call attempt (success or failure), emitted by the router. */
export interface AiCallEvent {
  task: string;
  provider: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  usage?: TokenUsage;
  reason?: AiFailureReason;
  /** True when this attempt was not the first choice in the task's chain. */
  fallback: boolean;
}

export type AiEventListener = (event: AiCallEvent) => void;

export interface ModelMetrics {
  calls: number;
  successes: number;
  failures: number;
  failuresByReason: Partial<Record<AiFailureReason, number>>;
  promptTokens: number;
  outputTokens: number;
  averageLatencyMs: number;
}

/** In-memory counters per `provider:model`. Cheap, and enough to answer "what is the AI costing / doing?". */
export class MetricsCollector {
  private readonly byModel = new Map<string, Omit<ModelMetrics, 'averageLatencyMs'> & { totalLatencyMs: number }>();

  readonly listener: AiEventListener = (event) => {
    const key = `${event.provider}:${event.model}`;
    const entry =
      this.byModel.get(key) ??
      { calls: 0, successes: 0, failures: 0, failuresByReason: {}, promptTokens: 0, outputTokens: 0, totalLatencyMs: 0 };

    entry.calls += 1;
    entry.totalLatencyMs += event.latencyMs;
    if (event.ok) {
      entry.successes += 1;
      entry.promptTokens += event.usage?.promptTokens ?? 0;
      entry.outputTokens += event.usage?.outputTokens ?? 0;
    } else {
      entry.failures += 1;
      if (event.reason) entry.failuresByReason[event.reason] = (entry.failuresByReason[event.reason] ?? 0) + 1;
    }
    this.byModel.set(key, entry);
  };

  snapshot(): Record<string, ModelMetrics> {
    return Object.fromEntries(
      [...this.byModel.entries()].map(([key, { totalLatencyMs, ...rest }]) => [
        key,
        { ...rest, averageLatencyMs: rest.calls ? Math.round(totalLatencyMs / rest.calls) : 0 },
      ]),
    );
  }
}

/** One structured log line per attempt; the usage figures here are what a cost report is built from. */
export const logListener: AiEventListener = (event) => {
  const usage = event.usage ? ` in=${event.usage.promptTokens} out=${event.usage.outputTokens}` : '';
  const outcome = event.ok ? 'ok' : `failed(${event.reason})`;
  const fallback = event.fallback ? ' fallback=true' : '';
  console.info(`[ai] task=${event.task} ${event.provider}:${event.model} ${outcome} ms=${event.latencyMs}${usage}${fallback}`);
};
