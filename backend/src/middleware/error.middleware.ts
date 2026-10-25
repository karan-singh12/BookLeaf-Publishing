import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { MESSAGES } from '../constants/messages';
import { AppError, ErrorDetail } from '../utils/errors';
import { sendError } from '../utils/response';

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, 'NOT_FOUND', MESSAGES.common.routeNotFound(req.method, req.originalUrl));
};

interface MongooseValidationError extends Error {
  errors: Record<string, { path: string; message: string }>;
}
interface MongooseCastError extends Error {
  path: string;
}
interface MongoDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, unknown>;
}
interface BodyParserError extends Error {
  type?: string;
}

/** Translates known library errors into `AppError`s; returns null for anything unrecognised. */
const translate = (error: unknown): AppError | null => {
  if (error instanceof AppError) return error;
  if (!(error instanceof Error)) return null;

  switch (error.name) {
    case 'ValidationError': {
      const details: ErrorDetail[] = Object.values((error as MongooseValidationError).errors ?? {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return AppError.validation(MESSAGES.common.validationFailed, details);
    }
    case 'CastError':
      return AppError.validation(MESSAGES.common.invalidValue((error as MongooseCastError).path));
    case 'VersionError':
      return AppError.conflict(MESSAGES.common.versionConflict);
  }

  if ((error as MongoDuplicateKeyError).code === 11000) {
    const field = Object.keys((error as MongoDuplicateKeyError).keyPattern ?? {})[0] ?? 'value';
    return AppError.conflict(MESSAGES.common.duplicate(field));
  }

  switch ((error as BodyParserError).type) {
    case 'entity.parse.failed':
      return AppError.badRequest(MESSAGES.common.badJson);
    case 'entity.too.large':
      return new AppError(413, 'PAYLOAD_TOO_LARGE', MESSAGES.common.payloadTooLarge);
  }

  return null;
};

/**
 * The only place errors become HTTP responses. Expected failures (AppError and recognised
 * library errors) keep their message; anything else is a bug: it is logged with the request id
 * and answered with a generic 500 so internals never leak.
 */
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const known = translate(error);
  if (known) {
    sendError(res, known.statusCode, known.code, known.message, known.details);
    return;
  }

  if (!env.isTest) {
    console.error(`[error] ${req.id} ${req.method} ${req.originalUrl}`, error);
  }
  sendError(res, 500, 'INTERNAL_ERROR', MESSAGES.common.internal);
};
