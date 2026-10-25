import type { AttemptRecord } from './errors';

/** A standard JSON Schema object. Providers adapt it to their own structured-output dialect. */
export type JsonSchema = Record<string, unknown>;

export interface TokenUsage {
  promptTokens: number;
  outputTokens: number;
}

/**
 * What the application asks for. `task` selects the routing chain ("classify", "draft", ...),
 * so cheap/fast models can serve simple tasks and stronger ones the hard tasks.
 */
export interface AiRequest<T = string> {
  task: string;
  system?: string;
  prompt: string;
  maxOutputTokens: number;
  temperature?: number;
  /** Ask for JSON conforming to this schema (native structured output where the provider has it). */
  jsonSchema?: JsonSchema;
  /**
   * Turns the raw text into the value you want, and may throw to reject it. A rejection counts as
   * `invalid_output` for that model and the router moves on to the next one in the chain.
   */
  parse?: (text: string) => T;
  /** Force a specific model for the first provider tried (rare; normally the route decides). */
  model?: string;
  /** Extra attempts per model on transient errors. Defaults to the client's setting. */
  retries?: number;
  timeoutMs?: number;
}

export interface AiResult<T = string> {
  value: T;
  text: string;
  provider: string;
  model: string;
  usage?: TokenUsage;
  latencyMs: number;
  /** True when anything other than the first choice in the chain answered. */
  fallbackUsed: boolean;
  /** Every provider/model tried, in order, including skipped and failed ones. */
  attempts: AttemptRecord[];
}

/** What a provider receives: already resolved to a concrete model, with a deadline attached. */
export interface ProviderCall {
  model: string;
  system?: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
  jsonSchema?: JsonSchema;
  signal: AbortSignal;
}

export interface ProviderResult {
  text: string;
  usage?: TokenUsage;
}

/**
 * A provider is a thin transport adapter: one request out, one normalised result (or `AiError`)
 * back. Retries, fallback, breakers and metrics are the router's job, never the provider's.
 */
export interface AiProvider {
  readonly name: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generate(call: ProviderCall): Promise<ProviderResult>;
}
