"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader, StatCard } from "@/components/ui";
import { PIPELINE_STAGES } from "@convex/lib/domain";

export default function DashboardPage() {
  const stats = useQuery(api.leads.stats);

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
    </>
  );
}
