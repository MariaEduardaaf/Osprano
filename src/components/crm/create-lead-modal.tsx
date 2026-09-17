"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { MdClose, MdCheck } from "react-icons/md";
import {
  CATEGORY_OPTIONS,
  CITIES_BY_COUNTRY,
  MARKETS,
  LAUNCH_MARKETS,
} from "@convex/lib/domain";
import { errorMessage } from "@/lib/errors";

const LEGAL = [
  { v: "unknown", l: "Não sei" },
  { v: "incorporated", l: "Empresa (Ltd/BV/AB…)" },
  { v: "sole_trader", l: "Autônomo" },
] as const;

const CONTACT = [
  { v: "unknown", l: "Não sei" },
  { v: "role", l: "Caixa de função (info@, contact@)" },
  { v: "named", l: "Pessoa física (nome@)" },
] as const;

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label} {required && <span className="text-hot">*</span>}
      </span>
      {children}
    </label>
  );
}

export function CreateLeadModal({ onClose }: { onClose: () => void }) {
  const create = useMutation(api.leads.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState<string>(LAUNCH_MARKETS[0]);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [legalForm, setLegalForm] = useState<(typeof LEGAL)[number]["v"]>("unknown");
  const [contactType, setContactType] = useState<(typeof CONTACT)[number]["v"]>("unknown");

  // lock background scroll while open. Esc é tratado no próprio dialog (abaixo)
  // com stopPropagation: um listener no window disputaria com o do drawer do
  // lead e o Esc fechava o drawer em vez do modal.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const cities = CITIES_BY_COUNTRY[countryCode] ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do negócio é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await create({
        name: name.trim(),
        countryCode,
        category: category || undefined,
        city: city || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        email: email.trim() || undefined,
        legalForm,
        contactType,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Erro ao criar lead."));
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-lead-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="glass-dense relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">
              Novo lead
            </div>
            <h2 id="create-lead-title" className="font-display text-lg font-bold">Criar lead manualmente</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Nome do negócio" required>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: The Oak & Barrel"
              className={fieldCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="País" required>
              <select value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setCity(""); }} className={fieldCls}>
                {LAUNCH_MARKETS.map((c) => (
                  <option key={c} value={c}>
                    {MARKETS[c].flag} {MARKETS[c].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cidade">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls}>
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
              <option value="">—</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Endereço">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" className={fieldCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44…" className={fieldCls} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@…" className={fieldCls} />
            </Field>
          </div>

          <Field label="Website (deixe vazio se não tiver)">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={fieldCls} />
          </Field>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface-2/50 p-3">
            <Field label="Forma jurídica">
              <select value={legalForm} onChange={(e) => setLegalForm(e.target.value as typeof legalForm)} className={fieldCls}>
                {LEGAL.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de contato">
              <select value={contactType} onChange={(e) => setContactType(e.target.value as typeof contactType)} className={fieldCls}>
                {CONTACT.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </Field>
            <p className="col-span-2 text-[11px] leading-relaxed text-faint">
              Define se o lead é <strong className="text-muted">abordável por email</strong> (compliance): mercado opt-out + empresa incorporada ou caixa de função.
            </p>
          </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-border px-6 py-4">
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                <MdCheck size={16} />
                {saving ? "Criando…" : "Criar lead"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
