import { PageHeader, EmptyState } from "@/components/ui";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Buscar Leads"
        subtitle="Encontre negócios locais com presença digital fraca, por categoria e cidade"
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4">
        <select
          disabled
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted"
        >
          {LAUNCH_MARKETS.map((code) => (
            <option key={code}>
              {MARKETS[code].flag} {MARKETS[code].name}
            </option>
          ))}
        </select>
        <input
          disabled
          placeholder="Categoria (ex.: restaurante, barbearia)"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        />
        <button
          disabled
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg opacity-60"
        >
          Buscar
        </button>
      </div>

      <EmptyState title="A busca conecta na Fase 1">
        Só mercados opt-out ({LAUNCH_MARKETS.join(" · ")}). A descoberta usa Google Places +
        Foursquare OS, e cada lead ganha um Digital Presence Score.
      </EmptyState>
    </>
  );
}
