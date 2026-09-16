"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";
import type { Doc } from "@convex/_generated/dataModel";
import { LOST_REASONS, type LostReason } from "@convex/lib/domain";

const fieldCls =
  "w-full rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong";

/**
 * Motivo de perda (Kanban e detalhe do lead). Chama `onConfirm`; se a promise rejeitar, mostra o
 * erro AQUI e fica aberto; só fecha quando ela resolve. Segue o CreateLeadModal (overlay, Esc
 * fecha, portal em z-[100], necessário porque abre por cima do drawer z-50) e acrescenta
 * role="dialog", aria-modal, aria-labelledby e foco inicial no primeiro rádio.
 *
 * Esc é tratado no onKeyDown do próprio dialog, com stopPropagation: o LeadDetail já fecha no
 * Esc via listener no window, e sem isso um Esc cancelaria o motivo e fecharia o lead junto.
 */
export function LostReasonModal({
  lead,
  onConfirm,
  onClose,
}: {
  lead: Doc<"leads">;
  onConfirm: (input: { reason: LostReason; note?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<LostReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ reason, note: note.trim() || undefined });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao marcar perdido");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="lost-reason-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="glass-dense relative z-10 w-full max-w-md rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hot">Perdido</div>
            <h2 id="lost-reason-title" className="font-display text-lg font-bold">
              Por que {lead.name} foi perdido?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
              Motivo
            </legend>
            <div className="space-y-1.5">
              {LOST_REASONS.map((r, i) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    reason === r.id
                      ? "border-brand bg-brand-soft text-foreground"
                      : "border-border text-muted hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="lost-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    autoFocus={i === 0}
                    className="accent-brand"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
              Nota (opcional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="O que ele disse, o que faltou…"
              className={`${fieldCls} resize-none`}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!reason || busy}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-danger-fg shadow-[var(--shadow-sm)] disabled:opacity-60"
          >
            {busy ? "Marcando…" : "Marcar perdido"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
