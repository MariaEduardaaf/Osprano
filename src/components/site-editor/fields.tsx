import type { ReactNode } from "react";

/** Campo dentro de vidro: sólido (regra do design system: `bg-surface-solid` em campos). */
export const inputCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/** Botão secundário pequeno dos blocos (adicionar item, enviar foto, remover). */
export const smallBtnCls =
  "inline-flex items-center gap-1 rounded-lg border border-border bg-surface-solid px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50";

/** Bloco do editor: vidro de primeiro nível (spec 3.1). O título segue o eyebrow do app. */
export function Block({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-xl p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">{title}</h2>
        {hint && <span className="text-right text-[11px] text-faint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Rótulo em cima do campo; `hint` à direita (limite, formato). O `<label>` envolve o campo: clicar no texto foca. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-[11px] text-muted">
        <span>{label}</span>
        {hint && <span className="text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
