import type { ReactNode } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import { type Signals, MARKETS } from "@convex/lib/domain";
import { ScoreDonut, Badge } from "./ui";

type Lead = Doc<"leads">;

const TIER_LABEL: Record<string, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };

const SIGNAL_LABEL: Record<keyof Signals, string> = {
  noSite: "Sem site",
  socialOnly: "Só rede social",
  noHttps: "Sem HTTPS",
  notMobile: "Não-mobile",
  slow: "Lento",
  sparseProfile: "Perfil fraco",
};

export function LeadCard({ lead, action }: { lead: Lead; action?: ReactNode }) {
  const tier = (lead.tier ?? "cold") as "hot" | "warm" | "cold";
  const signals = lead.signals;
  const flag = MARKETS[lead.countryCode]?.flag ?? "";

  return (
    <div className="group flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start gap-3.5">
        <ScoreDonut score={lead.score ?? 0} tier={tier} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold leading-tight text-foreground">
              {lead.name}
            </h3>
            <Badge tone={tier}>{TIER_LABEL[tier]}</Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted">
            {(lead.category ?? "—").replace(/_/g, " ")}
            {lead.city ? ` · ${lead.city}` : ""}
            {flag ? ` · ${flag}` : ""}
          </p>
        </div>
      </div>

      {signals && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(Object.keys(SIGNAL_LABEL) as (keyof Signals)[])
            .filter((k) => signals[k])
            .map((k) => (
              <span
                key={k}
                className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {SIGNAL_LABEL[k]}
              </span>
            ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3.5">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
            lead.emailable ? "text-brand" : "text-faint"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              lead.emailable ? "bg-brand" : "bg-faint"
            }`}
          />
          {lead.emailable ? "Abordável por email" : "Fora do escopo compliant"}
        </span>
        {action}
      </div>
    </div>
  );
}
