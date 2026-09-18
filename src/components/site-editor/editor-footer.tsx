"use client";

import { MdArrowBack, MdOpenInNew } from "react-icons/md";
import type { Id } from "@convex/_generated/dataModel";
import { PublishButton } from "@/components/publish-button";

/**
 * Rodapé do editor (spec 3.1): `sticky bottom-4` DENTRO do `<main>` da área
 * logada, que é quem rola (`fixed` cobriria o rail). Salvar desabilitado sem
 * mudança; "Salvo" por 2 s; erro do servidor ao lado, estado mantido pelo pai.
 * Abrir preview é link direto: o token existe desde o `generate` do mount.
 */
export function EditorFooter({
  leadId,
  token,
  slug,
  published,
  dirty,
  saving,
  status,
  error,
  onSave,
  onBack,
}: {
  leadId: Id<"leads">;
  token: string;
  slug: string | null;
  published: boolean;
  dirty: boolean;
  saving: boolean;
  status: "idle" | "saved";
  error: string | null;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="glass-dense sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2"
      >
        <MdArrowBack size={16} />
        Voltar
      </button>

      <div className="min-w-0 flex-1 text-xs">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : status === "saved" ? (
          <span className="font-semibold text-brand">Salvo</span>
        ) : published ? (
          <span className="text-muted">Publicado: salvar altera o site no ar</span>
        ) : dirty ? (
          <span className="text-muted">Alterações não salvas</span>
        ) : null}
      </div>

      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold hover:bg-surface-2"
      >
        Abrir preview <MdOpenInNew size={14} />
      </a>
      <PublishButton leadId={leadId} slug={slug} />
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
