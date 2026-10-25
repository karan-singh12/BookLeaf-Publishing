import Joi from 'joi';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../constants/domain';
import { dateRangeKeys, objectId, paginationKeys, requiredText } from './common.validator';

export const ticketParams = Joi.object({
  ticketId: objectId.required().label('ticketId'),
});

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export const createTicketBody = Joi.object({
  bookId: objectId.allow(null, '').label('Book'),
  subject: requiredText('Subject', 3, 200),
  description: requiredText('Description', 10, 5000),
  // Attachments are UI-only for now: we persist file metadata, not the bytes.
  attachments: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().trim().max(255).required().label('File name'),
        sizeBytes: Joi.number().integer().min(0).max(MAX_ATTACHMENT_BYTES).required().label('File size'),
      }),
    )
    .max(MAX_ATTACHMENTS)
    .default([])
    .label('Attachments'),
});

export const listTicketsQuery = Joi.object({
  status: Joi.string().valid(...TICKET_STATUSES),
  category: Joi.string().valid(...TICKET_CATEGORIES),
  priority: Joi.string().valid(...TICKET_PRIORITIES),
  assignee: Joi.string().valid('me', 'unassigned'),
  q: Joi.string().trim().max(100).label('Search'),
  ...dateRangeKeys,
  sort: Joi.string().valid('urgency', 'newest', 'oldest', 'activity'),
  ...paginationKeys,
});

export const updateTicketBody = Joi.object({
  status: Joi.string().valid(...TICKET_STATUSES),
  category: Joi.string().valid(...TICKET_CATEGORIES),
  priority: Joi.string().valid(...TICKET_PRIORITIES),
  /** `"me"` assigns to the calling admin; `null` unassigns. */
  assignee: Joi.valid('me', null),
}).min(1);

export const messageBody = Joi.object({
  body: requiredText('Message', 1, 5000),
  fromAiDraft: Joi.boolean().default(false),
});

export const noteBody = Joi.object({
  body: requiredText('Note', 1, 5000),
});

export const draftBody = Joi.object({
  refresh: Joi.boolean().default(false),
});
