import { formatBytes } from "@/lib/format";
import type { Attachment } from "@/types/domain";

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments">
      {attachments.map((file) => (
        <li key={file.fileName} className="rounded-md border border-line bg-slate-50 px-2.5 py-1 text-xs text-ink-soft">
          {file.fileName} · {formatBytes(file.sizeBytes)}
        </li>
      ))}
    </ul>
  );
}
