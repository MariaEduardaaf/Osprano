import type { Doc } from "@convex/_generated/dataModel";
import {
  nextActionOf,
  actionStatus,
  daysBetween,
  formatDay,
  isStalled,
  stalledDays,
  type ActionStatus,
  type NextAction,
} from "@convex/lib/domain";

/** Tabela 2.2 da spec: atrasada em --hot, hoje em --warm, futura em --faint. */
const ACTION_COLOR: Record<ActionStatus, string> = {
  overdue: "var(--hot)",
  today: "var(--warm)",
  upcoming: "var(--faint)",
};

export function daysAgoLabel(days: number): string {
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** "↺ ligar de novo · há 2 dias" / "· hoje" / "· 23 set", na cor do status. */
export function ActionStatusText({
  action,
  now,
  className = "",
}: {
  action: NextAction;
  now: number;
  className?: string;
}) {
  const status = actionStatus(action.at, now);
  const when = status === "overdue" ? daysAgoLabel(daysBetween(action.at, now)) : formatDay(action.at, now);
  return (
    <p className={`truncate text-[11px] font-medium ${className}`} style={{ color: ACTION_COLOR[status] }}>
      <span aria-hidden>↺ </span>
      {action.note} · {when}
    </p>
  );
}

/**
 * Linha do card do Kanban: a ação vigente; sem ação e parado há 7+ dias, "parado há N dias";
 * senão nada. Convertido e Perdido nunca mostram "parado" (stalledDays garante).
 */
export function CardActionLine({ lead, now }: { lead: Doc<"leads">; now: number }) {
  const action = nextActionOf(lead);
  if (action) return <ActionStatusText action={action} now={now} className="mt-1" />;
  if (isStalled(lead, now)) {
    return <p className="mt-1 text-[11px] italic text-faint">parado {daysAgoLabel(stalledDays(lead, now) ?? 0)}</p>;
  }
  return null;
}
