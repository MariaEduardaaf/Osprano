"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader, StatCard } from "@/components/ui";
import { PIPELINE_STAGES } from "@convex/lib/domain";

function eventLabel(type: string, meta: { to?: string; channel?: string } | null): string {
  switch (type) {
    case "preview_open":
      return "abriu o preview 👀";
    case "email_sent":
      return meta?.channel === "whatsapp" ? "recebeu WhatsApp" : "abordado por email";
    case "reply":
      return "respondeu";
    case "stage_change":
      return meta?.to ? `moveu para ${meta.to}` : "mudou de estágio";
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

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da sua operação" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Leads" value={stats?.total ?? "—"} hint="descubra na aba Leads" />
        <StatCard
          label="Sem site / só-social"
          value={stats?.noSite ?? "—"}
          hint="os de maior intenção"
        />
        <StatCard
          label="Abordáveis"
          value={stats?.emailable ?? "—"}
          hint="opt-out + incorporados"
        />
        <StatCard
          label="Convertidos"
          value={stats?.byStage.converted ?? "—"}
          hint="fechados"
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Funil de conversão</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.id} className="rounded-lg bg-surface-2 p-4 text-center">
              <div className="text-2xl font-bold tabular-nums">{stats?.byStage[s.id] ?? 0}</div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Atividade recente</h2>
        {activity === undefined ? (
          <p className="mt-3 text-sm text-faint">Carregando…</p>
        ) : activity.length === 0 ? (
          <p className="mt-3 text-sm text-faint">
            Sem atividade ainda. Aberturas de preview aparecem aqui — o sinal de compra.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {activity.map((e) => (
              <li key={e._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate">
                  <span className="font-medium">{e.leadName ?? "Lead"}</span>{" "}
                  <span className="text-muted">{eventLabel(e.type, e.meta)}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-faint">{ago(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
