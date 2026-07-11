"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { IconType } from "react-icons";
import {
  MdOutlineDrafts,
  MdOutlineSend,
  MdOutlineMarkEmailRead,
  MdOutlineReply,
  MdOutlineErrorOutline,
  MdOpenInNew,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { PageHeader, EmptyState } from "@/components/ui";

type Status = "draft" | "sent" | "opened" | "replied" | "bounced";

const STATUS: Record<Status, { label: string; color: string; Icon: IconType }> = {
  draft: { label: "Rascunho", color: "var(--faint)", Icon: MdOutlineDrafts },
  sent: { label: "Enviado", color: "var(--brand)", Icon: MdOutlineSend },
  opened: { label: "Abriu", color: "var(--warm)", Icon: MdOutlineMarkEmailRead },
  replied: { label: "Respondeu", color: "var(--hot)", Icon: MdOutlineReply },
  bounced: { label: "Falhou", color: "var(--danger)", Icon: MdOutlineErrorOutline },
};

const TIER_COLOR: Record<string, string> = { hot: "var(--hot)", warm: "var(--warm)", cold: "var(--cold)" };

const FILTERS: { id: Status | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Rascunho" },
  { id: "sent", label: "Enviado" },
  { id: "opened", label: "Abriu" },
  { id: "replied", label: "Respondeu" },
];

const PAGE_SIZE = 15;

function ago(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.max(1, Math.round(diff / 60000));
  if (m < 60) return `há ${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export default function OutreachPage() {
  const items = useQuery(api.outreach.outbox, {});
  const [filter, setFilter] = useState<Status | "all">("all");
  const [page, setPage] = useState(0);

  const counts = (items ?? []).reduce<Record<string, number>>((acc, it) => {
    acc[it.status] = (acc[it.status] ?? 0) + 1;
    return acc;
  }, {});

  const shown = (items ?? []).filter((it) => filter === "all" || it.status === filter);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = shown.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const from = shown.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = safePage * PAGE_SIZE + pageItems.length;

  return (
    <>
      <PageHeader
        eyebrow="Outreach"
        title="Caixa de saída"
        subtitle="Acompanhe cada abordagem por email — rascunho, enviado, aberto e respondido."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.id === "all" ? (items?.length ?? 0) : (counts[f.id] ?? 0);
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(0);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
                  : "border border-border text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 font-mono text-[10px] tabular-nums ${
                  active ? "bg-white/20" : "bg-surface-2 text-faint"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {items === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : shown.length === 0 ? (
        <EmptyState title="Nenhuma abordagem aqui ainda">
          Escreva a abordagem de um lead pela aba <strong>Abordagem</strong> (no detalhe do lead, dentro
          do CRM). Assim que você gerar ou enviar, ela aparece aqui com o status.
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-left font-mono text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-semibold">Negócio</th>
                  <th className="px-4 py-3 font-semibold">Categoria · Cidade</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Atividade</th>
                  <th className="px-4 py-3 text-right font-semibold">Prévia</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((it) => {
                  const s = STATUS[it.status as Status] ?? STATUS.draft;
                  const timing =
                    it.status === "draft"
                      ? "rascunho não enviado"
                      : it.status === "replied"
                        ? `respondeu ${ago(it.activityAt)}`
                        : it.status === "opened"
                          ? `abriu ${ago(it.openedAt)}${it.openCount > 1 ? ` · ${it.openCount}×` : ""}`
                          : `enviado ${ago(it.sentAt)}`;
                  return (
                    <tr
                      key={it.leadId}
                      className="border-b border-border/70 last:border-0 hover:bg-surface-2/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
                          >
                            <s.Icon size={15} />
                          </span>
                          <span className="font-display font-semibold text-foreground">{it.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {(it.category ?? "—").replace(/_/g, " ")}
                        {it.city ? ` · ${it.city}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-display font-bold tabular-nums"
                          style={{ color: TIER_COLOR[it.tier] ?? "var(--cold)" }}
                        >
                          {it.score ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-faint">
                        {timing}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {it.previewToken ? (
                          <a
                            href={`/p/${it.previewToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                          >
                            Abrir <MdOpenInNew size={12} />
                          </a>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              Mostrando <span className="tabular-nums text-foreground">{from}–{to}</span> de{" "}
              <span className="tabular-nums text-foreground">{shown.length}</span>
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-40"
                >
                  <MdChevronLeft size={16} /> Anterior
                </button>
                <span className="px-2 font-mono text-xs tabular-nums text-muted">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-40"
                >
                  Próxima <MdChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
