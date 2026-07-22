"use client";

import { useState } from "react";
import { MdOutlineHowToReg, MdOutlineCheckCircle } from "react-icons/md";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/** OPTIN-04: vocabulário de origem do consentimento (espelha o union aceito pela mutation). */
const CONTACT_SOURCES = [
  { value: "phone_call", label: "Falou por telefone" },
  { value: "in_person", label: "Pessoalmente" },
  { value: "reply", label: "Respondeu" },
  { value: "other", label: "Outro" },
] as const;

type ContactSource = (typeof CONTACT_SOURCES)[number]["value"];

/**
 * OPTIN-04 — registro de consentimento de contato do prospect.
 * Sem consentimento: botão colapsado → select de origem + confirmar (api.leads.recordContactOptIn).
 * Com consentimento: selo estático. O destravamento do email é do LeadCard (reage a lead.contactOptInAt).
 */
export function ContactOptInButton({
  leadId,
  optInAt,
}: {
  leadId: Id<"leads">;
  optInAt?: number;
}) {
  const recordOptIn = useMutation(api.leads.recordContactOptIn);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<ContactSource>(CONTACT_SOURCES[0].value);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (optInAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand">
        <MdOutlineCheckCircle size={14} />
        Consentimento registrado
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-[11px] font-semibold text-muted hover:bg-surface-2"
      >
        <MdOutlineHowToReg size={14} />
        Registrar consentimento
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted">
        Email só depois do consentimento explícito do prospect.
      </p>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as ContactSource)}
        className="w-full rounded-md border border-border bg-surface px-2 py-1 text-[11px]"
        aria-label="Origem do consentimento"
      >
        {CONTACT_SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Como foi obtido? (opcional)"
          aria-label="Nota sobre o consentimento (opcional)"
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] placeholder:text-faint"
        />
        <button
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const trimmed = note.trim();
              await recordOptIn({ leadId, source, ...(trimmed ? { note: trimmed } : {}) });
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falha ao registrar o consentimento.");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg disabled:opacity-50"
        >
          {busy ? "…" : "Registrar"}
        </button>
      </div>
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </div>
  );
}
