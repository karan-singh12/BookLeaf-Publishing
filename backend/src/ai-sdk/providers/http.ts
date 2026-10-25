import { AiError } from '../core/errors';

export interface PostJsonOptions {
  provider: string;
  model: string;
  headers: Record<string, string>;
  body: unknown;
  signal: AbortSignal;
}

const DETAIL_LIMIT = 200;

const parseRetryAfterMs = (header: string | null): number | undefined => {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
};

/** Maps an HTTP failure to the SDK's failure vocabulary. Shared so every provider behaves identically. */
const httpError = async (response: Response, provider: string, model: string): Promise<AiError> => {
  const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, DETAIL_LIMIT);
  const message = `${provider} responded with HTTP ${response.status}${detail ? `: ${detail}` : ''}`;
  const options = { provider, model, retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')) };

  if (response.status === 429) return new AiError('rate_limited', message, options);
  if (response.status === 401 || response.status === 403) return new AiError('auth_error', message, options);
  if (response.status === 408) return new AiError('timeout', message, options);
  if (response.status >= 500) return new AiError('upstream_error', message, options);
  return new AiError('bad_request', message, options);
};

/** POSTs JSON and returns the parsed body, or throws a normalised `AiError`. */
export const postJson = async <T>(url: string, { provider, model, headers, body, signal }: PostJsonOptions): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new AiError('timeout', `${provider} did not answer in time.`, { provider, model });
    }
    throw new AiError('upstream_error', `${provider} request failed: ${(error as Error).message}`, { provider, model });
  }

  if (!response.ok) throw await httpError(response, provider, model);

  try {
    return (await response.json()) as T;
  } catch {
    throw new AiError('invalid_output', `${provider} returned a body that is not JSON.`, { provider, model });
  }
};
