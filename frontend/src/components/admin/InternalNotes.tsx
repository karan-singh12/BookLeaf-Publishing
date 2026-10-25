"use client";

import { MessageThread } from "@/components/tickets/MessageThread";
import { ReplyBox } from "@/components/tickets/ReplyBox";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { useAddNote } from "@/hooks/use-tickets";
import type { Message } from "@/types/domain";

/** Staff-only notes. The API never returns these to authors. */
export function InternalNotes({ ticketId, notes }: { ticketId: string; notes: Message[] }) {
  const addNote = useAddNote(ticketId);
  return (
    <Card>
      <CardHeader title="Internal notes" action={<Badge tone="amber">Not visible to the author</Badge>} />
      <CardBody className="space-y-4">
        {notes.length > 0 && <MessageThread messages={notes} viewerRole="admin" />}
        <ReplyBox label="Add a note" placeholder="Context for your team: what you checked, who to ask…" submitLabel="Save note" successMessage="Note saved." onSend={(body) => addNote.mutateAsync(body)} />
      </CardBody>
    </Card>
  );
}
