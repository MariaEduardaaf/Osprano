"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { SENDER_LIMITS, type SenderProfile } from "@convex/lib/sender";

/** Inicializa o estado a partir da query com o padrão de `key` (ver outreach-composer.tsx). */
export function SenderProfileForm() {
  const profile = useQuery(api.sender.get);
  return <Form key={profile === undefined ? "loading" : "loaded"} initial={profile ?? null} />;
}

const FIELDS: { key: keyof SenderProfile; label: string; type?: string; autoComplete?: string }[] = [
  { key: "name", label: "Nome de quem assina", autoComplete: "name" },
  { key: "company", label: "Empresa ou marca", autoComplete: "organization" },
  { key: "address", label: "Endereço postal", autoComplete: "street-address" },
  { key: "replyTo", label: "E-mail de resposta", type: "email", autoComplete: "email" },
];

function Form({ initial }: { initial: SenderProfile | null }) {
  const save = useMutation(api.sender.save);
  const [values, setValues] = useState<SenderProfile>(
    initial ?? { name: "", company: "", address: "", replyTo: "" },
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const saved = await save(values);
      setValues(saved);
      setMsg({ ok: true, text: "Salvo." });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err, "Falha ao salvar") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="font-display text-xl font-bold">Remetente</h2>
      <p className="mt-2 text-sm text-muted">
        Esses dados assinam suas mensagens e aparecem no rodapé de todo e-mail, junto com o link de
        descadastro. Use o e-mail do qual você vai enviar.
      </p>
      <div className="mt-5 space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-sm font-medium text-muted">{f.label}</span>
            <input
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              value={values[f.key]}
              maxLength={SENDER_LIMITS[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="w-full rounded-md border border-border bg-surface-solid px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar"}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-muted" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
