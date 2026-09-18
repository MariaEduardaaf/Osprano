"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  MdOutlineAutoAwesome,
  MdOutlineContentCopy,
  MdOutlineCheck,
  MdOutlineSend,
  MdOutlineWarningAmber,
  MdOutlineInfo,
  MdOutlineErrorOutline,
} from "react-icons/md";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Doc } from "@convex/_generated/dataModel";
import { NAME_PLACEHOLDER, langForLead, detectLocalityClaims } from "@convex/lib/outreachAi";
import type { OutreachWarning } from "@convex/lib/outreachAi";
import { errorMessage } from "@/lib/errors";

/**
 * Caixa de aviso — MESMO formato visual do painel de script (componente `Note` em
 * src/components/call-script-panel.tsx): as mesmas classes, os mesmos tons, os mesmos ícones.
 * A usuária não pode ter que reaprender o que é um aviso ao trocar da aba Ligação para o email.
 * Está duplicado (e não importado) porque lá o componente é interno ao arquivo; extrair os dois
 * para um módulo compartilhado é o passo seguinte e não muda uma classe sequer.
 *
 * Um tom A MAIS que o painel de script, e é a diferença que importa aqui:
 *   • "stop" → defeito CERTO no texto, a um clique do envio (marcador `[seu nome]`);
 *   • "warn" → possível afirmação falsa, precisa de leitura humana (alegação de localidade);
 *   • "info" → contexto de como o texto foi gerado, não pede correção.
 */
