import Joi from 'joi';
import { objectId } from './common.validator';

export const bookParams = Joi.object({
  bookId: objectId.required().label('bookId'),
});

/** `authorId` is honoured for admins only; the service ignores it for authors. */
export const listBooksQuery = Joi.object({
  authorId: objectId.label('authorId'),
});
