import { SortOrder, Types } from 'mongoose';
import { TICKET_PRIORITIES } from '../constants/domain';
import { Ticket, TicketDocument, TicketMessage } from '../models';

export type TicketFilter = Record<string, unknown>;

export type TicketSort = 'urgency' | 'newest' | 'oldest' | 'activity';

/** Queue ordering. "urgency" puts active tickets first, then most urgent, then oldest. */
const SORTS: Record<TicketSort, Record<string, SortOrder>> = {
  urgency: { isActive: -1, priorityRank: 1, createdAt: 1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  activity: { lastActivityAt: -1, _id: -1 },
};

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assigneeId?: string | 'unassigned';
  q?: string;
  from?: Date;
  to?: Date;
}

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds the Mongo filter for a ticket list. `authorId` is how authors are confined to their own
 * tickets: it is always applied for authors and is the only place that rule lives.
 */
export const buildTicketFilter = (filters: TicketFilters, authorId?: string): TicketFilter => {
  const filter: Record<string, unknown> = {};

  if (authorId) filter.author = authorId;
  if (filters.status) filter.status = filters.status;
  if (filters.category) filter.category = filters.category;
  if (filters.priority) filter.priority = filters.priority;
  if (filters.assigneeId === 'unassigned') filter.assignee = null;
  else if (filters.assigneeId) filter.assignee = filters.assigneeId;

  if (filters.from || filters.to) {
    filter.createdAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      // `to` is a calendar date; include the whole day.
      ...(filters.to ? { $lte: new Date(filters.to.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), 'i');
    const asNumber = Number(filters.q.replace(/^#?(bl-)?/i, ''));
    filter.$or = [
      { subject: pattern },
      { description: pattern },
      ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
    ];
  }

  return filter;
};

const populateAll = [
  { path: 'author', select: 'name email authorCode' },
  { path: 'book', select: 'title status isbn' },
  { path: 'assignee', select: 'name email' },
];

export const ticketRepository = {
  async list(filter: TicketFilter, sort: TicketSort, page: number, limit: number) {
    const [items, total] = await Promise.all([
      Ticket.find(filter)
        .sort(SORTS[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(populateAll)
        .lean(),
      Ticket.countDocuments(filter),
    ]);
    return { items, total };
  },

  findByIdPopulated: (id: string, authorId?: string) =>
    Ticket.findOne({ _id: id, ...(authorId ? { author: authorId } : {}) })
      .populate(populateAll)
      .lean(),

  findOneScoped: (id: string, authorId?: string): Promise<TicketDocument | null> =>
    Ticket.findOne({ _id: id, ...(authorId ? { author: authorId } : {}) }),

  /** Public messages for everyone; internal notes only when `includeInternal` is set (admins). */
  listMessages: (ticketId: Types.ObjectId | string, includeInternal: boolean) =>
    TicketMessage.find({ ticket: ticketId, ...(includeInternal ? {} : { visibility: 'public' }) })
      .sort({ createdAt: 1 })
      .lean(),

  latestAuthorMessage: (ticketId: Types.ObjectId | string) =>
    TicketMessage.findOne({ ticket: ticketId, senderRole: 'author', visibility: 'public' })
      .sort({ createdAt: -1 })
      .lean(),

  /** For the list views: how many admin replies each ticket has and the latest one's text. */
  async replySummaries(ticketIds: Types.ObjectId[]) {
    const rows = await TicketMessage.aggregate<{
      _id: Types.ObjectId;
      count: number;
      latestBody: string;
      latestAt: Date;
    }>([
      { $match: { ticket: { $in: ticketIds }, senderRole: 'admin', visibility: 'public' } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$ticket', count: { $sum: 1 }, latestBody: { $first: '$body' }, latestAt: { $first: '$createdAt' } } },
    ]);
    return new Map(rows.map((row) => [row._id.toString(), row]));
  },

  /** Queue header numbers, computed in a single round trip. */
  async stats() {
    const [result] = await Ticket.aggregate<{
      totals: Array<{ total: number; active: number; unassignedActive: number; oldestActiveAt: Date | null }>;
      byStatus: Array<{ _id: string; count: number }>;
      byPriority: Array<{ _id: string; count: number }>;
      byCategory: Array<{ _id: string; count: number }>;
    }>([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                unassignedActive: { $sum: { $cond: [{ $and: ['$isActive', { $eq: ['$assignee', null] }] }, 1, 0] } },
                oldestActiveAt: { $min: { $cond: ['$isActive', '$createdAt', null] } },
              },
            },
          ],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $match: { isActive: true } }, { $group: { _id: '$priority', count: { $sum: 1 } } }],
          byCategory: [{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }],
        },
      },
    ]);

    const totals = result.totals[0] ?? { total: 0, active: 0, unassignedActive: 0, oldestActiveAt: null };
    const toMap = (rows: Array<{ _id: string; count: number }>) =>
      Object.fromEntries(rows.map((row) => [row._id, row.count]));

    return {
      total: totals.total,
      active: totals.active,
      unassignedActive: totals.unassignedActive,
      oldestActiveAt: totals.oldestActiveAt,
      byStatus: toMap(result.byStatus),
      // Always return every priority so the UI can render zeroes without special-casing.
      activeByPriority: Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, toMap(result.byPriority)[p] ?? 0])),
      activeByCategory: toMap(result.byCategory),
    };
  },
};
