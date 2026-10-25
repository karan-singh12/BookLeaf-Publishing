import type { ApiFailure, ApiSuccess, FieldError, PageMeta } from "@/types/api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1").replace(/\/$/, "");

/** Anything that goes wrong talking to the API, in one shape the UI can rely on. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: FieldError[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Server-side validation message for one form field, if any. */
  fieldMessage(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
let tokenProvider: () => string | null = () => null;

/** Wired up once by the auth provider: where to find the token, and what to do on a 401. */
export const configureApiClient = (options: { getToken: () => string | null; onUnauthorized: UnauthorizedHandler }) => {
  tokenProvider = options.getToken;
  onUnauthorized = options.onUnauthorized;
};

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the global "session expired" handling (used by the login call itself). */
  public?: boolean;
}

const buildUrl = (path: string, query?: Query): string => {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
};

export const authHeader = (): Record<string, string> => {
  const token = tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Calls the API and returns `{ data, meta }`, or throws an `ApiError`. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: PageMeta }> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: { ...(options.body === undefined ? {} : { "Content-Type": "application/json" }), ...authHeader() },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "NETWORK_ERROR");
  }

  let payload: ApiSuccess<T> | ApiFailure | null = null;
  try {
    payload = await response.json();
  } catch {
    // fall through: handled below as an unexpected response
  }

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload && payload.success === false ? payload : null;
    if (response.status === 401 && !options.public) onUnauthorized?.();
    throw new ApiError(
      failure?.message ?? "Something went wrong. Please try again.",
      response.status,
      failure?.error.code ?? "UNEXPECTED_RESPONSE",
      failure?.error.details,
      failure?.requestId,
    );
  }

  return { data: payload.data, meta: payload.meta };
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, options: Pick<RequestOptions, "public"> = {}) =>
    request<T>(path, { method: "POST", body: body ?? {}, ...options }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
};

export const apiUrl = (path: string): string => `${API_URL}${path}`;
