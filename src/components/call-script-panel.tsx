"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  MdOutlineDescription,
  MdOutlineAutoAwesome,
  MdOutlineContentCopy,
  MdOutlineCheck,
  MdExpandLess,
  MdOutlineWarningAmber,
  MdOutlineInfo,
} from "react-icons/md";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  PT_PT,
  NAME_PLACEHOLDER,
  langForLead,
  detectLocalityClaims,
} from "@convex/lib/outreachAi";
import type { OutreachWarning } from "@convex/lib/outreachAi";

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

/** Caixa de aviso. `tone="warn"` = há algo ERRADO no texto que ela vai ler em voz alta;
    `tone="info"` = contexto sobre como o texto foi gerado (não pede correção). */
function Note({ tone, children }: { tone: "warn" | "info"; children: ReactNode }) {
  const warn = tone === "warn";
  return (
    <div
      className={`flex items-start gap-1.5 rounded-md border p-2 text-[10px] leading-relaxed ${
        warn
          ? "border-warm/30 bg-warm/10 text-ink-soft"
          : "border-dashed border-border bg-surface-solid text-muted"
      }`}
    >
      {warn ? (
        <MdOutlineWarningAmber size={12} className="mt-0.5 shrink-0 text-warm" />
      ) : (
        <MdOutlineInfo size={12} className="mt-0.5 shrink-0 text-faint" />
      )}
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

/**
 * Avisos de honestidade ANTES do texto: ela lê o script EM VOZ ALTA num idioma que não fala,
 * então um "aquí en Valencia" só é corrigível aqui — depois de discar, já foi dito. Cada aviso
 * mostra o TRECHO literal (é o que ela procura no texto) e o porquê, em pt-BR.
 * O texto NUNCA é reescrito automaticamente: corrigir uma frase em idioma que ninguém do time
 * lê é pior que sinalizar (mesma decisão de `detectLocalityClaims`, em convex/lib/outreachAi.ts).
 */
function ScriptWarnings({
  warnings,
  needsName,
}: {
  warnings: OutreachWarning[];
  needsName: boolean;
}) {
  const locality = warnings.filter((w) => w.code === "locality-claim");
  const info = warnings.filter((w) => w.code !== "locality-claim");
  if (locality.length === 0 && info.length === 0 && !needsName) return null;

  return (
    <div className="space-y-1.5" role="status">
      {locality.map((w, i) => (
        <Note key={`loc-${i}`} tone="warn">
          <p className="font-semibold text-foreground">Revise antes de ligar</p>
          <p>{w.message}</p>
          {w.excerpt && (
            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface-solid px-1.5 py-1 font-mono text-[10px] text-ink-soft">
              “{w.excerpt}”
            </p>
          )}
        </Note>
      ))}
      {needsName && (
        <Note tone="warn">
          <p className="font-semibold text-foreground">Falta o seu nome</p>
          <p>
            O texto ainda tem o marcador{" "}
            <span className="font-mono">{NAME_PLACEHOLDER}</span> — troque pelo seu nome antes de
            discar. Ele fica em português no meio do idioma do prospect justamente para você não
            ler no automático.
          </p>
        </Note>
      )}
      {info.map((w, i) => (
        <Note key={`info-${i}`} tone="info">
          <p>{w.message}</p>
        </Note>
      ))}
    </div>
  );
}

function ScriptColumn({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-surface-solid p-2">
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
  // null = nada gerado NESTA sessão (o script na tela veio do banco, sem avisos junto).
  // Array (mesmo vazio) = veredito do backend, que é o autoritativo.
  const [warnings, setWarnings] = useState<OutreachWarning[] | null>(null);

  /**
   * Avisos do SCRIPT QUE ESTÁ NA TELA. Quando ela acabou de gerar, valem os do backend
   * (`warnings`), que sabem coisas que o texto não conta — ex.: `no-verified-signal`.
   * Quando o script veio persistido do lead (aba reaberta, outro dia), o backend não devolveu
   * nada: aí a MESMA função pura do backend (`detectLocalityClaims`) roda aqui sobre o texto,
   * senão um script antigo com "aquí en Valencia" apareceria limpo justo na hora de discar.
   * Sem `countryCode` não dá para saber o idioma do texto, e detectar com o idioma errado
   * dispara aviso à toa — nesse caso não se detecta nada (só a checagem do marcador de nome,
   * que independe de idioma, continua valendo).
   */
  const shownWarnings = useMemo<OutreachWarning[]>(() => {
    if (warnings) return warnings;
    if (!countryCode || !script.trim()) return [];
    const lang = langForLead({ countryCode, city });
    return [
      ...detectLocalityClaims(script, { lang, city, field: "script" }),
      ...detectLocalityClaims(translation, { lang: PT_PT, city, field: "translation" }),
    ];
  }, [warnings, countryCode, city, script, translation]);

  // O marcador de nome sai do backend em português no meio do idioma do prospect (ver
  // NAME_PLACEHOLDER): ela precisa trocar pelo nome real ANTES de discar, ou se apresenta
  // lendo "[seu nome]" em voz alta.
  const needsName = script.includes(NAME_PLACEHOLDER) || translation.includes(NAME_PLACEHOLDER);

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
            <span className="rounded-full border border-border bg-surface-solid px-2 py-0.5 text-[10px] font-semibold text-muted">
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
            setWarnings(result.warnings);
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

      {/* Antes das colunas de propósito: é o que ela precisa corrigir ANTES de ler o texto. */}
      {script && <ScriptWarnings warnings={shownWarnings} needsName={needsName} />}

      {script && (
        <div className="grid gap-2 md:grid-cols-2">
          <ScriptColumn label={language ? `Script (${language})` : "Script"} text={script} />
          {hasTranslation ? (
            <ScriptColumn label="Tradução (pt-BR)" text={translation} />
          ) : (
            <div className="flex items-start gap-1.5 rounded-md border border-dashed border-border bg-surface-solid p-2 text-[10px] leading-relaxed text-muted">
              <MdOutlineWarningAmber size={12} className="mt-0.5 shrink-0 text-warm" />
              <span>Tradução pt-BR indisponível — gere o script de novo.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
