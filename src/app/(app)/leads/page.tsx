"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadCard } from "@/components/lead-card";

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
        title="Buscar Leads"
        subtitle="Encontre negócios locais com presença digital fraca, por categoria e cidade"
      />

      <form
        onSubmit={onSearch}
        className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4"
      >
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          {LAUNCH_MARKETS.map((code) => (
            <option key={code} value={code}>
              {MARKETS[code].flag} {MARKETS[code].name}
            </option>
          ))}
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoria (ex.: restaurant, barber)"
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Cidade"
          className="min-w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !category.trim() || !city.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg disabled:opacity-50"
        >
          {busy ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {msg && <p className="mb-4 text-sm text-muted">{msg}</p>}

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
            <LeadCard key={lead._id} lead={lead} />
          ))}
        </div>
      )}
    </>
  );
}
