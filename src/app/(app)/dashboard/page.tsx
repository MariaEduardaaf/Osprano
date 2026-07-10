"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader, StatCard } from "@/components/ui";
import { PIPELINE_STAGES } from "@convex/lib/domain";

const STAGE_COLOR: Record<string, string> = {
  base: "var(--cold)",
  approached: "var(--brand)",
  opened: "var(--warm)",
  replied: "var(--warm)",
  converted: "var(--brand)",
  lost: "var(--faint)",
};

function eventDot(type: string): string {
  if (type === "preview_open") return "var(--warm)";
  if (type === "email_sent") return "var(--brand)";
  if (type === "reply") return "var(--brand)";
  return "var(--faint)";
}

function eventLabel(type: string, meta: { to?: string; channel?: string } | null): string {
  switch (type) {
    case "preview_open":
      return "abriu o preview";
    case "email_sent":
      return meta?.channel === "whatsapp" ? "recebeu WhatsApp" : "abordado por email";
    case "reply":
      return "respondeu";
    case "stage_change":
      return meta?.to ? `movido para ${meta.to}` : "mudou de estágio";
    default:
      return type;
  }
}

function ago(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function DashboardPage() {
  const stats = useQuery(api.leads.stats);
  const activity = useQuery(api.events.recent);
  const total = stats?.total ?? 0;

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Dashboard" subtitle="A saúde da sua operação num relance" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Leads" value={stats?.total ?? "—"} hint="na base" />
        <StatCard label="Sem site / social" value={stats?.noSite ?? "—"} hint="maior intenção" />
        <StatCard label="Abordáveis" value={stats?.emailable ?? "—"} hint="opt-out + incorporados" />
        <StatCard
          label="Convertidos"
          value={stats?.byStage.converted ?? "—"}
          hint="fechados"
          accent
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Funnel */}
        <div className="lg:col-span-3 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Funil de conversão</h2>
            <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
              {total} leads
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {PIPELINE_STAGES.map((s) => {
              const count = stats?.byStage[s.id] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted">{s.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                    <div
                      className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                        backgroundColor: STAGE_COLOR[s.id],
                        opacity: count > 0 ? 0.9 : 0,
                      }}
                    >
                      {count > 0 && (
                        <span className="font-mono text-[10px] font-bold text-white/95">{count}</span>
                      )}
                    </div>
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-faint">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
          <h2 className="font-display text-base font-semibold">Atividade recente</h2>
          {activity === undefined ? (
            <p className="mt-4 text-sm text-faint">Carregando…</p>
          ) : activity.length === 0 ? (
            <p className="mt-4 text-sm text-faint">
              Aberturas de preview aparecem aqui — o sinal de compra.
            </p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {activity.map((e) => (
                <li key={e._id} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: eventDot(e.type) }}
                  />
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-medium text-foreground">{e.leadName ?? "Lead"}</span>{" "}
                    <span className="text-muted">{eventLabel(e.type, e.meta)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
                    {ago(e.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
