"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { MdOutlineContentCopy, MdOutlineCheck, MdOpenInNew, MdOutlineInfo } from "react-icons/md";
import { socialLinks } from "@/lib/lead-links";
import { dmMessage } from "@/lib/dm-template";
import { errorMessage } from "@/lib/errors";
import { NAME_PLACEHOLDER } from "@convex/lib/outreachAi";
import { CONFIRM_NAME_MESSAGE, isGoogleLead, shareableName } from "@convex/lib/googleData";

const SIGNATURE_KEY = "osprano.dmSignature";

/** Lê a assinatura lembrada; localStorage pode faltar (aba privada, storage bloqueado). */
function readSignature(fallback: string): string {
  try {
    return localStorage.getItem(SIGNATURE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

function writeSignature(value: string): void {
  try {
    localStorage.setItem(SIGNATURE_KEY, value);
  } catch {
    /* localStorage indisponível — ok, só não lembra da próxima vez */
  }
}

type Channel = "instagram" | "facebook";

/**
 * Aba Abordagem, canal DM: mensagem pronta (src/lib/dm-template.ts) para copiar e mandar
 * pelo Instagram/Facebook do lead — o canal de quem não tem email, que é a maioria dos
 * leads sem site (spec abordagem-por-dm). Sem gate de compliance: markDm não é cold email.
 */
export function DmComposer({ lead }: { lead: Doc<"leads"> }) {
  const sender = useQuery(api.sender.get);
  const name = shareableName(lead);
  if (!name) {
    return (
      <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
        {CONFIRM_NAME_MESSAGE} Use a aba Informações.
      </p>
    );
  }
  // Espera a query: a assinatura inicial vem do perfil e o estado só inicializa uma vez.
  if (sender === undefined) return null;
  return <DmComposerBody lead={lead} name={name} defaultSignature={sender?.name ?? NAME_PLACEHOLDER} noProfile={sender === null} />;
}

function DmComposerBody({
  lead,
  name,
  defaultSignature,
  noProfile,
}: {
  lead: Doc<"leads">;
  name: string;
  defaultSignature: string;
  noProfile: boolean;
}) {
  const markDm = useMutation(api.outreach.markDm);
  const { instagram, facebook } = socialLinks(lead);
  // Nota e avaliações do Google nunca entram na mensagem.
  const google = isGoogleLead(lead);
  const dmLead = {
    ...lead,
    name,
    rating: google ? undefined : lead.rating,
    reviewsCount: google ? undefined : lead.reviewsCount,
  };

  const [signature, setSignature] = useState(() => readSignature(defaultSignature));
  const [touched, setTouched] = useState(false);
  const [body, setBody] = useState(() => dmMessage(dmLead, { signature: readSignature(defaultSignature) }));
  const [channel, setChannel] = useState<Channel>(lead.instagram ? "instagram" : "facebook");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

  function onSignatureChange(value: string) {
    setSignature(value);
    writeSignature(value);
    // Só regenera sozinho enquanto ela não mexeu no texto — depois de editar o corpo à
    // mão, trocar a assinatura não pode apagar a edição (mesma lógica do OutreachComposer:
    // o campo é dela a partir do primeiro toque).
    if (!touched) setBody(dmMessage(dmLead, { signature: value }));
  }

  const missingProfile = !lead.instagram || !lead.facebook;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={instagram.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-surface-solid"
        >
          {lead.instagram ? "Abrir Instagram" : instagram.label}
          <MdOpenInNew size={12} />
        </a>
        <a
          href={facebook.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-surface-solid"
        >
          {lead.facebook ? "Abrir Facebook" : facebook.label}
          <MdOpenInNew size={12} />
        </a>
      </div>
      {noProfile && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <MdOutlineInfo size={13} className="mt-0.5 shrink-0" />
          <span>
            Sem perfil de remetente, a assinatura sai como {NAME_PLACEHOLDER}.{" "}
            <Link href="/settings" className="font-semibold underline">
              Preencher em Ajustes &gt; Remetente
            </Link>
          </span>
        </p>
      )}
      {missingProfile && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <MdOutlineInfo size={13} className="mt-0.5 shrink-0" />
          Preencha Instagram/Facebook em Informações &gt; Contato
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted">Assinatura</span>
        <input
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          placeholder="Seu nome"
          className="w-40 rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm font-medium"
        />
      </label>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setTouched(true);
        }}
        rows={8}
        className="w-full resize-y rounded-md border border-border bg-surface-solid px-2 py-1.5 text-sm"
      />
      <p className="text-right font-mono text-[10px] tabular-nums text-faint">{body.length} caracteres</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            run("copy", async () => {
              await navigator.clipboard.writeText(body);
              setMsg("Copiado");
            })
          }
          disabled={busy === "copy"}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50"
        >
          <MdOutlineContentCopy size={14} />
          Copiar
        </button>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
          className="rounded-md border border-border bg-surface-solid px-2 py-1.5 text-xs font-semibold"
        >
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
        </select>
        <button
          onClick={() =>
            run("mark", async () => {
              await markDm({ leadId: lead._id, channel, message: body });
              setMsg("Marcado. Follow-up em 3 dias.");
            })
          }
          disabled={busy === "mark"}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
        >
          <MdOutlineCheck size={14} />
          Marcar contatado por DM
        </button>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
