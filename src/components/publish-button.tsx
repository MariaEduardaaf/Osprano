"use client";

import { useState } from "react";
import { MdOutlinePublish, MdOpenInNew } from "react-icons/md";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function PublishButton({ leadId, slug }: { leadId: Id<"leads">; slug: string | null }) {
  const publish = useMutation(api.previews.publish);
  const [current, setCurrent] = useState<string | null>(slug);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (current) {
    return (
      <a
        href={`/site/${current}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
      >
        Site publicado <MdOpenInNew size={13} />
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            setCurrent(await publish({ leadId }));
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Falha");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
      >
        <MdOutlinePublish size={14} />
        {busy ? "Publicando…" : "Publicar"}
      </button>
      {err && <span className="max-w-48 text-right text-[10px] text-hot">{err}</span>}
    </div>
  );
}
