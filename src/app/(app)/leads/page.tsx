"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { MARKETS, LAUNCH_MARKETS, CATEGORY_OPTIONS, CITIES_BY_COUNTRY } from "@convex/lib/domain";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadCard } from "@/components/lead-card";
import { GeneratePreviewButton } from "@/components/generate-preview-button";

export default function LeadsPage() {
  const [country, setCountry] = useState("GB");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const search = useAction(api.places.search);
  const leads = useQuery(api.leads.list, {});

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim() || !city.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await search({ countryCode: country, category: category.trim(), city: city.trim() });
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
        <button
          type="submit"
          disabled={busy || !category.trim() || !city.trim()}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
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

      {leads === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : leads.length === 0 ? (
        <EmptyState title="Nenhum lead ainda">
          Busque uma categoria numa cidade dos mercados opt-out ({LAUNCH_MARKETS.join(" · ")}). Cada
          negócio recebe um Digital Presence Score automaticamente.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              action={<GeneratePreviewButton leadId={lead._id} />}
            />
          ))}
        </div>
      )}
    </>
  );
}
