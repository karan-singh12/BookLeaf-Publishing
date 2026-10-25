/** The API's two response envelopes. See backend/src/utils/response.ts. */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: PageMeta;
  requestId: string;
  timestamp: string;
}

export interface FieldError {
  field?: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  error: { code: string; details?: FieldError[] };
  requestId: string;
  timestamp: string;
}

/** What a service function returns: the payload, plus pagination when the endpoint has it. */
export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}
