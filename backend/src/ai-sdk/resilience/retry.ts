import { AiError } from '../core/errors';

export interface RetryOptions {
  /** Extra attempts after the first. */
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries transient `AiError`s with exponential backoff and jitter, honouring a server-provided
 * Retry-After when there is one. Non-retryable errors (bad key, bad request, bad output) surface
 * immediately: retrying them can't help and only burns quota.
 */
export const withRetry = async <T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> => {
  const { retries, baseDelayMs = 400, maxDelayMs = 5_000, sleep = defaultSleep, random = Math.random } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const retryable = error instanceof AiError && error.retryable;
      if (!retryable || attempt >= retries) throw error;

      const backoff = baseDelayMs * 2 ** attempt + random() * 150;
      await sleep(Math.min(error.retryAfterMs ?? backoff, maxDelayMs));
    }
  }
};
