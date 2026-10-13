"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { stripOptOutFooter } from "@convex/lib/compliance";
import { composeLinks } from "@/lib/compose-links";
import { errorMessage } from "@/lib/errors";
import { AiQuotaNotice, useAiBlocked } from "@/components/ai-quota";

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
          <p className="font-semibold text-foreground">Falta o seu nome, não envie assim</p>
          <p>
            O texto ainda tem o marcador <span className="font-mono">{NAME_PLACEHOLDER}</span>.
            Troque pelo seu nome antes de enviar; o Osprano recusa preparar o envio com o
            marcador.
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
export function OutreachComposer({ leadId }: { leadId: Id<"leads">; hasEmail?: boolean }) {
  const existing = useQuery(api.outreach.getForLead, { leadId });
  const sender = useQuery(api.sender.get);
  return (
    <ComposerBody
      key={existing === undefined ? "loading" : "loaded"}
      leadId={leadId}
      existing={existing ?? null}
      senderReady={sender === undefined ? null : sender !== null}
    />
  );
}

function ComposerBody({
  leadId,
  existing,
  senderReady,
}: {
  leadId: Id<"leads">;
  existing: Doc<"outreach"> | null;
  senderReady: boolean | null; // null = carregando
}) {
  const draft = useAction(api.outreach.draft);
  const prepareSend = useMutation(api.outreach.prepareSend);
  const markSent = useMutation(api.outreach.markSent);
  // O lead (país + cidade) é o que permite RECALCULAR os avisos aqui no cliente — sem ele
  // um rascunho vindo do banco apareceria limpo. Vem por query e não por prop porque este
  // componente já se vira sozinho com o `leadId` (mesmo padrão de `outreach.getForLead`).
  const lead = useQuery(api.leads.get, { id: leadId });
  const aiBlocked = useAiBlocked();

  const hasDraft = !!(existing && (existing.subject || existing.body));
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [body, setBody] = useState(stripOptOutFooter(existing?.body ?? ""));
  const [open, setOpen] = useState(hasDraft); // pré-preenchido, sem gastar IA
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Versão final devolvida pelo servidor (com rodapé). Editar assunto/corpo a descarta.
  const [ready, setReady] = useState<{ to: string; subject: string; body: string } | null>(null);
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
        {senderReady === false && <SenderNotice />}
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
          disabled={busy === "draft" || aiBlocked || senderReady !== true}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
        >
          <MdOutlineAutoAwesome size={14} />
          {busy === "draft" ? "Escrevendo…" : "Escrever com IA"}
        </button>
        <AiQuotaNotice className="mt-1.5" />
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
      {senderReady === false && <SenderNotice />}
      {/* Destinatário, acima do assunto: ela precisa ver PARA QUEM antes de mexer no texto.
          Vem do `lead` reativo (não do prop `hasEmail`) para nunca ficar desatualizado
          quando o email é preenchido em Informações > Contato com o composer já aberto. */}
      {lead?.email ? (
        <p className="text-xs text-muted">
          Para: <span className="font-medium text-foreground">{lead.email}</span>
        </p>
      ) : (
        <p className="text-xs text-warm">Sem e-mail do lead: preencha em Informações &gt; Contato</p>
      )}
      <input
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setReady(null);
        }}
        placeholder="Assunto"
        className="w-full rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm font-medium"
      />
      {/* Colado no texto que ela vai mandar, e ANTES dele: é o que precisa ser corrigido
          antes de qualquer um dos botões abaixo. */}
      <EmailWarnings warnings={shownWarnings} needsName={needsName} />
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setReady(null);
        }}
        rows={7}
        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm"
      />
      <Note tone="info">
        <p>
          Ao clicar em Enviar, o Osprano confere se este contato pode receber e-mail e acrescenta o
          rodapé de descadastro com seus dados e a fonte do contato. O Osprano não envia nada: a
          mensagem sai do seu e-mail.
        </p>
      </Note>
      {ready === null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              run("prepare", async () => {
                const r = await prepareSend({ leadId, subject, body });
                setSubject(r.subject);
                setReady(r);
              })
            }
            disabled={!lead?.email || senderReady !== true || busy === "prepare"}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
          >
            <MdOutlineSend size={14} />
            {busy === "prepare" ? "Preparando…" : "Enviar"}
          </button>
        </div>
      ) : (
        <ReadyBlock
          ready={ready}
          busy={busy}
          onCopy={() =>
            run("copy", async () => {
              await navigator.clipboard.writeText(`${ready.subject}\n\n${ready.body}`);
              setMsg(`Copiado. Cole no seu e-mail e envie para ${ready.to}.`);
            })
          }
          onMark={() =>
            run("mark", async () => {
              await markSent({ leadId });
              setMsg("Marcada como enviada e registrada no Histórico.");
            })
          }
          onBack={() => setReady(null)}
        />
      )}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}

function SenderNotice() {
  return (
    <Note tone="stop">
      <p>
        Complete seu perfil de remetente (nome, empresa, endereço e e-mail de resposta) para
        escrever e enviar.
      </p>
      <Link href="/settings" className="font-semibold underline">
        Abrir Ajustes &gt; Remetente
      </Link>
    </Note>
  );
}

const linkBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50";

/** Mensagem final do servidor + formas de abrir no e-mail do cliente. Abrir/copiar não marca nada. */
function ReadyBlock({
  ready,
  busy,
  onCopy,
  onMark,
  onBack,
}: {
  ready: { to: string; subject: string; body: string };
  busy: string | null;
  onCopy: () => void;
  onMark: () => void;
  onBack: () => void;
}) {
  const links = composeLinks(ready);
  const targets = [
    { label: "Abrir no Gmail", href: links.gmail, external: true },
    { label: "Abrir no Outlook", href: links.outlook, external: true },
    { label: "App de e-mail", href: links.mailto, external: false },
  ];
  const off = targets.filter((t) => t.href === null).map((t) => t.label.replace("Abrir no ", ""));
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-surface-solid p-2">
        <p className="text-xs text-muted">
          Pronta para enviar para <span className="font-medium text-foreground">{ready.to}</span>
        </p>
        <p className="mt-1 text-sm font-bold">{ready.subject}</p>
        <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm">{ready.body}</pre>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {targets.map((t) =>
          t.href ? (
            <a
              key={t.label}
              href={t.href}
              {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={linkBtn}
            >
              {t.label}
            </a>
          ) : (
            <button key={t.label} disabled className={linkBtn}>
              {t.label}
            </button>
          ),
        )}
        <button onClick={onCopy} disabled={busy === "copy"} className={linkBtn}>
          <MdOutlineContentCopy size={14} />
          Copiar
        </button>
      </div>
      {off.length > 0 && (
        <Note tone="warn">
          <p>
            Mensagem longa demais para abrir direto em {off.join(", ")}. Use Copiar e cole no seu
            e-mail.
          </p>
        </Note>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onMark}
          disabled={busy === "mark"}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
        >
          <MdOutlineCheck size={14} />
          Marquei como enviada
        </button>
        <button onClick={onBack} className={linkBtn}>
          Voltar a editar
        </button>
      </div>
    </div>
  );
}
