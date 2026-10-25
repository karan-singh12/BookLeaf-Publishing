import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';
import { ROLES } from '../constants/domain';
import { applyJsonOptions, baseSchemaOptions } from './schema-options';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'author' },
    /** Business identifier from the BookLeaf dataset (e.g. AUTH001). Admins have none. */
    authorCode: { type: String, unique: true, sparse: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    joinedDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// `email` and `authorCode` are indexed (unique) at the field level.
// Active staff lookups, e.g. choosing an assignee.
userSchema.index({ role: 1, isActive: 1 });
applyJsonOptions(userSchema);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);
