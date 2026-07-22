"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
  MdClose,
  MdOutlineCall,
  MdOpenInNew,
  MdOutlineLanguage,
  MdOutlineGppGood,
  MdOutlineWarningAmber,
  MdStar,
  MdKeyboardArrowDown,
  MdOutlineReply,
  MdBlock,
} from "react-icons/md";
import {
  PIPELINE_STAGES,
  MARKETS,
  OPT_IN_MARKETS,
  canContactByEmail,
  type Stage,
} from "@convex/lib/domain";
import { OutreachComposer } from "@/components/outreach-composer";
import { GeneratePreviewButton } from "@/components/generate-preview-button";
import { PublishButton } from "@/components/publish-button";
import { CallScriptPanel } from "@/components/call-script-panel";
import { ContactOptInButton } from "@/components/contact-opt-in-button";
import { OBJECTIONS, MEETING_PLAYBOOK, CLOSING_OBJECTIONS, type Objection } from "@/lib/playbook";

const TIER: Record<string, { label: string; color: string }> = {
  hot: { label: "Quente", color: "var(--hot)" },
  warm: { label: "Morno", color: "var(--warm)" },
  cold: { label: "Frio", color: "var(--cold)" },
};

const SIGNAL_LABEL: Record<string, string> = {
  noSite: "Sem site",
  socialOnly: "Só rede social",
  noHttps: "Sem HTTPS",
  notMobile: "Não é mobile",
  slow: "Lento",
  sparseProfile: "Perfil incompleto",
};

const LEGAL_LABEL: Record<string, string> = {
  incorporated: "Empresa incorporada",
  sole_trader: "Autônomo",
  unknown: "Desconhecido",
};
const CONTACT_LABEL: Record<string, string> = {
  role: "Caixa de função",
  named: "Pessoa física",
  unknown: "Desconhecido",
};

const TABS = ["Informações", "Abordagem", "Site", "Objeções", "Venda"] as const;
type Tab = (typeof TABS)[number];

