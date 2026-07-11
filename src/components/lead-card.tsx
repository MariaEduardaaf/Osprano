import type { ReactNode } from "react";
import {
  MdOutlineCheckCircle,
  MdOutlineBlock,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdOutlineLanguage,
  MdOutlineCall,
  MdOutlinePlace,
  MdOutlineHome,
  MdOutlineLightbulb,
  MdStar,
} from "react-icons/md";
import type { Doc } from "@convex/_generated/dataModel";
import { MARKETS } from "@convex/lib/domain";
import { Badge } from "./ui";

type Lead = Doc<"leads">;

const TIER_LABEL: Record<string, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };
const TIER_COLOR: Record<string, string> = {
  hot: "var(--hot)",
  warm: "var(--warm)",
  cold: "var(--cold)",
};

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-soft">
      <span className="shrink-0 text-faint">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}

export function LeadCard({
  lead,
  action,
  selectable,
  selected,
  onToggle,
}: {
  lead: Lead;
  action?: ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const tier = (lead.tier ?? "cold") as "hot" | "warm" | "cold";
  const signals = lead.signals;
  const country = MARKETS[lead.countryCode]?.name ?? lead.countryCode;
  const hasSite = !!lead.website;
  const noSite = !!(signals?.noSite || signals?.socialOnly);
  const category = (lead.category ?? "").replace(/_/g, " ");

  return (
    <div
      onClick={selectable ? onToggle : undefined}
      className={`group flex flex-col rounded-2xl border bg-surface p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong"
      }`}
    >
      {/* name + select */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-foreground">
          {lead.name}
        </h3>
        {selectable && (
          <span className="mt-0.5 shrink-0" aria-hidden>
            {selected ? (
              <MdCheckCircle size={22} className="text-brand" />
            ) : (
              <MdRadioButtonUnchecked
                size={22}
                className="text-faint/50 transition-colors group-hover:text-muted"
              />
            )}
          </span>
        )}
      </div>

      {/* category + tier · score + rating */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {category && (
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted">
              {category}
            </span>
          )}
          <Badge tone={tier}>{TIER_LABEL[tier]}</Badge>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="font-display text-2xl font-bold leading-none tabular-nums"
            style={{ color: TIER_COLOR[tier] }}
          >
            {lead.score ?? "—"}
          </div>
          {lead.rating != null && (
            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
              <MdStar size={13} className="text-warm" />
              <span className="tabular-nums">
                {lead.rating}
                {lead.reviewsCount != null ? ` · ${lead.reviewsCount}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* info rows */}
      <div className="mt-5 space-y-2.5">
        {lead.phone && <InfoRow icon={<MdOutlineCall size={16} />}>{lead.phone}</InfoRow>}
        <InfoRow icon={<MdOutlinePlace size={16} />}>
          <span className="inline-flex items-center gap-2">
            <span className="truncate">
              {lead.city ? `${lead.city}, ${country}` : country}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                hasSite
                  ? "bg-brand-soft text-brand"
                  : "border border-hot/30 bg-hot/10 text-hot"
              }`}
            >
              {hasSite ? "Tem site" : "Sem site"}
            </span>
          </span>
        </InfoRow>
        {noSite && (
          <div className="flex items-center gap-2.5 text-xs italic text-warm">
            <MdOutlineLightbulb size={16} className="shrink-0" />
            Sem site — venda do zero
          </div>
        )}
        {lead.address && (
          <InfoRow icon={<MdOutlineHome size={16} />}>
            <span className="text-xs text-muted">{lead.address}</span>
          </InfoRow>
        )}
      </div>

      {/* compliance */}
      <div className="mt-5 border-t border-border pt-4">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
            lead.emailable ? "text-brand" : "text-faint"
          }`}
        >
          {lead.emailable ? <MdOutlineCheckCircle size={14} /> : <MdOutlineBlock size={14} />}
          {lead.emailable ? "Abordável por email" : "Fora do escopo compliant"}
        </span>
      </div>

      {/* actions (full width) */}
      <div className="mt-3 flex items-stretch gap-2.5">
        {action && (
          <span className="flex-1" onClick={(e) => e.stopPropagation()}>
            {action}
          </span>
        )}
        {hasSite && (
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={lead.website}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <MdOutlineLanguage size={16} />
            Site atual
          </a>
        )}
      </div>
    </div>
  );
}
