"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MdDeleteOutline } from "react-icons/md";

/**
 * Botão "Excluir" do lead: confirma com a usuária, chama `leads.remove` (que apaga
 * preview, fotos, histórico e outreach em cascata) e some da lista na hora — optimistic
 * update em `api.leads.list`, o mesmo padrão do `setStage` no Kanban.
 */
export function DeleteLeadButton({
  lead,
  onDeleted,
  size = 16,
  className,
}: {
  lead: Pick<Doc<"leads">, "_id" | "name">;
  /** Fecha o drawer quando o lead apagado é o que está aberto. */
  onDeleted?: () => void;
  size?: number;
  className?: string;
}) {
  const remove = useMutation(api.leads.remove).withOptimisticUpdate((store, { id }) => {
    const cur = store.getQuery(api.leads.list, {});
    if (!cur) return;
    store.setQuery(
      api.leads.list,
      {},
      cur.filter((l) => l._id !== id),
    );
  });

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !window.confirm(`Excluir ${lead.name}? Apaga preview, fotos e histórico. Não dá pra desfazer.`)
    )
      return;
    await remove({ id: lead._id });
    onDeleted?.();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Excluir ${lead.name}`}
      title="Excluir"
      className={
        className ??
        "inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:text-danger"
      }
    >
      <MdDeleteOutline size={size} />
    </button>
  );
}
