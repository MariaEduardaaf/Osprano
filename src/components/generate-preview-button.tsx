"use client";

import { useState } from "react";
import { MdOutlineAutoAwesome, MdOpenInNew } from "react-icons/md";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/** Generates a tracked preview for a lead, then reveals the open link. */
export function GeneratePreviewButton({
  leadId,
  variant = "compact",
}: {
  leadId: Id<"leads">;
  variant?: "compact" | "primary";
}) {
  const generate = useMutation(api.previews.generate);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const primary = variant === "primary";

  if (token) {
    return (
      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noreferrer"
        className={
          primary
            ? "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/15"
            : "inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        }
      >
        Abrir preview <MdOpenInNew size={primary ? 15 : 13} />
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
      className={
        primary
          ? "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-50"
          : "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
      }
    >
      <MdOutlineAutoAwesome size={primary ? 16 : 14} />
      {busy ? "Gerando…" : "Gerar preview"}
    </button>
  );
}
