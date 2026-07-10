"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/** Generates a tracked preview for a lead, then reveals the open link. */
export function GeneratePreviewButton({ leadId }: { leadId: Id<"leads"> }) {
  const generate = useMutation(api.previews.generate);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) {
    return (
      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-brand hover:underline"
      >
        Abrir preview ↗
      </a>
    );
  }

  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          setToken(await generate({ leadId }));
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? "Gerando…" : "Gerar preview"}
    </button>
  );
}
