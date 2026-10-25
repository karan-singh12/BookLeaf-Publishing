import { Response } from 'express';
import { ErrorCode, ErrorDetail } from './errors';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * The single response format for the whole API.
 *
 *   success: { success: true,  message, data, meta?, requestId, timestamp }
 *   failure: { success: false, message, error: { code, details? }, requestId, timestamp }
 *
 * `message` is always present and human-readable, so a client can show it directly;
 * `error.code` is the stable machine-readable value to branch on.
 */
export interface SuccessOptions<T> {
  message: string;
  data?: T;
  statusCode?: number;
  meta?: PageMeta;
}

const envelopeBase = (res: Response) => ({
  requestId: res.req?.id,
  timestamp: new Date().toISOString(),
});

export const sendSuccess = <T>(res: Response, { message, data, statusCode = 200, meta }: SuccessOptions<T>): Response =>
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
    ...envelopeBase(res),
  });

export const sendError = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): Response =>
  res.status(statusCode).json({
    success: false,
    message,
    error: { code, ...(details?.length ? { details } : {}) },
    ...envelopeBase(res),
  });

/** 200 OK. */
export const ok = <T>(res: Response, message: string, data?: T, meta?: PageMeta): Response =>
  sendSuccess(res, { message, data, meta });

/** 201 Created. */
export const created = <T>(res: Response, message: string, data?: T): Response =>
  sendSuccess(res, { message, data, statusCode: 201 });

export const buildPageMeta = (page: number, limit: number, total: number): PageMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
