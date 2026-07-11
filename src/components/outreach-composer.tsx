"use client";

import { useEffect, useRef, useState } from "react";
import {
  MdOutlineAutoAwesome,
  MdOutlineContentCopy,
  MdOutlineCheck,
  MdOutlineSend,
} from "react-icons/md";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Falha";
}

export function OutreachComposer({ leadId, hasEmail }: { leadId: Id<"leads">; hasEmail: boolean }) {
  const draft = useAction(api.outreach.draft);
  const send = useAction(api.outreach.send);
  const markSent = useMutation(api.outreach.markSent);
  const updateDraft = useMutation(api.outreach.updateDraft);
  const existing = useQuery(api.outreach.getForLead, { leadId });

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || existing === undefined) return; // ainda carregando
    hydrated.current = true;
    if (existing && (existing.subject || existing.body)) {
      setSubject(existing.subject ?? "");
      setBody(existing.body ?? "");
      setOpen(true); // pré-preenchido, sem gastar IA
    }
  }, [existing]);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() =>
          run("draft", async () => {
            const r = await draft({ leadId });
            setSubject(r.subject);
            setBody(r.body);
            setOpen(true);
          })
        }
        disabled={busy === "draft"}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-50"
      >
        <MdOutlineAutoAwesome size={14} />
        {busy === "draft" ? "Escrevendo…" : "Escrever com IA"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Assunto"
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-medium"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            run("copy", async () => {
              await navigator.clipboard.writeText(`${subject}\n\n${body}`);
              void updateDraft({ leadId, subject, body }).catch(() => {});
              setMsg("Copiado — envie do seu email.");
            })
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface"
        >
          <MdOutlineContentCopy size={14} />
          Copiar
        </button>
        <button
          onClick={() => run("mark", async () => {
            await updateDraft({ leadId, subject, body });
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
              await updateDraft({ leadId, subject, body });
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
