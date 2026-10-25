"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui";
import { ApiError } from "@/lib/api-client";

interface ReplyBoxProps {
  label: string;
  placeholder?: string;
  submitLabel: string;
  /** Sends the text; resolves when saved. The box clears itself on success. */
  onSend: (text: string) => Promise<unknown>;
  successMessage: string;
}

/** A plain message composer, used for author follow-ups and admin internal notes. */
export function ReplyBox({ label, placeholder, submitLabel, onSend, successMessage }: ReplyBoxProps) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSend(text.trim());
      setText("");
      toast.success(successMessage);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Alert kind="error">{error}</Alert>}
      <Textarea label={label} value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} maxLength={5000} />
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={text.trim().length === 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
