"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MdCheck, MdOutlineEventAvailable } from "react-icons/md";
import { nextActionOf, dateInputToTimestamp, toDateInputValue } from "@convex/lib/domain";
import { ActionStatusText } from "./next-action-line";
import { useNow } from "@/lib/use-now";

const fieldCls =
  "rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Próxima ação do lead (aba Informações). Data local (o valor do input passa por
 * dateInputToTimestamp: nunca `new Date(string)`), texto, Salvar e Concluir. Com `autoFocus`,
 * o texto recebe foco ao montar (a faixa Hoje abre o lead assim depois de "Feito").
 */
export function NextActionForm({ lead, autoFocus = false }: { lead: Doc<"leads">; autoFocus?: boolean }) {
  const now = useNow();
  const setNextAction = useMutation(api.leads.setNextAction);
  const clearNextAction = useMutation(api.leads.clearNextAction);
  const action = nextActionOf(lead);
  const [date, setDate] = useState(() => toDateInputValue(action ? action.at : now));
  const [note, setNote] = useState(action?.note ?? "");
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(kind: "save" | "clear", fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      const at = dateInputToTimestamp(date);
      if (at === null) throw new Error("Escolha uma data");
      await setNextAction({ id: lead._id, at, note });
    });

  const clear = () =>
    run("clear", async () => {
      await clearNextAction({ id: lead._id });
      setNote("");
      setDate(toDateInputValue(now)); // senão a próxima nasce na data da ação antiga, já atrasada
    });

  return (
    <section className="rounded-xl bg-surface-2 p-4">
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Próxima ação</h3>
      {action ? (
        <ActionStatusText action={action} now={now} />
      ) : (
        <p className="text-[11px] text-faint">Nenhuma ação marcada</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="block">
          <span className="sr-only">Data</span>
          <input
            type="date"
            value={date}
            min={toDateInputValue(now)}
            onChange={(e) => setDate(e.target.value)}
            className={fieldCls}
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="sr-only">O que fazer</span>
          <input
            autoFocus={autoFocus}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="O que fazer? (ligar de novo, mandar proposta…)"
            className={`${fieldCls} w-full`}
          />
        </label>
        <button
          onClick={() => void save()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] hover:bg-brand-hover disabled:opacity-60"
        >
          <MdOutlineEventAvailable size={16} />
          {busy === "save" ? "Salvando…" : "Salvar"}
        </button>
        {action && (
          <button
            onClick={() => void clear()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-solid disabled:opacity-60"
          >
            <MdCheck size={16} />
            Concluir
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </section>
  );
}
