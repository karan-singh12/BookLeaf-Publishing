import { MESSAGES } from '../constants/messages';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * An error whose message is safe to show to API clients. Anything that is not an `AppError`
 * is treated as a bug and answered with a generic 500 (see error.middleware).
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string): AppError {
    return new AppError(400, 'BAD_REQUEST', message);
  }

  static validation(message: string = MESSAGES.common.validationFailed, details?: ErrorDetail[]): AppError {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message: string = MESSAGES.auth.tokenMissing): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message: string = MESSAGES.common.forbidden): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource?: string): AppError {
    return new AppError(404, 'NOT_FOUND', MESSAGES.common.notFound(resource));
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static unavailable(message: string): AppError {
    return new AppError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
