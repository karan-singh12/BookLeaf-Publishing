"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import type { Attachment } from "@/types/domain";

/**
 * File chooser (UI only, per the brief): the file name and size are sent with the ticket,
 * but the bytes are not uploaded. Limits mirror the server's validation.
 */
export function AttachmentPicker({ value, onChange }: { value: Attachment[]; onChange: (files: Attachment[]) => void }) {
  const inputId = useId();
  const [problem, setProblem] = useState<string | null>(null);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow picking the same file again later
    setProblem(null);

    const next = [...value];
    for (const file of picked) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setProblem(`"${file.name}" is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
        continue;
      }
      if (next.length >= MAX_ATTACHMENTS) {
        setProblem(`You can attach up to ${MAX_ATTACHMENTS} files.`);
        break;
      }
      if (!next.some((existing) => existing.fileName === file.name)) next.push({ fileName: file.name, sizeBytes: file.size });
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink">Attachments (optional)</span>
      <div className="flex items-center gap-3">
        <input id={inputId} type="file" multiple className="sr-only" onChange={onPick} />
        <label htmlFor={inputId} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:bg-slate-50 focus-within:outline-2">
          Choose files
        </label>
        <p className="text-xs text-ink-soft">Screenshots or photos help us resolve things faster. Up to {MAX_ATTACHMENTS} files, {formatBytes(MAX_ATTACHMENT_BYTES)} each.</p>
      </div>

      {problem && (
        <p role="alert" className="text-xs text-red-600">
          {problem}
        </p>
      )}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((file) => (
            <li key={file.fileName} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-sm">
              <span className="break-anywhere min-w-0">
                {file.fileName} <span className="text-ink-soft">· {formatBytes(file.sizeBytes)}</span>
              </span>
              <Button variant="ghost" size="sm" aria-label={`Remove ${file.fileName}`} onClick={() => onChange(value.filter((f) => f.fileName !== file.fileName))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {value.length > 0 && <p className="text-xs text-ink-soft">Note: attachments are noted on your ticket; file upload isn&apos;t enabled yet, so please reply with the files if our team asks.</p>}
    </div>
  );
}
