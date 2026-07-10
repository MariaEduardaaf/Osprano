"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export function WhatsAppFollowup({ leadId, phone }: { leadId: Id<"leads">; phone?: string }) {
  const send = useAction(api.whatsapp.sendFollowup);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-border py-1.5 text-[11px] font-semibold text-muted hover:bg-surface-2"
      >
        WhatsApp follow-up
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="Mensagem…"
        className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1 text-[11px]"
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              await send({ leadId, message });
              setMsg("Enviado.");
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falha");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || !message.trim()}
          className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg disabled:opacity-50"
        >
          {busy ? "…" : "Enviar"}
        </button>
        {phone && (
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-2"
          >
            Abrir wa.me
          </a>
        )}
      </div>
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </div>
  );
}
