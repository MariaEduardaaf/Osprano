import type { Doc } from "@convex/_generated/dataModel";
import type { Signals } from "@convex/lib/domain";

type Lead = Doc<"leads">;

const TIER_LABEL: Record<string, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };
const TIER_CLASS: Record<string, string> = {
  hot: "text-hot border-hot/30 bg-hot/10",
  warm: "text-warm border-warm/30 bg-warm/10",
  cold: "text-cold border-cold/30 bg-cold/10",
};

const SIGNAL_LABEL: Record<keyof Signals, string> = {
  noSite: "Sem site",
  socialOnly: "Só rede social",
  noHttps: "Sem HTTPS",
  notMobile: "Não-mobile",
  slow: "Lento",
  sparseProfile: "Perfil fraco",
};

export function LeadCard({ lead, action }: { lead: Lead; action?: React.ReactNode }) {
  const tier = lead.tier ?? "cold";
  const signals = lead.signals;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{lead.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {lead.category ?? "—"}
            {lead.city ? ` · ${lead.city}` : ""}
            {lead.countryCode ? ` · ${lead.countryCode}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TIER_CLASS[tier]}`}
          >
            {TIER_LABEL[tier]}
          </span>
          <span className="text-lg font-bold tabular-nums" title="Digital Presence Score">
            {lead.score ?? "—"}
          </span>
        </div>
      </div>

      {signals && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(SIGNAL_LABEL) as (keyof Signals)[])
            .filter((k) => signals[k])
            .map((k) => (
              <span
                key={k}
                className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {SIGNAL_LABEL[k]}
              </span>
            ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span
          className={`text-[11px] font-medium ${lead.emailable ? "text-brand" : "text-faint"}`}
        >
          {lead.emailable ? "✓ Abordável por email" : "Fora do escopo compliant"}
        </span>
        {action}
      </div>
    </div>
  );
}
