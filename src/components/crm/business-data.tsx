"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { CONFIRM_VIA_OPTIONS, isGoogleLead, type ConfirmVia } from "@convex/lib/googleData";
import { errorMessage } from "@/lib/errors";
import { useGooglePlace, useLoadGooglePlace } from "@/lib/use-google-places";
import { GoogleCard } from "@/components/google/google-card";
import { InlineField } from "./lead-info-fields";

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";
const labelCls = "mb-1 block text-[11px] text-muted";
const NO_SITE = "Conferi que o negócio não tem site próprio";

/** Nome, telefone e endereço: confirmação digitada (lead do Google) ou edição (demais). */
export function BusinessData({ lead }: { lead: Doc<"leads"> }) {
  return (
    <section className="rounded-xl bg-surface-2 p-4">
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Dados do negócio</h3>
      {isGoogleLead(lead) && !lead.confirmation ? <ConfirmGoogleLead lead={lead} /> : <EditableFields lead={lead} />}
    </section>
  );
}

function ConfirmGoogleLead({ lead }: { lead: Doc<"leads"> }) {
  const place = useGooglePlace(lead._id);
  const load = useLoadGooglePlace();
  const confirmInfo = useMutation(api.leads.confirmInfo);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // campos começam vazios: NUNCA vêm do Google (a cliente digita o que confirmou)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [via, setVia] = useState<ConfirmVia | "">("");
  const [noSite, setNoSite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (place) return;
    void load(lead._id)
      .then((r) => setGone(r.gone))
      .catch((e) => setError(errorMessage(e, "Falha ao buscar no Google Maps")));
  }, [lead._id, load, place]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !via) return;
    setSaving(true);
    setSaveError(null);
    try {
      await confirmInfo({
        id: lead._id,
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        via,
        ...(noSite ? { noSite: true } : {}),
      });
    } catch (err) {
      setSaveError(errorMessage(err, "Falha ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <GoogleCard place={place} loading={!place && !gone && !error} gone={gone} error={error} />
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-muted">
          Confirme com o próprio negócio: ligue, visite ou veja o site. Não salvamos dados do Google.
        </p>
        <label className="block">
          <span className={labelCls}>Nome do negócio</span>
          <input required autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como o negócio se apresenta" className={fieldCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Telefone</span>
          <input autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 20 0000 0000" className={fieldCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Endereço</span>
          <input autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua e número" className={fieldCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Onde você confirmou?</span>
          <select value={via} onChange={(e) => setVia(e.target.value as ConfirmVia | "")} className={fieldCls}>
            <option value="">Escolha…</option>
            {CONFIRM_VIA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={noSite} onChange={(e) => setNoSite(e.target.checked)} />
          {NO_SITE}
        </label>
        {saveError && (
          <p role="alert" className="text-xs text-danger">
            {saveError}
          </p>
        )}
        <button
          type="submit"
          disabled={!name.trim() || !via || saving}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Salvar dados confirmados
        </button>
      </form>
    </div>
  );
}

function EditableFields({ lead }: { lead: Doc<"leads"> }) {
  const confirmInfo = useMutation(api.leads.confirmInfo);
  const c = lead.confirmation;
  const viaLabel = c && CONFIRM_VIA_OPTIONS.find((o) => o.value === c.via)?.label;
  return (
    <div className="space-y-3">
      <InlineField key={`name:${lead.name ?? ""}`} label="Nome" value={lead.name ?? ""} placeholder="Nome do negócio" onSave={(v) => confirmInfo({ id: lead._id, name: v })} />
      <InlineField key={`phone:${lead.phone ?? ""}`} label="Telefone" value={lead.phone ?? ""} placeholder="+44 20 0000 0000" onSave={(v) => confirmInfo({ id: lead._id, phone: v })} />
      <InlineField key={`address:${lead.address ?? ""}`} label="Endereço" value={lead.address ?? ""} placeholder="Rua e número" onSave={(v) => confirmInfo({ id: lead._id, address: v })} />
      {c && (
        <>
          <p className="text-[11px] text-faint">
            Confirmado em {new Date(c.at).toLocaleDateString("pt-BR")} · {viaLabel}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={c.noSite === true} onChange={(e) => void confirmInfo({ id: lead._id, noSite: e.target.checked })} />
            {NO_SITE}
          </label>
        </>
      )}
    </div>
  );
}
