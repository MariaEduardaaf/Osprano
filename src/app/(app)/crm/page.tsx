"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MdOutlineCall } from "react-icons/md";
import { PageHeader } from "@/components/ui";
import { WhatsAppFollowup } from "@/components/whatsapp-followup";
import { PIPELINE_STAGES, type Stage } from "@convex/lib/domain";

const COLUMNS = PIPELINE_STAGES.filter((s) => s.id !== "lost");

const STAGE_DOT: Record<string, string> = {
  base: "var(--cold)",
  approached: "var(--brand)",
  scheduled: "var(--warm)",
  followup: "var(--warm)",
  converted: "var(--brand)",
};

const FILTERS: { id: string; label: string; fn: (l: Doc<"leads">) => boolean }[] = [
  { id: "all", label: "Todos", fn: () => true },
  { id: "nosite", label: "Sem site", fn: (l) => !!(l.signals?.noSite || l.signals?.socialOnly) },
  { id: "hot", label: "Quente", fn: (l) => l.tier === "hot" },
  { id: "score50", label: "Score 50+", fn: (l) => (l.score ?? 0) >= 50 },
  { id: "email", label: "Abordável", fn: (l) => !!l.emailable },
];

function StageSelect({ lead }: { lead: Doc<"leads"> }) {
  const setStage = useMutation(api.leads.setStage);
  return (
    <select
      value={lead.stage}
      onChange={(e) => void setStage({ id: lead._id, stage: e.target.value as Stage })}
      className="rounded-md border border-border bg-surface px-1.5 py-1 text-[11px] text-muted"
      aria-label="Mover estágio"
    >
      {PIPELINE_STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export default function CrmPage() {
  const leads = useQuery(api.leads.list, {});
  const [filter, setFilter] = useState("all");

  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const filtered = (leads ?? []).filter(active.fn);

  return (
    <>
      <PageHeader eyebrow="Pipeline" title="CRM" subtitle="Filtre, priorize e mova cada lead pelo funil" />

      <div className="mb-5 flex flex-wrap gap-2">
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
      </div>

      {leads === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((l) => l.stage === col.id);
            return (
              <div key={col.id} className="w-72 shrink-0">
                <div className="mb-3 flex items-center justify-between px-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STAGE_DOT[col.id] }}
                    />
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-faint">
                      Sem leads
                    </div>
                  ) : (
                    items.map((lead) => (
                      <div
                        key={lead._id}
                        className="rounded-[var(--radius)] border border-border bg-surface p-3.5 shadow-[var(--shadow-sm)] transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-sm font-semibold">{lead.name}</h3>
                            <p className="truncate text-[11px] text-muted">
                              {(lead.category ?? "—").replace(/_/g, " ")}
                              {lead.city ? ` · ${lead.city}` : ""}
                            </p>
                          </div>
                          <span
                            className="font-display text-base font-bold tabular-nums"
                            style={{
                              color:
                                lead.tier === "hot"
                                  ? "var(--hot)"
                                  : lead.tier === "warm"
                                    ? "var(--warm)"
                                    : "var(--cold)",
                            }}
                          >
                            {lead.score ?? "—"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <StageSelect lead={lead} />
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-2"
                            >
                              <MdOutlineCall size={13} />
                              Ligar
                            </a>
                          )}
                        </div>
                        {(lead.stage === "scheduled" || lead.stage === "converted") && (
                          <div className="mt-2 border-t border-border pt-2">
                            <WhatsAppFollowup leadId={lead._id} phone={lead.phone} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
