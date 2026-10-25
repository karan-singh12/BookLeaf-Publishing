export const ROLES = ['author', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Ordered most to least urgent; the index doubles as the sort rank. */
export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const MESSAGE_VISIBILITIES = ['public', 'internal'] as const;

export const PUBLISHED_STATUS = 'Published & Live';

export const priorityRank = (priority: TicketPriority): number => TICKET_PRIORITIES.indexOf(priority);

/** Resolved and Closed tickets drop out of the "needs attention" part of the queue. */
export const isActiveStatus = (status: TicketStatus): boolean => status === 'Open' || status === 'In Progress';
