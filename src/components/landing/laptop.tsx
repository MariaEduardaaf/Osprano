"use client";

import { useEffect, useRef } from "react";
import {
  MdOutlineDashboard,
  MdOutlineTravelExplore,
  MdOutlineViewKanban,
  MdOutlineForwardToInbox,
  MdOutlineSearch,
} from "react-icons/md";

/**
 * Laptop com as telas reais do produto rodando dentro — troca automática com
 * crossfade, abas clicáveis, pausa no hover. Motion imperativo no DOM
 * (data-attributes + CSS), auto-cycle desligado em prefers-reduced-motion.
 * Conteúdo das telas é decorativo (aria-hidden nas inativas); as abas contam a história.
 */

const SCREENS = [
  { id: "dashboard", label: "Dashboard", icon: MdOutlineDashboard },
  { id: "leads", label: "Leads", icon: MdOutlineTravelExplore },
  { id: "crm", label: "CRM", icon: MdOutlineViewKanban },
  { id: "outreach", label: "Outreach", icon: MdOutlineForwardToInbox },
] as const;

/* ---------- shell comum das telas (sidebar + topbar) ---------- */

function Shell({ active, title, children }: { active: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background text-foreground">
      <aside className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-border bg-surface py-3">
        <span className="mb-1 flex h-5 w-5 items-center justify-center">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="2" opacity="0.4" />
            <circle cx="12" cy="12" r="3" fill="var(--brand)" />
          </svg>
        </span>
        {SCREENS.map((s, i) => (
          <span
            key={s.id}
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              i === active ? "bg-brand-soft text-brand" : "text-faint"
            }`}
          >
            <s.icon size={15} />
          </span>
        ))}
        <span className="mt-auto h-5 w-5 rounded-full bg-gradient-to-br from-brand to-brand-deep" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
          <span className="text-[11px] font-semibold">{title}</span>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[9px] text-faint">
            <MdOutlineSearch size={10} />
            buscar…
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- telas ---------- */

function ScreenDashboard() {
  const kpis = [
    { l: "LEADS", v: "48", d: "na base" },
    { l: "SEM SITE", v: "22", d: "maior intenção" },
    { l: "ABORDÁVEIS", v: "28", d: "opt-out + inc." },
    { l: "CONVERTIDOS", v: "4", d: "fechados" },
  ];
  const funnel = [
    { l: "Base", n: 22, w: "100%", c: "var(--cold)" },
    { l: "Abordado", n: 9, w: "41%", c: "var(--brand)" },
    { l: "Agendado", n: 5, w: "23%", c: "var(--warm)" },
    { l: "Follow Up", n: 6, w: "27%", c: "var(--warm)" },
    { l: "Convertido", n: 4, w: "18%", c: "var(--brand)" },
  ];
  return (
    <Shell active={0} title="Dashboard">
      <div className="grid h-full grid-rows-[auto_1fr] gap-3">
        <div className="grid grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-surface p-3">
              <div className="font-mono text-[8px] uppercase tracking-wider text-faint">{k.l}</div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{k.v}</div>
              <div className="text-[9px] text-muted">{k.d}</div>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 grid-cols-[1.5fr_1fr] gap-3">
          <div className="flex flex-col rounded-xl border border-border bg-surface p-3">
            <div className="mb-2 text-[11px] font-semibold">Funil de conversão</div>
            <div className="flex flex-1 flex-col justify-between gap-1.5 pb-1">
              {funnel.map((f) => (
                <div key={f.l} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[9px] text-muted">{f.l}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: f.w, background: f.c, opacity: 0.85 }} />
                  </span>
                  <span className="w-5 text-right font-mono text-[9px] tabular-nums text-muted">{f.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-surface p-3">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background:
                  "conic-gradient(var(--hot) 0 135deg, var(--warm) 135deg 210deg, var(--cold) 210deg 360deg)",
              }}
            >
              <span className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-surface">
                <span className="font-display text-base font-bold leading-none">48</span>
                <span className="mt-0.5 text-[7px] uppercase tracking-wider text-faint">leads</span>
              </span>
            </div>
            <div className="flex gap-3 font-mono text-[8px] text-muted">
              <span><span className="text-hot">●</span> 18 quentes</span>
              <span><span className="text-warm">●</span> 10</span>
              <span><span className="text-cold">●</span> 20</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ScreenLeads() {
  const rows = [
    { s: 92, n: "The Oak & Barrel", m: "Restaurante · Manchester", t: "Quente", c: "var(--hot)", tag: "sem site" },
    { s: 84, n: "The Grooming Room", m: "Barbearia · Stockholm", t: "Quente", c: "var(--hot)", tag: "só social" },
    { s: 71, n: "FlexFit Studio", m: "Academia · Utrecht", t: "Quente", c: "var(--hot)", tag: "sem HTTPS" },
    { s: 64, n: "Dublin Corner Café", m: "Café · Dublin", t: "Morno", c: "var(--warm)", tag: "lento" },
    { s: 41, n: "Cork Barber Co", m: "Barbearia · Cork", t: "Frio", c: "var(--cold)", tag: "não-mobile" },
  ];
  return (
    <Shell active={1} title="Leads · descoberta">
      <div className="grid h-full grid-rows-[auto_1fr] gap-3">
        <div className="flex items-center gap-2">
          {["🇬🇧 Reino Unido", "Manchester", "Restaurantes"].map((f) => (
            <span key={f} className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[9px] text-muted">
              {f}
            </span>
          ))}
          <span className="ml-auto rounded-lg bg-brand px-3 py-1 text-[9px] font-semibold text-brand-fg">
            Buscar 50
          </span>
        </div>
        <div className="grid min-h-0 grid-rows-5 gap-2.5">
          {rows.map((r) => (
            <div key={r.n} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold tabular-nums"
                style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)` }}
              >
                {r.s}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold">{r.n}</div>
                <div className="truncate text-[9px] text-muted">{r.m}</div>
              </div>
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[8px] uppercase text-muted">
                {r.tag}
              </span>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[8px] font-semibold uppercase"
                style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)` }}
              >
                {r.t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function ScreenCrm() {
  const cols: { l: string; cards: { n: string; s: number; c: string }[] }[] = [
    { l: "Base", cards: [{ n: "Green Grocer", s: 58, c: "var(--warm)" }, { n: "Olive & Thyme", s: 73, c: "var(--hot)" }] },
    { l: "Abordado", cards: [{ n: "The Oak & Barrel", s: 92, c: "var(--hot)" }, { n: "Amsterdam Ink", s: 67, c: "var(--warm)" }] },
    { l: "Agendado", cards: [{ n: "PetCare Clinic", s: 81, c: "var(--hot)" }] },
    { l: "Follow Up", cards: [{ n: "Klippet Nordic", s: 76, c: "var(--hot)" }] },
    { l: "Convertido", cards: [{ n: "The Bruncherie", s: 88, c: "var(--hot)" }] },
  ];
  return (
    <Shell active={2} title="CRM · funil">
      <div className="grid h-full grid-cols-5 gap-2.5">
        {cols.map((col) => (
          <div key={col.l} className="flex min-h-0 flex-col rounded-xl border border-border bg-surface-2/60 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-wider text-muted">{col.l}</span>
              <span className="font-mono text-[8px] tabular-nums text-faint">{col.cards.length}</span>
            </div>
            <div className="space-y-2">
              {col.cards.map((card) => (
                <div key={card.n} className="rounded-lg border border-border bg-surface p-2.5 shadow-[var(--shadow-sm)]">
                  <div className="truncate text-[9px] font-semibold">{card.n}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5">
                    <span className="h-1.5 min-w-0 flex-1 rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${card.s}%`, background: card.c }} />
                    </span>
                    <span className="font-mono text-[8px] font-bold tabular-nums" style={{ color: card.c }}>
                      {card.s}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function ScreenOutreach() {
  const rows = [
    { n: "The Grooming Room", s: "Respondeu", c: "var(--brand)", t: "há 12 min", strong: true },
    { n: "The Oak & Barrel", s: "Abriu", c: "var(--warm)", t: "há 1 h", strong: true },
    { n: "FlexFit Studio", s: "Enviado", c: "var(--cold)", t: "há 3 h", strong: false },
    { n: "Dublin Corner Café", s: "Rascunho", c: "var(--faint)", t: "ontem", strong: false },
  ];
  return (
    <Shell active={3} title="Outreach · caixa de saída">
      <div className="grid h-full grid-rows-[1fr_auto] gap-3">
        <div className="grid min-h-0 grid-rows-4 gap-2.5">
          {rows.map((r) => (
            <div key={r.n} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.c }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold">{r.n}</div>
                <div className="truncate text-[9px] text-muted">Quick note about your website…</div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[8px] font-semibold uppercase"
                style={{
                  color: r.c,
                  background: `color-mix(in srgb, ${r.c} ${r.strong ? 14 : 8}%, transparent)`,
                }}
              >
                {r.s}
              </span>
              <span className="font-mono text-[8px] text-faint">{r.t}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-1.5 text-[9px] text-muted">
            <span className="text-brand">✦</span> IA escreveu citando a dor:
            <span className="truncate italic">&ldquo;your site shows as not secure on mobile&rdquo;</span>
            <span className="ml-auto shrink-0 rounded-lg bg-brand px-2.5 py-1 text-[8px] font-semibold text-brand-fg">
              Enviar
            </span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

const PANELS = [ScreenDashboard, ScreenLeads, ScreenCrm, ScreenOutreach];

/* ---------- laptop + ciclo ---------- */

export function LaptopShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-tab]"));
    let i = 0;
    let timer: number | undefined;

    const show = (n: number) => {
      i = n;
      panels.forEach((p, k) => {
        p.dataset.active = String(k === n);
        p.setAttribute("aria-hidden", String(k !== n));
      });
      tabs.forEach((t, k) => {
        t.dataset.active = String(k === n);
        t.setAttribute("aria-pressed", String(k === n));
      });
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      stop();
      timer = window.setInterval(() => show((i + 1) % panels.length), 4200);
    };
    const onClick = (e: Event) => {
      const idx = tabs.indexOf(e.currentTarget as HTMLButtonElement);
      if (idx >= 0) {
        show(idx);
        start();
      }
    };

    tabs.forEach((t) => t.addEventListener("click", onClick));
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    show(0);
    start();
    return () => {
      stop();
      tabs.forEach((t) => t.removeEventListener("click", onClick));
      root.removeEventListener("mouseenter", stop);
      root.removeEventListener("mouseleave", start);
    };
  }, []);

  return (
    <div ref={rootRef} className="mx-auto max-w-4xl">
      {/* laptop */}
      <div style={{ perspective: "1800px" }}>
        <div className="relative mx-auto w-full" style={{ transform: "rotateX(3deg)" }}>
          {/* tampa/tela */}
          <div className="relative rounded-[20px] rounded-b-none border border-border-strong/60 bg-[#0c0e13] p-2 pb-0 shadow-[var(--shadow-lg)] sm:p-3 sm:pb-0">
            <span className="absolute left-1/2 top-[5px] h-1 w-1 -translate-x-1/2 rounded-full bg-white/20" aria-hidden />
            <div className="relative mt-1.5 aspect-[16/10] overflow-hidden rounded-t-[10px] border border-black/40 bg-background">
              {PANELS.map((Panel, k) => (
                <div
                  key={k}
                  data-panel
                  data-active={k === 0 ? "true" : "false"}
                  aria-hidden={k !== 0}
                  className="laptop-panel absolute inset-0"
                >
                  <Panel />
                </div>
              ))}
              {/* reflexo de vidro */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 28%, transparent 42%)",
                }}
                aria-hidden
              />
            </div>
          </div>
          {/* base/teclado */}
          <div className="relative mx-[-3%]" aria-hidden>
            <div className="h-3 rounded-b-[16px] rounded-t-[3px] border border-t-0 border-border-strong/50 bg-gradient-to-b from-surface-2 to-surface shadow-[0_18px_40px_-18px_rgba(10,20,50,0.5)]">
              <span className="mx-auto block h-1.5 w-20 rounded-b-lg bg-black/10" />
            </div>
          </div>
          {/* sombra de contato */}
          <div
            className="mx-auto mt-3 h-4 w-3/4 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--brand-deep) 22%, transparent), transparent 75%)",
              filter: "blur(6px)",
            }}
            aria-hidden
          />
        </div>
      </div>

      {/* abas */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Telas do produto">
        {SCREENS.map((s, k) => (
          <button
            key={s.id}
            type="button"
            data-tab
            data-active={k === 0 ? "true" : "false"}
            aria-pressed={k === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted transition-all duration-300 hover:text-foreground data-[active=true]:border-brand/40 data-[active=true]:bg-brand-soft data-[active=true]:text-brand"
          >
            <s.icon size={13} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
