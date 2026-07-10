import { PageHeader, StatCard } from "@/components/ui";
import { PIPELINE_STAGES } from "@convex/lib/domain";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral da sua operação" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Leads" value="0" hint="descubra na aba Leads" />
        <StatCard label="Sem site / só-social" value="0" hint="os de maior intenção" />
        <StatCard label="Abordáveis" value="0" hint="opt-out + incorporados" />
        <StatCard label="Convertidos" value="0" hint="fechados" />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Funil de conversão</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.id} className="rounded-lg bg-surface-2 p-4 text-center">
              <div className="text-2xl font-bold tabular-nums text-faint">0</div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-faint">
          Os números conectam aos dados reais na Fase 1 (descoberta + Digital Presence Score).
        </p>
      </div>
    </>
  );
}
