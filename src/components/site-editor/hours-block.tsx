"use client";

import type { SiteContent, Weekday } from "@convex/lib/site";
import { DEFAULT_CLOSE, DEFAULT_OPEN, hoursRows } from "@/lib/site-editor";
import { Block, inputCls } from "./fields";

/**
 * Bloco Horário (spec 3.1): 7 linhas, seg a dom, cada uma "Fechado" ou
 * abre/fecha. `<input type="time">` entrega "HH:MM", o formato que o servidor
 * exige. Abrir um dia sugere 09:00 a 18:00; ela ajusta e nada sai sem Salvar.
 */
export function HoursBlock({
  draft,
  onDay,
}: {
  draft: SiteContent;
  onDay: (day: Weekday, range: { open: string; close: string } | null) => void;
}) {
  const rows = hoursRows(draft);
  const any = rows.some((r) => !r.closed);
  return (
    <Block title="Horário" hint={any ? undefined : "Sem horário a seção não aparece"}>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.day} className="grid grid-cols-[44px_84px_1fr_1fr] items-center gap-2 text-sm">
            <span className="font-semibold">{r.label}</span>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={!r.closed}
                onChange={(e) =>
                  onDay(r.day, e.target.checked ? { open: DEFAULT_OPEN, close: DEFAULT_CLOSE } : null)
                }
                className="accent-brand"
              />
              {r.closed ? "Fechado" : "Aberto"}
            </label>
            <input
              type="time"
              value={r.open}
              disabled={r.closed}
              aria-label={`${r.label}: abre`}
              onChange={(e) => onDay(r.day, { open: e.target.value, close: r.close })}
              className={`${inputCls} py-1 disabled:opacity-40`}
            />
            <input
              type="time"
              value={r.close}
              disabled={r.closed}
              aria-label={`${r.label}: fecha`}
              onChange={(e) => onDay(r.day, { open: r.open, close: e.target.value })}
              className={`${inputCls} py-1 disabled:opacity-40`}
            />
          </div>
        ))}
      </div>
    </Block>
  );
}
