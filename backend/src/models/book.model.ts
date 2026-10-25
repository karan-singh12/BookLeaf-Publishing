import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';
import { applyJsonOptions, baseSchemaOptions } from './schema-options';

const bookSchema = new Schema(
  {
    /** Business identifier from the BookLeaf dataset (e.g. BK001). */
    bookCode: { type: String, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    genre: { type: String, required: true, trim: true },
    /** Null while the book is still in production. */
    publicationDate: { type: Date, default: null },
    status: { type: String, required: true, trim: true },
    mrp: { type: Number, default: null, min: 0 },
    royaltyPerCopy: { type: Number, default: null, min: 0 },
    copiesSold: { type: Number, required: true, min: 0, default: 0 },
    royaltyEarned: { type: Number, required: true, min: 0, default: 0 },
    royaltyPaid: { type: Number, required: true, min: 0, default: 0 },
    royaltyPending: { type: Number, required: true, min: 0, default: 0 },
    lastPayoutDate: { type: Date, default: null },
    printPartner: { type: String, default: null },
    platforms: { type: [String], default: [] },
  },
  baseSchemaOptions,
);

// `bookCode` and `isbn` are indexed (unique) at the field level.
// Every author-scoped query ("My Books", the ticket form's book picker) starts with `author`.
bookSchema.index({ author: 1, status: 1 });
applyJsonOptions(bookSchema);

export type BookAttrs = InferSchemaType<typeof bookSchema>;
export type BookDocument = HydratedDocument<BookAttrs>;
export const Book = model('Book', bookSchema);
