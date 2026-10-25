"use client";

import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Skeleton, Textarea, useToast } from "@/components/ui";
import { useRegenerateDraft, useSendMessage, useTicketDraft } from "@/hooks/use-tickets";
import { ApiError } from "@/lib/api-client";
import type { AdminTicket } from "@/types/domain";

/**
 * The reply workflow: open a ticket, get an AI draft grounded in the knowledge base and the author's
 * real book data, edit it, send it. When the AI is unavailable the admin gets a standard template
 * (or a blank box) instead; nothing about replying depends on the model being up.
 */
export function DraftComposer({ ticket }: { ticket: AdminTicket }) {
  const toast = useToast();
  const draftQuery = useTicketDraft(ticket.id);
  const regenerate = useRegenerateDraft(ticket.id);
  const send = useSendMessage(ticket.id);

  // `null` = the admin hasn't typed, so show the draft as-is. Any edit takes over from there.
  const [edited, setEdited] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = draftQuery.data;
  const text = edited ?? draft?.text ?? "";
  const closed = ticket.status === "Closed";
  const startedFromAi = draft?.source === "llm";

  const onRegenerate = () => {
    if (edited && !window.confirm("Replace your edits with a fresh AI draft?")) return;
    regenerate.mutate(undefined, {
      onSuccess: () => setEdited(null),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not regenerate the draft."),
    });
  };

  const onSend = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    send.mutate(
      { body: text.trim(), fromAiDraft: startedFromAi },
      {
        onSuccess: () => {
          toast.success(`Reply sent to ${ticket.author.name}.`);
          setEdited("");
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "Could not send the reply."),
      },
    );
  };

  return (
    <Card>
      <CardHeader
        title="Reply to author"
        action={
          draft && (
            <div className="flex items-center gap-2">
              {draft.source === "llm" ? <Badge tone="violet">AI draft{draft.model ? ` · ${draft.model}` : ""}</Badge> : <Badge tone="amber">Standard template</Badge>}
              <Button size="sm" variant="secondary" loading={regenerate.isPending} disabled={closed} onClick={onRegenerate}>
                Regenerate
              </Button>
            </div>
          )
        }
      />
      <CardBody>
        {closed ? (
          <Alert kind="info">This ticket is closed. Change its status to reopen it before replying.</Alert>
        ) : draftQuery.isPending ? (
          <div className="space-y-2" aria-busy>
            <p className="text-sm text-ink-soft">Preparing a draft from the knowledge base and {ticket.author.name.split(" ")[0]}&apos;s book data…</p>
            <Skeleton className="h-40" />
          </div>
        ) : (
          <form onSubmit={onSend} className="space-y-3">
            {draftQuery.isError && (
              <Alert kind="warning" title="Couldn't prepare a draft">
                You can still write a reply yourself.{" "}
                <button type="button" className="font-medium underline" onClick={() => draftQuery.refetch()}>
                  Try again
                </button>
              </Alert>
            )}
            {draft?.notice && <Alert kind="warning">{draft.notice}</Alert>}
            {error && <Alert kind="error">{error}</Alert>}

            <Textarea
              label="Message (edit before sending)"
              value={text}
              onChange={(event) => setEdited(event.target.value)}
              className="min-h-56"
              maxLength={5000}
              hint="The author sees this exactly as written, on their ticket."
            />
            <div className="flex justify-end">
              <Button type="submit" loading={send.isPending} disabled={text.trim().length === 0}>
                Send reply
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
