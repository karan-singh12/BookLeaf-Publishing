import { InferSchemaType, Schema, model } from 'mongoose';
import { MESSAGE_VISIBILITIES, ROLES } from '../constants/domain';
import { applyJsonOptions, baseSchemaOptions } from './schema-options';

/**
 * One collection holds both the author-visible conversation (`public`) and admin-only
 * notes (`internal`). Visibility is enforced in a single place: the ticket repository.
 */
const ticketMessageSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ROLES, required: true },
    visibility: { type: String, enum: MESSAGE_VISIBILITIES, default: 'public' },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    /** True when an admin started from the AI draft, so draft adoption can be measured. */
    fromAiDraft: { type: Boolean, default: false },
    /** True when the admin changed the draft before sending (the human-in-the-loop signal). */
    draftEdited: { type: Boolean, default: false },
  },
  // Messages are immutable, so there is no `updatedAt`.
  { ...baseSchemaOptions, timestamps: { createdAt: true, updatedAt: false } },
);

// Serves both thread views: the author's (public only) and the admin's (everything), oldest first.
ticketMessageSchema.index({ ticket: 1, visibility: 1, createdAt: 1 });
applyJsonOptions(ticketMessageSchema);

export type TicketMessageAttrs = InferSchemaType<typeof ticketMessageSchema>;
export const TicketMessage = model('TicketMessage', ticketMessageSchema);
