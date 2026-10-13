"use client";

import { useState } from "react";
import { MdOutlineChat, MdOpenInNew } from "react-icons/md";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

const OPT_IN_SOURCES = [
  { value: "replied_email", label: "Respondeu o email" },
  { value: "phone_call", label: "Falou por telefone" },
  { value: "in_person", label: "Pessoalmente" },
] as const;

export function WhatsAppFollowup({
  leadId,
  phone,
  optInAt,
}: {
  leadId: Id<"leads">;
  phone?: string;
  optInAt?: number;
}) {
  const recordOptIn = useMutation(api.leads.recordWaOptIn);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<string>(OPT_IN_SOURCES[0].value);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-[11px] font-semibold text-muted hover:bg-surface-2"
      >
        <MdOutlineChat size={14} />
        WhatsApp follow-up
      </button>
    );
  }

  if (!optInAt) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted">
          WhatsApp exige opt-in registrado do prospect.
        </p>
        <div className="flex items-center gap-1.5">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px]"
            aria-label="Origem do opt-in"
          >
            {OPT_IN_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await recordOptIn({ leadId, source });
              } catch (e) {
                setMsg(errorMessage(e, "Falha"));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg disabled:opacity-50"
          >
            {busy ? "…" : "Registrar opt-in"}
          </button>
        </div>
        {msg && <p className="text-[10px] text-muted">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="Mensagem…"
        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1 text-[11px]"
      />
      {phone ? (
        <a
          href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg"
        >
          <MdOpenInNew size={13} />
          Abrir no WhatsApp
        </a>
      ) : (
        <p className="text-[11px] text-muted">Lead sem telefone.</p>
      )}
      <p className="text-[10px] text-muted">
        A mensagem sai do seu WhatsApp; o Osprano não envia por você.
      </p>
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </div>
  );
}
