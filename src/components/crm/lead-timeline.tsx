"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PIPELINE_STAGES, lostReasonLabel, formatRelative } from "@convex/lib/domain";
import { eventDot, eventIcon } from "@/components/event-glyph";
import { useNow } from "@/lib/use-now";
import { errorMessage } from "@/lib/errors";

type Meta = {
  text?: string;
  from?: string;
  to?: string;
  reason?: string;
  source?: string;
  channel?: string;
} | null;

/** meta.source dos eventos de opt-in; ausente = sem parênteses. */
const SOURCE_LABEL: Record<string, string> = {
  replied_email: "respondeu o email",
  phone_call: "ligação",
  in_person: "pessoalmente",
  reply: "resposta",
  other: "outro",
};

function stageLabel(id: string | undefined): string | undefined {
  return PIPELINE_STAGES.find((s) => s.id === id)?.label;
}

function withSource(label: string, source: string | undefined): string {
  if (!source) return label;
  return `${label} (${SOURCE_LABEL[source] ?? source})`;
}

/**
 * Copy do Histórico (seção 3.2 da spec). Não se unifica com o eventLabel do Dashboard: o feed
 * fala "<lead> abriu o preview"; aqui o lead é o contexto. Eventos antigos e do seed não têm
 * `from` (fica "→ Abordado"); perdido sem `reason` fica só "Abordado → Perdido".
 */
function timelineText(type: string, meta: Meta): string {
  switch (type) {
    case "note":
      return meta?.text ?? "";
    case "stage_change": {
      const from = stageLabel(meta?.from);
      const to = stageLabel(meta?.to) ?? meta?.to ?? "?";
      const base = from ? `${from} → ${to}` : `→ ${to}`;
      const reason = meta?.to === "lost" ? lostReasonLabel(meta?.reason) : undefined;
      return reason ? `${base} · ${reason}` : base;
    }
    case "email_sent":
      return "Email enviado";
    case "preview_open":
      return "Preview aberto";
    case "reply":
      return "Respondeu";
    case "wa_opt_in":
      return withSource("Opt-in WhatsApp", meta?.source);
    case "contact_opt_in":
      return withSource("Consentimento registrado", meta?.source);
    default:
      return type;
  }
}

/** Aba Histórico: campo de nota (Enter salva, Shift+Enter quebra linha) e a timeline do lead. */
export function LeadTimeline({ leadId }: { leadId: Id<"leads"> }) {
  const now = useNow();
  const events = useQuery(api.leads.timeline, { leadId });
  const addNote = useMutation(api.leads.addNote);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await addNote({ id: leadId, text });
      setText("");
    } catch (e) {
      setMsg(errorMessage(e, "Falha"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
          }}
          rows={Math.min(4, text.split("\n").length)}
          placeholder="Escreva uma nota e aperte Enter"
          aria-label="Nova nota"
          className="w-full resize-none rounded-lg border border-border bg-surface-solid px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-border-strong"
        />
        {msg && <p className="mt-1 text-xs text-danger">{msg}</p>}
      </div>

      {events === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : events.length === 0 ? (
        // Vazio sólido em vez do EmptyState de ui.tsx: ele virou `glass` no redesenho e vidro
        // dentro do drawer (glass-dense) é proibido. Mesmo tratamento do vazio da aba Site.
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-2/60 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-foreground">Nada registrado ainda</p>
        </div>
      ) : (
        <ul className="space-y-3 rounded-xl bg-surface-2 p-4">
          {events.map((e) => (
            <li key={e._id} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0" style={{ color: eventDot(e.type) }}>
                {eventIcon(e.type, e.meta)}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                {timelineText(e.type, e.meta)}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{formatRelative(e.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