function Note({ tone, children }: { tone: "stop" | "warn" | "info"; children: ReactNode }) {
  const box =
    tone === "stop"
      ? "border-danger/40 bg-danger/10 text-ink-soft"
      : tone === "warn"
        ? "border-warm/30 bg-warm/10 text-ink-soft"
        : "border-dashed border-border bg-surface-solid text-muted";
  return (
    <div
      className={`flex items-start gap-1.5 rounded-md border p-2 text-[10px] leading-relaxed ${box}`}
    >
      {tone === "stop" && (
        <MdOutlineErrorOutline size={12} className="mt-0.5 shrink-0 text-danger" />
      )}
      {tone === "warn" && <MdOutlineWarningAmber size={12} className="mt-0.5 shrink-0 text-warm" />}
      {tone === "info" && <MdOutlineInfo size={12} className="mt-0.5 shrink-0 text-faint" />}
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

/**
 * Avisos de honestidade ACIMA do corpo do email — o texto que ela está prestes a mandar.
 *
 * Mesmo conteúdo do painel de ligação, ORDEM diferente de propósito: no script o marcador de
 * nome vem depois (ela ainda vai ler o texto em voz alta e esbarra nele); no email o marcador
 * abre a lista, porque entre ver o texto e ele chegar no prospect existe um clique só.
 * Cada aviso mostra o TRECHO literal e o porquê em pt-BR; o texto NUNCA é reescrito
 * automaticamente (mesma decisão de `detectLocalityClaims`, em convex/lib/outreachAi.ts).
 */
function EmailWarnings({
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
      {needsName && (
        <Note tone="stop">
          <p className="font-semibold text-foreground">Falta o seu nome — não envie assim</p>
          <p>
            O texto ainda tem o marcador <span className="font-mono">{NAME_PLACEHOLDER}</span> —
            troque pelo seu nome antes de enviar. Ele fica em português no meio do idioma do
            prospect justamente para você não passar batido. Enviar por aqui é um clique: o
            prospect receberia o marcador literal.
          </p>
        </Note>
      )}
      {locality.map((w, i) => (
        <Note key={`loc-${i}`} tone="warn">
          <p className="font-semibold text-foreground">Revise antes de enviar</p>
          <p>{w.message}</p>
          {w.excerpt && (
            <p className="whitespace-pre-wrap break-words rounded border border-warm/30 bg-surface-solid px-1.5 py-1 font-mono text-[10px] text-ink-soft">
              “{w.excerpt}”
            </p>
          )}
        </Note>
      ))}
      {info.map((w, i) => (
        <Note key={`info-${i}`} tone="info">
          <p>{w.message}</p>
        </Note>
      ))}
    </div>
  );
}

/**
 * Wrapper: busca o rascunho salvo (getForLead) e monta o corpo do composer só depois
 * que a query resolve, trocando a `key` de "loading" para "loaded" — o padrão oficial
 * do React para inicializar estado uma única vez a partir de dado assíncrono
 * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
 * sem useEffect+setState (react-hooks/set-state-in-effect) nem leitura de ref durante
 * o render (react-hooks/refs) — ambos proibidos pelo React Compiler deste projeto.
 * A troca de key acontece uma única vez (quando a query deixa de ser `undefined`),
 * então digitação do usuário nunca é sobrescrita depois da hidratação inicial.
 */
export function OutreachComposer({ leadId, hasEmail }: { leadId: Id<"leads">; hasEmail: boolean }) {
  const existing = useQuery(api.outreach.getForLead, { leadId });
  return (
    <ComposerBody
      key={existing === undefined ? "loading" : "loaded"}
      leadId={leadId}
      hasEmail={hasEmail}
      existing={existing ?? null}
    />
  );
}

function ComposerBody({
  leadId,
  hasEmail,
  existing,
}: {
  leadId: Id<"leads">;
  hasEmail: boolean;
  existing: Doc<"outreach"> | null;
}) {
  const draft = useAction(api.outreach.draft);
  const send = useAction(api.outreach.send);
  const markSent = useMutation(api.outreach.markSent);
  const updateDraft = useMutation(api.outreach.updateDraft);
  // O lead (país + cidade) é o que permite RECALCULAR os avisos aqui no cliente — sem ele
  // um rascunho vindo do banco apareceria limpo. Vem por query e não por prop porque este
  // componente já se vira sozinho com o `leadId` (mesmo padrão de `outreach.getForLead`).
  const lead = useQuery(api.leads.get, { id: leadId });

  const hasDraft = !!(existing && (existing.subject || existing.body));
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [open, setOpen] = useState(hasDraft); // pré-preenchido, sem gastar IA
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // null = nada gerado NESTA sessão (o rascunho na tela veio do banco, sem avisos junto).
  // Array (mesmo vazio) = veredito do backend para o texto recém-gerado.
  const [generatedWarnings, setGeneratedWarnings] = useState<OutreachWarning[] | null>(null);

  /**
   * Avisos do TEXTO QUE ESTÁ NA TELA — não do texto que o backend devolveu um dia.
   *
   * A alegação de localidade é recalculada no cliente pela MESMA função pura do backend
   * (`detectLocalityClaims`, com o idioma de `langForLead`), por dois motivos: (a) rascunho
   * carregado do banco (drawer reaberto outro dia) não traz aviso nenhum junto, e é justamente
   * o caminho em que ela clica "Enviar" sem ter visto o texto ser gerado; (b) ela EDITA o corpo
   * à mão — o veredito do backend vira sobre um texto que não existe mais, e tanto sumir com o
   * aviso (ela acha que está limpo) quanto mantê-lo (ela já corrigiu) mentem. Mesma entrada,
   * mesma função ⇒ para o texto intocado o resultado é idêntico ao do backend.
   *
   * Os avisos que NÃO saem do texto (`no-verified-signal`, que depende de como a mensagem foi
   * escrita) continuam vindo do backend — o cliente não tem como redescobri-los. Enquanto o
   * lead não chega, mostra-se o veredito do backend inteiro: um aviso desatualizado por meio
   * segundo é melhor que uma tela limpa.
   */
  const shownWarnings = useMemo<OutreachWarning[]>(() => {
    if (!lead) return generatedWarnings ?? [];
    const lang = langForLead(lead);
    return [
      ...detectLocalityClaims(subject, { lang, city: lead.city, field: "subject" }),
      ...detectLocalityClaims(body, { lang, city: lead.city, field: "body" }),
      ...(generatedWarnings ?? []).filter((w) => w.code !== "locality-claim"),
    ];
  }, [lead, generatedWarnings, subject, body]);

  // Marcador de nome: checagem literal, independente de idioma — por isso vale sempre, inclusive
  // depois de ela editar o texto ou apagar/reintroduzir o marcador na mão.
  const needsName = subject.includes(NAME_PLACEHOLDER) || body.includes(NAME_PLACEHOLDER);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(errorMessage(e, "Falha"));
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() =>
            run("draft", async () => {
              const r = await draft({ leadId });
              setSubject(r.subject);
              setBody(r.body);
              // Os avisos vêm junto do texto e não podem ser descartados aqui: é o que sobrou
              // do que o prompt não conseguiu impedir (ver a trava em convex/lib/outreachAi.ts).
              setGeneratedWarnings(r.warnings);
              setOpen(true);
            })
          }
          disabled={busy === "draft"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
        >
          <MdOutlineAutoAwesome size={14} />
          {busy === "draft" ? "Escrevendo…" : "Escrever com IA"}
        </button>
        {/* O composer só abre (`setOpen(true)`) quando `draft` dá certo — um erro aqui
            (ex.: ANTHROPIC_API_KEY ausente) nunca chega a `open`, e `msg` teria que
            renderizar dentro do bloco expandido, que não existe ainda. Sem isto o clique
            falhava em silêncio: o botão só voltava a "Escrever com IA", sem explicar por quê. */}
        {msg && <p className="mt-1.5 text-xs text-danger">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Assunto"
        className="w-full rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm font-medium"
      />
      {/* Colado no texto que ela vai mandar, e ANTES dele: é o que precisa ser corrigido
          antes de qualquer um dos botões abaixo. */}
      <EmailWarnings warnings={shownWarnings} needsName={needsName} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            run("copy", async () => {
              // `updateDraft` re-garante o rodapé de opt-out e devolve o par normalizado —
              // copiar o `body` local (o que a IA gerou, sem o rodapé injetado no `draft`)
              // era exatamente o defeito de compliance: aguarda o servidor ANTES de escrever
              // no clipboard, e atualiza o textarea para mostrar o texto que foi de fato copiado.
              const normalized = await updateDraft({ leadId, subject, body });
              setSubject(normalized.subject);
              setBody(normalized.body);
              await navigator.clipboard.writeText(`${normalized.subject}\n\n${normalized.body}`);
              setMsg("Copiado — envie do seu email.");
            })
          }
          disabled={busy === "copy"}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50"
        >
          <MdOutlineContentCopy size={14} />
          Copiar
        </button>
        <button
          onClick={() => run("mark", async () => {
            const normalized = await updateDraft({ leadId, subject, body });
            setSubject(normalized.subject);
            setBody(normalized.body);
            await markSent({ leadId });
            setMsg("Marcado como enviado.");
          })}
          disabled={busy === "mark"}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50"
        >
          <MdOutlineCheck size={14} />
          Marcar enviado
        </button>
        {hasEmail && (
          <button
            onClick={() => run("send", async () => {
              // ÚLTIMA trava antes de um envio IRREVERSÍVEL, e só para o defeito DETERMINÍSTICO:
              // `[seu nome]` literal no texto nunca é intencional. Confirma, não bloqueia — ela
              // pode seguir. A alegação de localidade NÃO entra aqui de propósito: é heurística
              // (regex por idioma) e pode dar falso positivo — travar o envio num palpite treina
              // a usuária a clicar "OK" no automático, e aí a trava não vale para nada.
              // Só neste botão: "Copiar" e "Marcar enviado" não mandam nada para ninguém.
              if (
                needsName &&
                !window.confirm(
                  `O email ainda tem o marcador ${NAME_PLACEHOLDER} no lugar do seu nome — ` +
                    `o prospect receberia esses caracteres literais.\n\nEnviar assim mesmo?`,
                )
              ) {
                setMsg(`Envio cancelado — troque ${NAME_PLACEHOLDER} pelo seu nome.`);
                return;
              }
              const normalized = await updateDraft({ leadId, subject, body });
              setSubject(normalized.subject);
              setBody(normalized.body);
              await send({ leadId });
              setMsg("Enviado via Resend.");
            })}
            disabled={busy === "send"}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
          >
            <MdOutlineSend size={14} />
            {busy === "send" ? "Enviando…" : "Enviar via Resend"}
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
