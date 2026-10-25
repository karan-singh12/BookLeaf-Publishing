import { Avatar, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { displayName, formatDateTime } from "@/lib/format";
import type { Message, Role } from "@/types/domain";

interface MessageThreadProps {
  messages: Message[];
  viewerRole: Role;
  /** The ticket's original text. Seeded tickets repeat it as their first message; hide that copy. */
  originalText?: string;
  emptyText?: string;
}

function Bubble({ message, viewerRole }: { message: Message; viewerRole: Role }) {
  const mine = message.senderRole === viewerRole;
  const internal = message.visibility === "internal";
  return (
    <li className={cn("flex items-end gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
      <Avatar name={message.senderName} size="sm" staff={message.senderRole === "admin"} className="mb-1" />
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
          mine ? "rounded-br-md" : "rounded-bl-md",
          internal ? "border-amber-200 bg-amber-50" : mine ? "border-brand-100 bg-brand-50" : "border-line bg-surface",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{displayName(message.senderName)}</span>
          {message.senderRole === "admin" && !internal && <Badge tone="green">BookLeaf Support</Badge>}
          {internal && <Badge tone="amber">Internal note</Badge>}
          {/* AI provenance is staff-only information. */}
          {viewerRole === "admin" && message.fromAiDraft && <Badge tone="violet">{message.draftEdited ? "AI draft, edited" : "AI draft"}</Badge>}
          <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
        </div>
        <p className="break-anywhere whitespace-pre-wrap text-ink">{message.body}</p>
      </div>
    </li>
  );
}

export function MessageThread({ messages, viewerRole, originalText, emptyText = "No replies yet." }: MessageThreadProps) {
  const visible = messages.filter((message, index) => !(index === 0 && message.senderRole === "author" && message.body === originalText));
  if (visible.length === 0) return <p className="py-6 text-center text-sm text-ink-soft">{emptyText}</p>;
  return (
    <ol className="space-y-3" aria-label="Conversation">
      {visible.map((message) => (
        <Bubble key={message.id} message={message} viewerRole={viewerRole} />
      ))}
    </ol>
  );
}
