import Joi from 'joi';

/** Reusable building blocks, so rules (and their wording) are defined once. */

export const objectId = Joi.string().hex().length(24);

/** A required, trimmed text field with a label used in error messages. */
export const requiredText = (label: string, min: number, max: number) =>
  Joi.string().trim().min(min).max(max).required().label(label);

/** `?page=&limit=` with safe defaults and a hard upper bound. */
export const paginationKeys = {
  page: Joi.number().integer().min(1).default(1).label('page'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('limit'),
};

/** `?from=&to=` calendar dates; `to` may not precede `from`. */
export const dateRangeKeys = {
  from: Joi.date().iso().label('from'),
  to: Joi.date().iso().min(Joi.ref('from')).label('to'),
};
