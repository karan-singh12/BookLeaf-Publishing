import { Schema } from 'mongoose';

/** Options shared by every schema. */
export const baseSchemaOptions = { timestamps: true } as const;

/**
 * Makes `toJSON`/`toObject` output DTO-clean (virtual `id` included, no `__v`).
 * Applied after the schema is built, because passing these as constructor options
 * changes the document type Mongoose infers.
 */
export const applyJsonOptions = <T extends Schema>(schema: T): T => {
  schema.set('toJSON', { virtuals: true, versionKey: false });
  schema.set('toObject', { virtuals: true, versionKey: false });
  return schema;
};
