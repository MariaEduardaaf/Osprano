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
import { PT_PT, langForLead } from "@convex/lib/outreachAi";

/**
 * Nome do idioma em PORTUGUÊS — é só RÓTULO DE UI, para a usuária brasileira ler.
 * Nunca vai para o modelo (quem manda no idioma do prompt é `langForLead`, em
 * convex/lib/outreachAi.ts). As chaves são exatamente os valores que `langForLead`
 * devolve, para que um idioma novo no backend apareça aqui como "sem rótulo" em
 * vez de rotulado errado.
 */
const LANGUAGE_LABEL_PT: Record<string, string> = {
  English: "inglês",
  Dutch: "holandês",
  Swedish: "sueco",
  Norwegian: "norueguês",
  Spanish: "espanhol",
  Italian: "italiano",
  German: "alemão",
  French: "francês",
  Danish: "dinamarquês",
  [PT_PT]: "português",
};

/**
 * Em que idioma o script sai, em pt-BR. NÃO reimplementa a regra: chama o mesmo
 * `langForLead` que o backend usa para escrever o script (é ele quem consulta a
 * cidade na Suíça — Genebra → French, Lugano → Italian, cidade desconhecida →
 * German — e o país em todos os outros mercados). Aqui só se traduz o nome do
 * idioma para pt-BR. null = sem país em mãos ou idioma sem rótulo: melhor não
 * rotular do que rotular errado.
 */
export function scriptLanguageLabel(countryCode?: string, city?: string | null): string | null {
  if (!countryCode) return null;
  const label: string | undefined = LANGUAGE_LABEL_PT[langForLead({ countryCode, city })];
  return label ?? null;
}

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
 *
 * O idioma do script é EXIBIDO porque a Suíça é multilíngue: duas cidades do mesmo
 * país geram idiomas diferentes, e quem liga não fala nenhum deles. `countryCode` e
 * `city` são opcionais para não quebrar quem ainda não passa (o painel só omite o
 * rótulo nesse caso) — passe-os sempre que o lead estiver em mãos.
 */
export function CallScriptPanel({
  leadId,
  phone,
  countryCode,
  city,
  initialScript,
  initialTranslation,
}: {
  leadId: Id<"leads">;
  phone?: string;
  countryCode?: string;
  city?: string | null;
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

  // Idioma do prospect, pela mesma regra do backend. No cabeçalho ele aparece ANTES
  // de gerar (ela já sabe o que vai sair); na coluna, colado ao texto que vai ler.
  const language = scriptLanguageLabel(countryCode, city);

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface-2 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <MdOutlineDescription size={14} />
          Script de ligação
          {language && (
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
              idioma: {language}
            </span>
          )}
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
          <ScriptColumn label={language ? `Script (${language})` : "Script"} text={script} />
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
