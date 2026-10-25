import { Badge, type Tone } from "@/components/ui";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/domain";

const STATUS_TONE: Record<TicketStatus, Tone> = {
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Closed: "neutral",
};

const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  Critical: "red",
  High: "orange",
  Medium: "amber",
  Low: "neutral",
};

const CATEGORY_TONE: Record<TicketCategory, Tone> = {
  "Royalty & Payments": "green",
  "ISBN & Metadata Issues": "violet",
  "Printing & Quality": "orange",
  "Distribution & Availability": "blue",
  "Book Status & Production Updates": "amber",
  "General Inquiry": "neutral",
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => <Badge tone={STATUS_TONE[status]}>{status}</Badge>;

export const PriorityBadge = ({ priority }: { priority: TicketPriority }) => (
  <Badge tone={PRIORITY_TONE[priority]}>
    <span aria-hidden className="size-1.5 rounded-full bg-current" />
    {priority}
  </Badge>
);

export const CategoryBadge = ({ category }: { category: TicketCategory }) => <Badge tone={CATEGORY_TONE[category]}>{category}</Badge>;
