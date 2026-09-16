"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MdOutlineCall, MdDragIndicator, MdSearch, MdClose, MdAdd } from "react-icons/md";
import { PageHeader } from "@/components/ui";
import { WhatsAppFollowup } from "@/components/whatsapp-followup";
import { CreateLeadModal } from "@/components/crm/create-lead-modal";
import { LeadDetail } from "@/components/crm/lead-detail";
import { TodayStrip, type TodayItem } from "@/components/crm/today-strip";
import { CardActionLine } from "@/components/crm/next-action-line";
import { useNow } from "@/lib/use-now";
import {
  PIPELINE_STAGES,
  canContactByEmail,
  nextActionOf,
  actionStatus,
  isStalled,
  compareByNextAction,
  type Stage,
} from "@convex/lib/domain";

const COLUMNS = PIPELINE_STAGES.filter((s) => s.id !== "lost");

const SORTS: { id: string; label: string; cmp: (a: Doc<"leads">, b: Doc<"leads">) => number }[] = [
  { id: "score_desc", label: "Score (maior)", cmp: (a, b) => (b.score ?? 0) - (a.score ?? 0) },
  { id: "next_action", label: "Próxima ação", cmp: compareByNextAction },
  { id: "score_asc", label: "Score (menor)", cmp: (a, b) => (a.score ?? 0) - (b.score ?? 0) },
  { id: "recent", label: "Mais recentes", cmp: (a, b) => b._creationTime - a._creationTime },
  { id: "name", label: "Nome (A–Z)", cmp: (a, b) => a.name.localeCompare(b.name) },
];

const STAGE_DOT: Record<string, string> = {
  base: "var(--cold)",
  approached: "var(--brand)",
  scheduled: "var(--warm)",
  followup: "var(--warm)",
  converted: "var(--brand)",
};

const TIER: Record<string, { label: string; color: string }> = {
  hot: { label: "Quente", color: "var(--hot)" },
  warm: { label: "Morno", color: "var(--warm)" },
  cold: { label: "Frio", color: "var(--cold)" },
};

// `now` vem do estado da página (useNow): "parado" depende do relógio.
const FILTERS: { id: string; label: string; fn: (l: Doc<"leads">, now: number) => boolean }[] = [
  { id: "all", label: "Todos", fn: () => true },
  { id: "nosite", label: "Sem site", fn: (l) => !!(l.signals?.noSite || l.signals?.socialOnly) },
  { id: "hot", label: "Quente", fn: (l) => l.tier === "hot" },
  { id: "score50", label: "Score 50+", fn: (l) => (l.score ?? 0) >= 50 },
  // OPTIN-04: "abordável" = canContactByEmail (regime do mercado OU consentimento registrado).
  // Ler l.emailable cru sumiria com leads que já deram opt-in explícito na ligação.
  { id: "email", label: "Abordável", fn: (l) => canContactByEmail(l) },
  { id: "stalled", label: "Parados", fn: (l, now) => isStalled(l, now) },
];

