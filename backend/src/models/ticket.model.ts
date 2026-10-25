import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketPriority,
  TicketStatus,
  isActiveStatus,
  priorityRank,
} from '../constants/domain';
import { applyJsonOptions, baseSchemaOptions } from './schema-options';

const AI_SOURCES = ['llm', 'heuristic'] as const;
const AI_STATUSES = ['pending', 'completed', 'failed'] as const;

const attachmentSchema = new Schema(
  { fileName: { type: String, required: true }, sizeBytes: { type: Number, required: true, min: 0 } },
  { _id: false },
);

/** Token counts reported by the provider; the basis for per-ticket cost reporting. */
const usageSchema = new Schema(
  { promptTokens: { type: Number, required: true, min: 0 }, outputTokens: { type: Number, required: true, min: 0 } },
  { _id: false },
);

/** The classifier's own suggestion. `Ticket.category/priority` hold the effective (possibly overridden) values. */
const aiClassificationSchema = new Schema(
  {
    status: { type: String, enum: AI_STATUSES, default: 'pending' },
    source: { type: String, enum: AI_SOURCES, default: 'heuristic' },
    category: { type: String, enum: TICKET_CATEGORIES },
    priority: { type: String, enum: TICKET_PRIORITIES },
    reasoning: { type: String },
    model: { type: String },
    usage: { type: usageSchema, default: null },
    classifiedAt: { type: Date },
  },
  { _id: false },
);

const draftSchema = new Schema(
  {
    text: { type: String, required: true },
    model: { type: String, required: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    usage: { type: usageSchema, default: null },
    /** Which version of the draft prompt wrote this. A newer prompt makes the stored draft stale. */
    promptVersion: { type: Number },
    generatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', default: null },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },

    status: { type: String, enum: TICKET_STATUSES, default: 'Open' },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'General Inquiry' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'Medium' },
    categoryOverridden: { type: Boolean, default: false },
    priorityOverridden: { type: Boolean, default: false },
    ai: { type: aiClassificationSchema, default: () => ({}) },
    draft: { type: draftSchema, default: null },

    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastActivityAt: { type: Date, default: Date.now },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },

    // Denormalised sort keys so the queue can be ordered and paginated in the database.
    priorityRank: { type: Number, required: true, default: 2 },
    isActive: { type: Boolean, required: true, default: true },
  },
  // Two admins editing one ticket: the stale save fails with a VersionError (mapped to 409)
  // instead of silently overwriting. Atomic `updateOne` calls (AI results) do not conflict.
  { ...baseSchemaOptions, optimisticConcurrency: true },
);

// `number` is indexed (unique) at the field level.
// Default triage queue: active first, most urgent first, oldest first.
ticketSchema.index({ isActive: -1, priorityRank: 1, createdAt: 1 });
// Faceted admin filtering by status and category, newest first.
ticketSchema.index({ status: 1, category: 1, createdAt: -1 });
// Author "My Tickets", ordered by latest conversation activity. Also serves author-scoped filters.
ticketSchema.index({ author: 1, lastActivityAt: -1 });
// "Assigned to me" / "Unassigned" queue views.
ticketSchema.index({ assignee: 1, status: 1 });
// Date-range filters and newest-first listing (Mongo reads this index in either direction).
ticketSchema.index({ createdAt: -1 });
applyJsonOptions(ticketSchema);
// Search is a case-insensitive regex over subject/description (see ticket.repository). At this scale
// a collection scan is fine; a text or Atlas Search index is the documented upgrade path.

/** Keys derived from status/priority. Also used by atomic updates that bypass document hooks. */
export const deriveSortKeys = (priority: TicketPriority, status: TicketStatus) => ({
  priorityRank: priorityRank(priority),
  isActive: isActiveStatus(status),
});

ticketSchema.pre('validate', function () {
  Object.assign(this, deriveSortKeys(this.priority as TicketPriority, this.status as TicketStatus));
});

export type TicketAttrs = InferSchemaType<typeof ticketSchema>;
export type TicketDocument = HydratedDocument<TicketAttrs>;
export const Ticket = model('Ticket', ticketSchema);
