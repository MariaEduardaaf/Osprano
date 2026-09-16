"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  MARKETS,
  LAUNCH_MARKETS,
  OPT_IN_MARKETS,
  CATEGORY_OPTIONS,
  CITIES_BY_COUNTRY,
  canContactByEmail,
} from "@convex/lib/domain";
import { MdOutlineSearch, MdOutlineSend, MdOutlineGavel } from "react-icons/md";
import { PageHeader, EmptyState } from "@/components/ui";
import { LeadCard } from "@/components/lead-card";
import { GeneratePreviewButton } from "@/components/generate-preview-button";

/** OPTIN-02: cada aba controla o select de países, o filtro da lista e a variante do card. */
const TABS = [
  { id: "email", label: "Email primeiro" },
  { id: "call", label: "Ligação primeiro" },
] as const;
type LeadsTab = (typeof TABS)[number]["id"];

export default function LeadsPage() {
  const [tab, setTab] = useState<LeadsTab>("email");
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

  const markets = tab === "call" ? OPT_IN_MARKETS : LAUNCH_MARKETS;
  // OPTIN-06: o aviso jurídico é DERIVADO só do estado do mercado selecionado
  // (MARKETS[cc].legalReview), nunca da aba. Marcar um país como "validated" — ou remover a flag —
  // apaga o aviso sozinho, sem tocar nesta página. Acoplar à aba criaria um falso-negativo: um
  // mercado "pending" que entrasse em LAUNCH_MARKETS teria o aviso suprimido justo na aba de email.
  const legalReviewMarket =
    MARKETS[country]?.legalReview === "pending" ? MARKETS[country] : null;
  // Filtro client-side por regime — sem query nova (leads.list já traz todos os leads da org).
  const shownLeads = (leads ?? []).filter((l) =>
    tab === "call" ? OPT_IN_MARKETS.includes(l.countryCode) : !OPT_IN_MARKETS.includes(l.countryCode),
  );
  const allSelected = shownLeads.length > 0 && shownLeads.every((l) => selected.has(l._id));

  function switchTab(next: LeadsTab) {
    if (next === tab) return;
    setTab(next);
    // o país da outra aba não existe no select desta — reseta para o primeiro do regime
    setCountry((next === "call" ? OPT_IN_MARKETS : LAUNCH_MARKETS)[0]);
    setCity("");
    setSelected(new Set());
  }

  function toggle(id: Id<"leads">) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(shownLeads.map((l) => l._id)));
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

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
                  : "border border-border text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={onSearch}
        className="glass mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius)] p-3"
      >
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setCity("");
          }}
          className="rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"
        >
          {markets.map((code) => (
            <option key={code} value={code}>
              {MARKETS[code].flag} {MARKETS[code].name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-40 flex-1 rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"
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
          className="min-w-40 rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm"
        >
          <option value="">Cidade…</option>
          {(CITIES_BY_COUNTRY[country] ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-solid px-3 py-2">
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

      {legalReviewMarket && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl border border-warm/30 bg-warm/10 p-3 text-xs leading-relaxed text-ink-soft"
        >
          <MdOutlineGavel size={16} className="mt-0.5 shrink-0 text-warm" />
          <span>
            <strong>
              {legalReviewMarket.flag} {legalReviewMarket.name}
            </strong>{" "}
            em validação jurídica — ligação B2B permitida; email/WhatsApp só após consentimento
            registrado.
          </span>
        </div>
      )}

      {leads !== undefined && shownLeads.length > 0 && (
        <div className="mb-4 flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-faint">
          <span className="text-foreground">{shownLeads.length} leads</span>
          {tab === "call" ? (
            <span>{shownLeads.filter((l) => l.contactOptInAt).length} com consentimento</span>
          ) : (
            // OPTIN-04: o contador tem que casar com o selo do card ("Abordável — consentimento
            // registrado"): quem deu opt-in explícito conta, mesmo com emailable=false.
            <span>{shownLeads.filter(canContactByEmail).length} abordáveis</span>
          )}
          <span>
            {shownLeads.filter((l) => l.signals?.noSite || l.signals?.socialOnly).length} sem site
          </span>
        </div>
      )}

      {shownLeads.length > 0 && (
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
      ) : shownLeads.length === 0 ? (
        tab === "call" ? (
          <EmptyState title="Nenhum lead em mercado opt-in ainda">
            Busque um mercado opt-in ({OPT_IN_MARKETS.join(" · ")}). O fluxo é: ligar → registrar
            consentimento → email destrava.
          </EmptyState>
        ) : (
          <EmptyState title="Nenhum lead ainda">
            Busque uma categoria numa cidade dos mercados opt-out ({LAUNCH_MARKETS.join(" · ")}). Cada
            negócio recebe um Digital Presence Score automaticamente.
          </EmptyState>
        )
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shownLeads.map((lead) => {
            // contrato com o 04-05: o slot `action` vai nas DUAS abas — quem esconde o fluxo de
            // email até haver consentimento é o gating INTERNO do card, nunca o pai.
            const common = {
              lead,
              selectable: true,
              selected: selected.has(lead._id),
              onToggle: () => toggle(lead._id),
              action: <GeneratePreviewButton leadId={lead._id} variant="primary" />,
            };
            return tab === "call" ? (
              <LeadCard key={lead._id} {...common} variant="call" />
            ) : (
              <LeadCard key={lead._id} {...common} />
            );
          })}
        </div>
      )}
    </>
  );
}
