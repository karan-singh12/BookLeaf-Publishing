/**
 * Why a model call failed. Providers translate their own HTTP/SDK errors into one of these,
 * so the router can make decisions (retry? fall back? trip the breaker?) without knowing
 * anything provider-specific.
 */
export type AiFailureReason =
  | 'not_configured' // no API key for this provider
  | 'circuit_open' // provider recently failed repeatedly; skipped without a call
  | 'rate_limited' // HTTP 429 or local queue full
  | 'timeout'
  | 'upstream_error' // 5xx / network failure
  | 'auth_error' // 401/403: bad or revoked key
  | 'bad_request' // 400/404/422: request rejected (e.g. unknown model, unsupported schema)
  | 'invalid_output'; // the call worked but the answer was empty or failed the caller's parser

/** Transient problems worth retrying against the same provider. */
const RETRYABLE: ReadonlySet<AiFailureReason> = new Set(['rate_limited', 'timeout', 'upstream_error']);

/** Problems that mean the provider itself is unhealthy (as opposed to one bad answer). */
const TRIPS_BREAKER: ReadonlySet<AiFailureReason> = new Set(['rate_limited', 'timeout', 'upstream_error', 'auth_error']);

export interface AttemptRecord {
  provider: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  reason?: AiFailureReason;
  message?: string;
}

export interface AiErrorOptions {
  provider?: string;
  model?: string;
  /** Server-suggested wait (e.g. from a Retry-After header). */
  retryAfterMs?: number;
  /** Every provider/model tried before giving up (set on the router's final error). */
  attempts?: AttemptRecord[];
}

export class AiError extends Error {
  readonly provider?: string;
  readonly model?: string;
  readonly retryAfterMs?: number;
  readonly attempts: AttemptRecord[];

  constructor(
    readonly reason: AiFailureReason,
    message: string,
    options: AiErrorOptions = {},
  ) {
    super(message);
    this.name = 'AiError';
    this.provider = options.provider;
    this.model = options.model;
    this.retryAfterMs = options.retryAfterMs;
    this.attempts = options.attempts ?? [];
  }

  get retryable(): boolean {
    return RETRYABLE.has(this.reason);
  }

  get tripsBreaker(): boolean {
    return TRIPS_BREAKER.has(this.reason);
  }
}

/** Normalises anything thrown into an `AiError`. */
export const toAiError = (error: unknown, provider?: string, model?: string): AiError => {
  if (error instanceof AiError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new AiError('upstream_error', message, { provider, model });
};
