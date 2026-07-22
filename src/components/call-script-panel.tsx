"use client";

import { useState } from "react";
import {
  MdOutlineDescription,
  MdOutlineAutoAwesome,
  MdOutlineContentCopy,
  MdOutlineCheck,
  MdExpandLess,
  MdOutlineWarningAmber,
} from "react-icons/md";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-surface-2"
    >
      {copied ? <MdOutlineCheck size={12} /> : <MdOutlineContentCopy size={12} />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function ScriptColumn({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-faint">
          {label}
        </span>
        <CopyButton text={text} label={`Copiar ${label}`} />
      </div>
      <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

/**
 * OPTIN-03 — painel do script de ligação: gera via api.outreach.callScript e mostra
 * o script (idioma do mercado) e a tradução pt-BR lado a lado, cada um com copiar nativo.
 * Aproveita o que já está persistido no lead (callScript / callScriptPt) para não regenerar à toa.
 */
export function CallScriptPanel({
  leadId,
  phone,
  initialScript,
  initialTranslation,
}: {
  leadId: Id<"leads">;
  phone?: string;
  initialScript?: string;
  initialTranslation?: string;
}) {
  const generate = useAction(api.outreach.callScript);
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState<string>(initialScript ?? "");
  const [translation, setTranslation] = useState<string>(initialTranslation ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-[11px] font-semibold text-muted hover:bg-surface-2"
      >
        <MdOutlineDescription size={14} />
        Script de ligação
      </button>
    );
  }

  // A tradução pode vir vazia (fallback do modelo) ou idêntica ao script — nesses casos exibir
  // o texto estrangeiro rotulado como "Tradução (pt-BR)" seria mentira. Mostra um aviso.
  const hasTranslation =
    translation.trim().length > 0 && translation.trim() !== script.trim();

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface-2 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <MdOutlineDescription size={14} />
          Script de ligação
        </span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar script de ligação"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-surface"
        >
          <MdExpandLess size={12} />
          Fechar
        </button>
      </div>

      <button
        onClick={async () => {
          setMsg(null);
          if (!phone) {
            setMsg("Lead sem telefone.");
            return;
          }
          setBusy(true);
          try {
            const result = await generate({ leadId });
            setScript(result.script);
            setTranslation(result.translation);
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Falha ao gerar o script.");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg disabled:opacity-50"
      >
        <MdOutlineAutoAwesome size={13} />
        {busy ? "Gerando…" : script ? "Regenerar script" : "Gerar script"}
      </button>

      {msg && <p className="text-[10px] text-muted">{msg}</p>}

      {script && (
        <div className="grid gap-2 md:grid-cols-2">
          <ScriptColumn label="Script" text={script} />
          {hasTranslation ? (
            <ScriptColumn label="Tradução (pt-BR)" text={translation} />
          ) : (
            <div className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-surface p-2 text-[10px] leading-relaxed text-muted">
              <MdOutlineWarningAmber size={12} className="mt-0.5 shrink-0 text-warm" />
              <span>Tradução pt-BR indisponível — gere o script de novo.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
