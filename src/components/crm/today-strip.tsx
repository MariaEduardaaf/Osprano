"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MdCheck, MdKeyboardArrowDown } from "react-icons/md";
import { addDays, daysBetween, type ActionStatus, type NextAction } from "@convex/lib/domain";
import { daysAgoLabel } from "./next-action-line";

export interface TodayItem {
  lead: Doc<"leads">;
  action: NextAction;
  status: ActionStatus; // a página só manda "overdue" e "today"
}

const POSTPONE_DAYS = [1, 3, 7] as const;

/**
 * Faixa "Hoje": atrasadas (--hot) e de hoje, ordenadas por `at`. Some quando não há itens.
 * Recebe os itens prontos da página (calculados ANTES de busca/filtro/ordenação, com o `now`
 * de estado) e chama as duas mutations por conta própria.
 */
export function TodayStrip({
  items,
  now,
  onOpen,
}: {
  items: TodayItem[];
  now: number;
  onOpen: (leadId: Id<"leads">, opts?: { focusNextAction?: boolean }) => void;
}) {
  // adiar = setNextAction com addDays(at, n) e a mesma nota, otimista como o setStage do Kanban
  const setNextAction = useMutation(api.leads.setNextAction).withOptimisticUpdate(
    (store, { id, at, note }) => {
      const cur = store.getQuery(api.leads.list, {});
      if (!cur) return;
      store.setQuery(
        api.leads.list,
        {},
        cur.map((l) => (l._id === id ? { ...l, nextActionAt: at, nextActionNote: note } : l)),
      );
    },
  );
  const clearNextAction = useMutation(api.leads.clearNextAction);
  const [menuFor, setMenuFor] = useState<Id<"leads"> | null>(null);
  const [busy, setBusy] = useState<Id<"leads"> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (items.length === 0) return null;

  const overdue = items.filter((i) => i.status === "overdue");
  const today = items.filter((i) => i.status === "today");

  async function run(id: Id<"leads">, fn: () => Promise<void>) {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  // Feito: conclui e abre o detalhe com o campo em foco, para a próxima ser marcada na hora
  const done = (item: TodayItem) =>
    run(item.lead._id, async () => {
      await clearNextAction({ id: item.lead._id });
      onOpen(item.lead._id, { focusNextAction: true });
    });

  // Adiar uma ação de 5 dias atrás em 1 dia continua atrasada: esperado, ela vê e adia de novo
  const postpone = (item: TodayItem, days: number) => {
    setMenuFor(null);
    return run(item.lead._id, async () => {
      await setNextAction({ id: item.lead._id, at: addDays(item.action.at, days), note: item.action.note });
    });
  };

  const renderRow = (item: TodayItem) => {
    const id = item.lead._id;
    return (
      <li key={id} className="flex items-center gap-3 py-1.5 text-sm">
        <button onClick={() => onOpen(id)} className="shrink-0 truncate font-semibold hover:underline">
          {item.lead.name}
        </button>
        <span className="min-w-0 flex-1 truncate text-muted">{item.action.note}</span>
        {item.status === "overdue" && (
          <span className="shrink-0 text-xs font-medium text-hot">{daysAgoLabel(daysBetween(item.action.at, now))}</span>
        )}
        <button
          onClick={() => void done(item)}
          disabled={busy === id}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
        >
          <MdCheck size={14} />
          Feito
        </button>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuFor(menuFor === id ? null : id)}
            disabled={busy === id}
            aria-haspopup="menu"
            aria-expanded={menuFor === id}
            className="inline-flex items-center gap-0.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-50"
          >
            Adiar
            <MdKeyboardArrowDown size={14} />
          </button>
          {menuFor === id && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-border bg-surface-solid shadow-[var(--shadow-md)]"
            >
              {POSTPONE_DAYS.map((n) => (
                <button
                  key={n}
                  role="menuitem"
                  onClick={() => void postpone(item, n)}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-surface-2"
                >
                  {n === 1 ? "1 dia" : `${n} dias`}
                </button>
              ))}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <section aria-label="Hoje" className="glass mb-4 rounded-xl px-4 py-3">
      {overdue.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hot">Atrasadas</h2>
          <ul className="divide-y divide-border/60">{overdue.map(renderRow)}</ul>
        </div>
      )}
      {today.length > 0 && (
        <div className={overdue.length > 0 ? "mt-3" : ""}>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-warm">Hoje</h2>
          <ul className="divide-y divide-border/60">{today.map(renderRow)}</ul>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </section>
  );
}
