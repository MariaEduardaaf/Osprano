"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MARKETS, LAUNCH_MARKETS, CATEGORY_OPTIONS, CITIES_BY_COUNTRY } from "@convex/lib/domain";
import { MdOutlineSearch, MdOutlineSend } from "react-icons/md";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadCard } from "@/components/lead-card";
import { GeneratePreviewButton } from "@/components/generate-preview-button";

export default function LeadsPage() {
  const [country, setCountry] = useState("GB");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<Id<"leads">>>(new Set());

  const search = useAction(api.places.search);
  const saveMany = useMutation(api.leads.saveMany);
  const leads = useQuery(api.leads.list, {});

  const shown = leads ?? [];
  const allSelected = shown.length > 0 && shown.every((l) => selected.has(l._id));

  function toggle(id: Id<"leads">) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(shown.map((l) => l._id)));
  }
  async function sendToCrm() {
    if (selected.size === 0) return;
    const res = await saveMany({ ids: [...selected] });
    setMsg(`${res.saved} lead(s) enviado(s) para o CRM.`);
    setSelected(new Set());
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim() || !city.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await search({
        countryCode: country,
        category: category.trim(),
        city: city.trim(),
        max: limit,
      });
      setMsg(`Encontrados ${res.found} · adicionados ${res.inserted}. Pontuando em segundo plano…`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Descoberta"
        title="Buscar Leads"
        subtitle="Encontre negócios locais com presença digital fraca, por categoria e cidade"
      />

      <form
        onSubmit={onSearch}
        className="mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]"
      >
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setCity("");
          }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          {LAUNCH_MARKETS.map((code) => (
            <option key={code} value={code}>
              {MARKETS[code].flag} {MARKETS[code].name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="">Categoria…</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="">Cidade…</option>
          {(CITIES_BY_COUNTRY[country] ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
            Máx
          </span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              setLimit(Number.isNaN(n) ? 1 : Math.min(50, Math.max(1, n)));
            }}
            className="w-12 bg-transparent text-sm font-semibold tabular-nums outline-none"
            aria-label="Máximo de leads a buscar (1 a 50)"
          />
          <span className="text-xs text-faint">leads</span>
        </label>
        <button
          type="submit"
          disabled={busy || !category.trim() || !city.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          <MdOutlineSearch size={16} />
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {msg && (
        <p className="mb-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
          {msg}
        </p>
      )}

      {leads !== undefined && leads.length > 0 && (
        <div className="mb-4 flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-faint">
          <span className="text-foreground">{leads.length} leads</span>
          <span>{leads.filter((l) => l.emailable).length} abordáveis</span>
          <span>{leads.filter((l) => l.signals?.noSite || l.signals?.socialOnly).length} sem site</span>
        </div>
      )}

      {shown.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border accent-[var(--brand)]"
            />
            Selecionar todos
          </label>
          <button
            onClick={sendToCrm}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-40"
          >
            <MdOutlineSend size={16} />
            Enviar para CRM ({selected.size})
          </button>
        </div>
      )}

      {leads === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : leads.length === 0 ? (
        <EmptyState title="Nenhum lead ainda">
          Busque uma categoria numa cidade dos mercados opt-out ({LAUNCH_MARKETS.join(" · ")}). Cada
          negócio recebe um Digital Presence Score automaticamente.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              selectable
              selected={selected.has(lead._id)}
              onToggle={() => toggle(lead._id)}
              action={<GeneratePreviewButton leadId={lead._id} variant="primary" />}
            />
          ))}
        </div>
      )}
    </>
  );
}
