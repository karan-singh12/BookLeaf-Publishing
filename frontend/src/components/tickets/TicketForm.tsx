"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Select, Textarea, useToast } from "@/components/ui";
import { useCreateTicket } from "@/hooks/use-tickets";
import { ApiError } from "@/lib/api-client";
import type { Attachment, Book } from "@/types/domain";
import { AttachmentPicker } from "./AttachmentPicker";

const GENERAL = "";
const MIN_SUBJECT = 3;
const MIN_DESCRIPTION = 10;

interface FieldErrors {
  subject?: string;
  description?: string;
}

/** The "Submit a Support Query" form. Client checks give instant feedback; the server remains the authority. */
export function TicketForm({ books }: { books: Book[] }) {
  const router = useRouter();
  const toast = useToast();
  const createTicket = useCreateTicket();

  const [bookId, setBookId] = useState(GENERAL);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const serverError = createTicket.error instanceof ApiError ? createTicket.error : null;
  const errors: FieldErrors = {
    subject: clientErrors.subject ?? serverError?.fieldMessage("subject"),
    description: clientErrors.description ?? serverError?.fieldMessage("description"),
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found: FieldErrors = {};
    if (subject.trim().length < MIN_SUBJECT) found.subject = `Subject must be at least ${MIN_SUBJECT} characters.`;
    if (description.trim().length < MIN_DESCRIPTION) found.description = `Please describe the issue in at least ${MIN_DESCRIPTION} characters.`;
    setClientErrors(found);
    if (found.subject || found.description) return;

    createTicket.mutate(
      { bookId: bookId || null, subject: subject.trim(), description: description.trim(), attachments },
      {
        onSuccess: (ticket) => {
          toast.success(`Ticket #${ticket.number} submitted. We'll reply here.`);
          router.push(`/author/tickets/${ticket.id}`);
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError && !serverError.details.length && <Alert kind="error">{serverError.message}</Alert>}

      <Select label="Which book is this about?" value={bookId} onChange={(event) => setBookId(event.target.value)}>
        <option value={GENERAL}>General / Account Level</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.title}
          </option>
        ))}
      </Select>

      <Input
        label="Subject"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        error={errors.subject}
        maxLength={200}
        placeholder="e.g. I haven't received my royalty for this quarter"
        required
      />

      <Textarea
        label="Describe your query"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors.description}
        hint="The more detail you give (dates, amounts, platform), the faster we can help."
        maxLength={5000}
        className="min-h-40"
        required
      />

      <AttachmentPicker value={attachments} onChange={setAttachments} />

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={createTicket.isPending}>
          Submit query
        </Button>
      </div>
    </form>
  );
}
