import { NextFunction, Request, RequestHandler, Response } from 'express';
import Joi from 'joi';
import { MESSAGES } from '../constants/messages';
import { AppError, ErrorDetail } from '../utils/errors';
import { JOI_OPTIONS } from '../validators/joi.config';

type RequestSource = 'body' | 'query' | 'params';
type SchemaMap = Partial<Record<RequestSource, Joi.ObjectSchema>>;

/** One entry per field+message: several rules can fail with identical wording (e.g. an id that is not hex and the wrong length). */
const toDetails = (error: Joi.ValidationError): ErrorDetail[] => {
  const unique = new Map<string, ErrorDetail>();
  for (const detail of error.details) {
    const field = detail.path.join('.');
    unique.set(`${field}|${detail.message}`, { field, message: detail.message });
  }
  return [...unique.values()];
};

/**
 * Validates and normalises request input against Joi schemas. Controllers only ever see
 * clean, typed values: unknown keys stripped, defaults applied, strings trimmed, numbers coerced.
 * On failure it raises one 422 listing every problem (first message becomes the headline).
 */
export const validate =
  (schemas: SchemaMap): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const details: ErrorDetail[] = [];

    for (const source of Object.keys(schemas) as RequestSource[]) {
      const schema = schemas[source];
      if (!schema) continue;

      // A missing body (e.g. POST with no payload) is validated as an empty object.
      const { error, value } = schema.validate(req[source] ?? {}, JOI_OPTIONS);
      if (error) {
        details.push(...toDetails(error));
        continue;
      }

      if (source === 'query') {
        // Express 5 exposes `req.query` as a read-only getter, so it has to be redefined.
        Object.defineProperty(req, 'query', { value, configurable: true, enumerable: true });
      } else {
        req[source] = value;
      }
    }

    if (details.length > 0) {
      throw AppError.validation(details[0]?.message ?? MESSAGES.common.validationFailed, details);
    }
    next();
  };