export function LeadDetail({ lead, onClose }: { lead: Doc<"leads">; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Informações");
  const setStage = useMutation(api.leads.setStage);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tier = TIER[lead.tier ?? "cold"] ?? TIER.cold;
  const status: "open" | "won" | "lost" =
    lead.stage === "converted" ? "won" : lead.stage === "lost" ? "lost" : "open";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Fechar" onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-[var(--shadow-lg)]">
        {/* header */}
        <div className="shrink-0 border-b border-border px-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ color: tier.color, backgroundColor: `color-mix(in srgb, ${tier.color} 14%, transparent)` }}
              >
                <span className="font-display font-bold tabular-nums">{lead.score ?? "—"}</span>
                {tier.label}
              </span>
              <h2 className="font-display text-xl font-bold leading-tight">{lead.name}</h2>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
              <MdClose size={20} />
            </button>
          </div>

          {/* tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "Informações" && (
            <InfoTab lead={lead} status={status} onStage={(s) => void setStage({ id: lead._id, stage: s })} />
          )}
          {tab === "Abordagem" && <ApproachTab lead={lead} />}
          {tab === "Site" && <SiteTab lead={lead} />}
          {tab === "Objeções" && <ObjectionsTab />}
          {tab === "Venda" && <SaleTab />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Informações */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

function InfoTab({ lead, status, onStage }: { lead: Doc<"leads">; status: "open" | "won" | "lost"; onStage: (s: Stage) => void }) {
  const market = MARKETS[lead.countryCode];
  const activeSignals = lead.signals
    ? Object.entries(lead.signals).filter(([, v]) => v).map(([k]) => SIGNAL_LABEL[k] ?? k)
    : [];

  return (
    <div className="space-y-6">
      <section>
        <Row label="Categoria">{(lead.category ?? "—").replace(/_/g, " ")}</Row>
        <Row label="Cidade">{lead.city ? `${lead.city}${market ? `, ${market.name}` : ""}` : "—"}</Row>
        <Row label="Endereço">{lead.address ?? "—"}</Row>
        <Row label="Telefone">
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-brand hover:underline">
              {lead.phone} <MdOutlineCall size={14} />
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Website">
          {lead.website ? (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
              site <MdOpenInNew size={13} />
            </a>
          ) : (
            <span className="text-hot">Sem site</span>
          )}
        </Row>
        <Row label="Email">{lead.email ?? "—"}</Row>
        <Row label="Avaliação">
          {lead.rating != null ? (
            <span className="inline-flex items-center gap-1">
              <MdStar size={14} className="text-warm" /> {lead.rating}/5
              {lead.reviewsCount != null ? ` · ${lead.reviewsCount} avaliações` : ""}
            </span>
          ) : (
            "—"
          )}
        </Row>
      </section>

      {/* sinais de dor */}
      {activeSignals.length > 0 && (
        <section>
          <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Sinais de dor</h3>
          <div className="flex flex-wrap gap-1.5">
            {activeSignals.map((s) => (
              <span key={s} className="rounded-full border border-hot/25 bg-hot/10 px-2.5 py-0.5 text-xs font-medium text-hot">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* compliance */}
      <section className="rounded-xl border border-border bg-surface-2/50 p-4">
        {/* mesmo gate do servidor (canContactByEmail): consentimento registrado destrava o email */}
        <div className="flex items-center gap-2">
          {canContactByEmail(lead) ? (
            <>
              <MdOutlineGppGood size={18} className="text-brand" />
              <span className="text-sm font-semibold text-brand">
                {lead.emailable ? "Abordável por email" : "Abordável — consentimento registrado"}
              </span>
            </>
          ) : (
            <>
              <MdOutlineWarningAmber size={18} className="text-warm" />
              <span className="text-sm font-semibold text-warm">Fora do escopo compliant</span>
            </>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-faint">Mercado</div>
            <div className="mt-0.5 font-medium">{market ? `${market.flag} ${market.name}` : lead.countryCode}</div>
          </div>
          <div>
            <div className="text-faint">Forma jurídica</div>
            <div className="mt-0.5 font-medium">{LEGAL_LABEL[lead.legalForm ?? "unknown"]}</div>
          </div>
          <div>
            <div className="text-faint">Contato</div>
            <div className="mt-0.5 font-medium">{CONTACT_LABEL[lead.contactType ?? "unknown"]}</div>
          </div>
        </div>
      </section>

      {/* etapa */}
      <section>
        <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Etapa</h3>
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStage(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                lead.stage === s.id
                  ? "bg-brand text-brand-fg shadow-[var(--shadow-sm)]"
                  : "border border-border text-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* status */}
      <section>
        <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Status</h3>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => onStage("approached")}
            className={`px-4 py-1.5 text-xs font-semibold transition-colors ${status === "open" ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2"}`}
          >
            Em aberto
          </button>
          <button
            onClick={() => onStage("converted")}
            className={`border-l border-border px-4 py-1.5 text-xs font-semibold transition-colors ${status === "won" ? "bg-brand text-brand-fg" : "text-muted hover:bg-surface-2"}`}
          >
            Ganho
          </button>
          <button
            onClick={() => onStage("lost")}
            className={`border-l border-border px-4 py-1.5 text-xs font-semibold transition-colors ${status === "lost" ? "bg-danger text-white" : "text-muted hover:bg-surface-2"}`}
          >
            Perdido
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Abordagem */

function ApproachTab({ lead }: { lead: Doc<"leads"> }) {
  const callFirst = OPT_IN_MARKETS.includes(lead.countryCode) || !canContactByEmail(lead);
  const markReplied = useMutation(api.outreach.markReplied);
  const suppress = useMutation(api.outreach.suppress);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* OPTIN-04: some quando há consentimento registrado (o composer já funciona nesse caso). */}
      {!canContactByEmail(lead) && (
        <div className="flex items-start gap-2 rounded-xl border border-warm/30 bg-warm/10 p-3 text-xs leading-relaxed text-ink-soft">
          <MdOutlineWarningAmber size={16} className="mt-0.5 shrink-0 text-warm" />
          <span>
            Este lead <strong>não é abordável por email frio</strong> (mercado ou entidade fora da regra opt-out).
            Prefira uma ligação — chamar um número comercial B2B é permitido.
          </span>
        </div>
      )}

      {/* OPTIN-04: o CTA "prefira uma ligação" precisa ter ação aqui — mesmos componentes do card
          da Descoberta, sem duplicar lógica. */}
      {callFirst && (
        <div className="space-y-2 rounded-xl border border-border bg-surface-2/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <MdOutlineCall size={14} />
              Ligação primeiro
            </span>
            {lead.phone && (
              <a
                href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`}
                className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-fg hover:bg-brand-hover"
              >
                <MdOutlineCall size={13} />
                Ligar
              </a>
            )}
          </div>
          <CallScriptPanel
            leadId={lead._id}
            phone={lead.phone}
            initialScript={lead.callScript}
            initialTranslation={lead.callScriptPt}
          />
          <ContactOptInButton leadId={lead._id} optInAt={lead.contactOptInAt} />
        </div>
      )}

      <OutreachComposer leadId={lead._id} hasEmail={!!lead.email} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          onClick={() =>
            run("replied", async () => {
              await markReplied({ leadId: lead._id });
              setMsg("Marcado como respondeu.");
            })
          }
          disabled={busy === "replied"}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
        >
          <MdOutlineReply size={14} />
          Respondeu
        </button>
        {lead.email && (
          <button
            onClick={() =>
              run("optout", async () => {
                if (!window.confirm("Registrar opt-out deste contato? Ele deixará de receber emails desta org.")) return;
                await suppress({ leadId: lead._id });
                setMsg("Opt-out registrado.");
              })
            }
            disabled={busy === "optout"}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:opacity-50"
          >
            <MdBlock size={14} />
            Pediu opt-out
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------------- Site */

function SiteTab({ lead }: { lead: Doc<"leads"> }) {
  const preview = useQuery(api.previews.getForLead, { leadId: lead._id });

  if (preview === undefined) return <p className="text-sm text-faint">Carregando…</p>;

  if (!preview) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/40 px-6 py-12 text-center">
        <MdOutlineLanguage size={30} className="mx-auto text-faint" />
        <p className="mt-3 font-display text-lg font-semibold">Nenhum site gerado ainda</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Gere um preview profissional do site do negócio num link único rastreado — pronto pra mostrar na abordagem.
        </p>
        <div className="mt-5 flex justify-center">
          <GeneratePreviewButton leadId={lead._id} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {preview.published ? "Publicado" : "Preview gerado"}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            aberto {preview.openCount}×
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/p/${preview.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            Ver prévia rastreada <MdOpenInNew size={14} />
          </a>
          <PublishButton leadId={lead._id} slug={preview.slug} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3">
        <span className="text-sm text-muted">Regenerar o conteúdo do site</span>
        <GeneratePreviewButton leadId={lead._id} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Objeções */

function ObjectionCard({ o }: { o: Objection }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-semibold">&quot;{o.label}&quot;</span>
        <MdKeyboardArrowDown size={20} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3.5">
          {([
            ["1. Empatia", o.empatia, "var(--brand)"],
            ["2. Argumento", o.argumento, "var(--hot)"],
            ["3. Evidência", o.evidencia, "var(--warm)"],
            ["4. Pergunta de retorno", o.pergunta, "var(--brand)"],
          ] as const).map(([k, v, c]) => (
            <div key={k}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: c }}>{k}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectionsTab() {
  const universal = OBJECTIONS.filter((o) => o.category === "universal");
  const site = OBJECTIONS.filter((o) => o.category === "site");
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Objeções universais</h3>
        <div className="space-y-2">{universal.map((o) => <ObjectionCard key={o.id} o={o} />)}</div>
      </section>
      <section>
        <h3 className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Objeções de site</h3>
        <div className="space-y-2">{site.map((o) => <ObjectionCard key={o.id} o={o} />)}</div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------- Venda */

const STEP_COLOR = ["var(--brand)", "var(--brand)", "var(--warm)", "var(--warm)", "var(--hot)", "var(--hot)"];

function SaleTab() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Roteiro da reunião</h3>
        <div className="space-y-2.5">
          {MEETING_PLAYBOOK.map((s) => (
            <div key={s.n} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                style={{ backgroundColor: STEP_COLOR[s.n - 1] ?? "var(--brand)" }}
              >
                {s.n}
              </span>
              <div>
                <h4 className="text-sm font-semibold">{s.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">Quebrar objeção de fechamento</h3>
        <div className="space-y-2">
          {CLOSING_OBJECTIONS.map((c) => (
            <ClosingCard key={c.id} label={c.label} response={c.response} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ClosingCard({ label, response }: { label: string; response: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-semibold">&quot;{label}&quot;</span>
        <MdKeyboardArrowDown size={20} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="border-t border-border px-4 py-3.5 text-sm leading-relaxed text-ink-soft">{response}</p>}
    </div>
  );
}
