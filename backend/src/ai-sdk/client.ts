import type { AiProvider, AiRequest, AiResult } from './core/types';
import { MetricsCollector, logListener, type AiEventListener } from './observability/metrics';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiCompatibleProvider } from './providers/openai.provider';
import { Bulkhead } from './resilience/bulkhead';
import { ModelRouter, type RouterOptions } from './routing/model-router';
import { parseRouteSpec, type RouteTarget } from './routing/route-spec';

interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

interface GeminiSettings extends ProviderSettings {
  thinkingBudget?: number;
}

export interface AiSdkConfig {
  providers: {
    gemini: GeminiSettings;
    openai: ProviderSettings;
    anthropic: ProviderSettings;
    openrouter: ProviderSettings;
    grok?: ProviderSettings;
    groq?: ProviderSettings;
  };
  /** Route per task, e.g. `{ classify: "gemini:gemini-2.0-flash,openai:gpt-4o-mini" }`. */
  routes: Record<string, string | undefined>;
  /** Chain for tasks without their own route. Omit to try every provider in priority order. */
  defaultRoute?: string;
  timeoutMs: number;
  retries: number;
  temperature: number;
  maxConcurrent: number;
  maxQueued: number;
}

export interface AiClientExtras {
  /** Extra or replacement providers (used by tests and for custom backends). */
  providers?: AiProvider[];
  listeners?: AiEventListener[];
  /** Tuning knobs for the router; mainly so tests can run without real delays. */
  router?: Pick<RouterOptions, 'breaker' | 'retry'>;
  /** Disable the default console logger (tests). */
  silent?: boolean;
}

/** Provider priority when no explicit route is configured: Gemini -> Groq -> Grok -> OpenRouter -> OpenAI -> Anthropic. */
const DEFAULT_PRIORITY = ['gemini', 'groq', 'grok', 'openrouter', 'openai', 'anthropic'];

/**
 * The SDK's single public entry point. Application code asks for a *task*; the client decides
 * which model serves it, and survives provider failures on the caller's behalf.
 */
export class AiClient {
  constructor(
    private readonly router: ModelRouter,
    private readonly metrics: MetricsCollector,
    private readonly bulkhead: Bulkhead,
    private readonly providers: readonly AiProvider[],
    private readonly routes: Record<string, RouteTarget[]>,
    private readonly defaultRoute: RouteTarget[],
  ) {}

  generate<T = string>(request: AiRequest<T>): Promise<AiResult<T>> {
    return this.router.execute(request);
  }

  /** False means every call will fail with `not_configured`: callers should use their manual fallback. */
  isConfigured(): boolean {
    return this.router.hasUsableProvider();
  }

  /** Operational snapshot: what is configured, how tasks are routed, and how it is behaving. */
  status() {
    const describe = (chain: RouteTarget[]) => chain.map((t) => (t.model ? `${t.provider}:${t.model}` : t.provider));
    return {
      providers: this.providers.map((p) => ({ name: p.name, configured: p.isConfigured(), defaultModel: p.defaultModel })),
      defaultRoute: describe(this.defaultRoute),
      routes: Object.fromEntries(Object.entries(this.routes).map(([task, chain]) => [task, describe(chain)])),
      circuitBreakers: this.router.breakerStates(),
      queue: this.bulkhead.stats,
      metrics: this.metrics.snapshot(),
    };
  }
}

export const createAiClient = (config: AiSdkConfig, extras: AiClientExtras = {}): AiClient => {
  const { gemini, openai, anthropic, openrouter, grok, groq } = config.providers;

  const defaultProviders: AiProvider[] = [
    new GeminiProvider(gemini),
    new OpenAiCompatibleProvider({ name: 'openai', ...openai, nativeStructuredOutput: true }),
    new AnthropicProvider(anthropic),
    new OpenAiCompatibleProvider({ name: 'openrouter', ...openrouter, nativeStructuredOutput: false }),
  ];

  if (groq) {
    defaultProviders.push(new OpenAiCompatibleProvider({ name: 'groq', ...groq, nativeStructuredOutput: false }));
  }
  if (grok) {
    defaultProviders.push(new OpenAiCompatibleProvider({ name: 'grok', ...grok, nativeStructuredOutput: false }));
  }

  const providers = new Map<string, AiProvider>(
    [
      ...defaultProviders,
      ...(extras.providers ?? []),
    ].map((provider) => [provider.name, provider]),
  );

  const known = [...providers.keys()];
  const priority = [...DEFAULT_PRIORITY, ...known.filter((name) => !DEFAULT_PRIORITY.includes(name))];

  const defaultRoute = config.defaultRoute
    ? parseRouteSpec(config.defaultRoute, known)
    : priority.filter((name) => providers.has(name)).map((provider): RouteTarget => ({ provider }));

  const routes: Record<string, RouteTarget[]> = {};
  for (const [task, spec] of Object.entries(config.routes)) {
    if (spec?.trim()) routes[task] = parseRouteSpec(spec, known);
  }

  const metrics = new MetricsCollector();
  const bulkhead = new Bulkhead(config.maxConcurrent, config.maxQueued);
  const router = new ModelRouter({
    providers: [...providers.values()],
    routes,
    defaultRoute,
    defaults: { timeoutMs: config.timeoutMs, retries: config.retries, temperature: config.temperature },
    bulkhead,
    listeners: [metrics.listener, ...(extras.silent ? [] : [logListener]), ...(extras.listeners ?? [])],
    ...extras.router,
  });

  return new AiClient(router, metrics, bulkhead, [...providers.values()], routes, defaultRoute);
};