export default function CrmPage() {
  const leads = useQuery(api.leads.list, {});
  const now = useNow(); // "hoje" é o dia civil do navegador, atualizado a cada 60 s
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("score_desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<Id<"leads"> | null>(null);
  const [openFocus, setOpenFocus] = useState(false); // a faixa Hoje abre o lead com o campo da ação em foco
  const [dragId, setDragId] = useState<Id<"leads"> | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);

  // optimistic move: the card jumps immediately, before the server acks
  const setStage = useMutation(api.leads.setStage).withOptimisticUpdate((store, { id, stage }) => {
    const cur = store.getQuery(api.leads.list, {});
    if (!cur) return;
    store.setQuery(
      api.leads.list,
      {},
      cur.map((l) => (l._id === id ? { ...l, stage, stageUpdatedAt: Date.now() } : l)),
    );
  });

  const move = (id: Id<"leads">, stage: Stage) => void setStage({ id, stage });

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const needle = q.trim().toLowerCase();
  const cmp = (SORTS.find((s) => s.id === sort) ?? SORTS[0]).cmp;
  // descoberta (saved=false) fica só na tela de Leads
  const crmLeads = (leads ?? []).filter((l) => l.saved !== false);
  // A faixa Hoje sai de crmLeads, ANTES de busca, filtro e ordenação: filtrar o Kanban não a muda.
  const todayItems: TodayItem[] = crmLeads
    .flatMap((lead) => {
      const action = nextActionOf(lead);
      if (!action) return [];
      const status = actionStatus(action.at, now);
      return status === "upcoming" ? [] : [{ lead, action, status }];
    })
    .sort((a, b) => a.action.at - b.action.at);
  const visible = crmLeads
    .filter((l) => active.fn(l, now))
    .filter((l) =>
      needle === ""
        ? true
        : `${l.name} ${l.category ?? ""} ${l.city ?? ""}`.toLowerCase().includes(needle),
    )
    .slice()
    .sort(cmp);

  const openLead = openId ? crmLeads.find((l) => l._id === openId) ?? null : null;
  const openLeadDetail = (id: Id<"leads">, opts?: { focusNextAction?: boolean }) => {
    setOpenId(id);
    setOpenFocus(opts?.focusNextAction === true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="CRM"
        subtitle="Arraste cada lead pelo funil — ou use o seletor"
        action={
          <div className="flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Ordenar</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-border bg-surface-solid py-2 pl-3 pr-8 text-sm font-medium text-muted shadow-[var(--shadow-sm)] outline-none focus:border-border-strong"
                aria-label="Ordenar"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    Ordenar: {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover"
            >
              <MdAdd size={18} />
              Criar lead
            </button>
          </div>
        }
      />

      <TodayStrip items={todayItems} now={now} onOpen={openLeadDetail} />

      {/* search */}
      <div className="glass relative mb-4 max-w-xl rounded-xl focus-within:border-border-strong">
        <MdSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, categoria ou cidade…"
          className="w-full border-0 bg-transparent py-2.5 pl-10 pr-9 text-sm shadow-none outline-none placeholder:text-faint"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:bg-surface-2 hover:text-foreground"
          >
            <MdClose size={16} />
          </button>
        )}
      </div>

      {/* filter pills + count */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.id
                ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
                : "border border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        {leads !== undefined && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-faint">
            {visible.length} {visible.length === 1 ? "lead" : "leads"}
          </span>
        )}
      </div>

      {leads === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = visible.filter((l) => l.stage === col.id);
            const isOver = overCol === col.id;
            return (
              <div key={col.id} className="flex w-80 shrink-0 flex-col">
                <div className="mb-2.5 flex items-center justify-between px-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_DOT[col.id] }} />
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                </div>

                {/* drop lane */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overCol !== col.id) setOverCol(col.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) move(dragId, col.id);
                    setDragId(null);
                    setOverCol(null);
                  }}
                  className={`flex-1 space-y-2.5 rounded-2xl border p-2.5 transition-colors ${
                    isOver
                      ? "border-brand/50 bg-brand/[0.06]"
                      : "border-border/60 bg-surface-2/40"
                  }`}
                  style={{ minHeight: 140 }}
                >
                  {items.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-faint">
                      {isOver ? "Soltar aqui" : "Sem leads"}
                    </div>
                  ) : (
                    items.map((lead) => {
                      const tier = TIER[lead.tier ?? "cold"] ?? TIER.cold;
                      const isDragging = dragId === lead._id;
                      return (
                        <div
                          key={lead._id}
                          draggable
                          onDragStart={() => setDragId(lead._id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setOverCol(null);
                          }}
                          onClick={() => openLeadDetail(lead._id)}
                          className={`glass-lite group cursor-grab rounded-[var(--radius)] p-3.5 transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] active:cursor-grabbing ${
                            isDragging ? "opacity-40" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* tier + score chip */}
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color: tier.color,
                                backgroundColor: `color-mix(in srgb, ${tier.color} 14%, transparent)`,
                              }}
                            >
                              <span className="font-display font-bold tabular-nums">{lead.score ?? "—"}</span>
                              {tier.label}
                            </span>
                            <MdDragIndicator
                              size={16}
                              className="mt-0.5 shrink-0 text-faint/60 opacity-0 transition-opacity group-hover:opacity-100"
                            />
                          </div>

                          <h3 className="mt-2 truncate font-display text-sm font-semibold">{lead.name}</h3>
                          <p className="truncate text-[11px] text-muted">
                            {(lead.category ?? "—").replace(/_/g, " ")}
                            {lead.city ? ` · ${lead.city}` : ""}
                          </p>

                          <CardActionLine lead={lead} now={now} />

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <select
                              value={lead.stage}
                              onChange={(e) => move(lead._id, e.target.value as Stage)}
                              className="rounded-md border border-border bg-surface-solid px-1.5 py-1 text-[11px] text-muted"
                              aria-label="Mover estágio"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-2"
                              >
                                <MdOutlineCall size={13} />
                                Ligar
                              </a>
                            )}
                          </div>

                          {lead.phone && (
                            <div
                              className="mt-2 border-t border-border pt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* OPTIN-04: o consentimento de contato vale para os dois canais —
                                  hasWaOptIn (servidor) já aceita contactOptInAt. */}
                              <WhatsAppFollowup
                                leadId={lead._id}
                                phone={lead.phone}
                                optInAt={lead.waOptInAt ?? lead.contactOptInAt}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && <CreateLeadModal onClose={() => setCreateOpen(false)} />}
      {openLead && (
        <LeadDetail
          key={openLead._id}
          lead={openLead}
          focusNextAction={openFocus}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
