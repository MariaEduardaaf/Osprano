"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  MdOutlineDashboard,
  MdOutlineTravelExplore,
  MdOutlineViewKanban,
  MdOutlineForwardToInbox,
  MdOutlineLanguage,
  MdOutlineSearch,
  MdOutlineGppGood,
  MdOutlineVisibility,
  MdCheck,
} from "react-icons/md";

/**
 * Laptop com as telas do produto rodando dentro — réplica fiel do app
 * (sidebar com labels, bloco de plano, eyebrow+título) com animações internas
 * que re-executam a cada troca de tela (barras crescem, cards em cascata,
 * status trocando ao vivo). Ciclo automático com crossfade, abas com barra de
 * progresso, pausa no hover; tudo desligado em prefers-reduced-motion.
 */

const SCREENS = [
  { id: "dashboard", label: "Dashboard", icon: MdOutlineDashboard },
  { id: "leads", label: "Leads", icon: MdOutlineTravelExplore },
  { id: "crm", label: "CRM", icon: MdOutlineViewKanban },
  { id: "outreach", label: "Outreach", icon: MdOutlineForwardToInbox },
] as const;

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* ---------- shell fiel ao app (sidebar com labels + header de seção) ---------- */

function Shell({
  active,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  active: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full bg-background text-foreground">
      <aside className="flex w-[110px] shrink-0 flex-col border-r border-border bg-surface p-2">
        <div className="mb-3 flex items-center gap-1.5 px-1 pt-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="2" opacity="0.4" />
            <circle cx="12" cy="12" r="3" fill="var(--brand)" />
          </svg>
          <span>
            <span className="block font-display text-[9px] font-bold leading-none">Osprano</span>
            <span className="block font-mono text-[4.5px] uppercase tracking-[0.14em] text-brand">
              compliant by design
            </span>
          </span>
        </div>
        <nav className="space-y-0.5">
          {SCREENS.map((s, i) => (
            <span
              key={s.id}
              className={`flex items-center gap-1.5 rounded-md px-1.5 py-[5px] text-[8px] font-semibold ${
                i === active
                  ? "border-l-2 border-brand bg-surface-2 text-foreground"
                  : "border-l-2 border-transparent text-muted"
              }`}
            >
              <s.icon size={10} className={i === active ? "text-brand" : "text-faint"} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 rounded-md border-l-2 border-transparent px-1.5 py-[5px] text-[8px] font-semibold text-muted">
            <MdOutlineLanguage size={10} className="text-faint" />
            Meus Projetos
          </span>
        </nav>
        <div className="mt-auto space-y-1.5">
          <div className="rounded-md border border-border bg-surface-2/60 p-1.5">
            <div className="flex items-center justify-between font-mono text-[6px] text-muted">
              <span className="font-bold">PRO</span>
              <span className="tabular-nums">137/2000</span>
            </div>
            <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full w-[7%] rounded-full bg-brand" />
            </div>
          </div>
          <span className="block rounded-md bg-brand py-1 text-center text-[7px] font-bold text-brand-fg">
            Gerenciar plano
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3.5">
        <div className="mb-2.5 flex shrink-0 items-start justify-between">
          <div>
            <div className="font-mono text-[6px] font-semibold uppercase tracking-[0.2em] text-brand">
              {eyebrow}
            </div>
            <div className="font-display text-[15px] font-bold leading-tight">{title}</div>
            <div className="text-[7px] text-muted">{subtitle}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[7px] text-faint">
              <MdOutlineSearch size={8} />
              buscar…
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[6px] font-semibold text-muted">
              modo demo
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ---------- telas ---------- */

function ScreenDashboard() {
  const kpis = [
    { l: "LEADS", v: "48", s: "na base", icon: MdOutlineTravelExplore },
    { l: "SEM SITE / SOCIAL", v: "22", s: "maior intenção", icon: MdOutlineLanguage },
    { l: "ABORDÁVEIS", v: "28", s: "opt-out + incorporados", icon: MdOutlineForwardToInbox },
    { l: "CONVERTIDOS", v: "4", s: "fechados", icon: MdCheck },
  ];
  const taxas = [
    { l: "conversão", v: "8%", c: "var(--brand)" },
    { l: "abordagem", v: "54%", c: "var(--brand)" },
    { l: "agendamento", v: "19%", c: "var(--warm)" },
    { l: "follow up", v: "23%", c: "var(--warm)" },
    { l: "perdidos", v: "8%", c: "var(--hot)" },
  ];
  const funnel = [
    { l: "Base", n: 22, w: 100, c: "var(--cold)" },
    { l: "Abordado", n: 9, w: 41, c: "var(--brand)" },
    { l: "Agendado", n: 5, w: 23, c: "var(--warm)" },
    { l: "Follow Up", n: 6, w: 27, c: "var(--warm)" },
    { l: "Convertido", n: 4, w: 18, c: "var(--brand)" },
    { l: "Perdido", n: 2, w: 9, c: "var(--faint)" },
  ];
  return (
    <Shell active={0} eyebrow="visão geral" title="Dashboard" subtitle="A saúde da sua operação num relance">
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-2">
        <div className="grid grid-cols-4 gap-2">
          {kpis.map((k, i) => (
            <div key={k.l} className="demo-pop rounded-lg border border-border bg-surface p-2" style={d(i * 80)}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[5.5px] uppercase tracking-wider text-faint">{k.l}</span>
                <k.icon size={9} className="text-faint" />
              </div>
              <div className="mt-0.5 font-display text-lg font-bold leading-none tabular-nums">{k.v}</div>
              <div className="mt-0.5 text-[7px] text-muted">{k.s}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {taxas.map((t, i) => (
            <div key={t.l} className="demo-pop rounded-lg border border-border bg-surface px-2 py-1.5" style={d(300 + i * 60)}>
              <div className="flex items-center gap-1 text-[6px] text-muted">
                <span className="h-1 w-1 rounded-full" style={{ background: t.c }} />
                Taxa de {t.l}
              </div>
              <div className="font-display text-[13px] font-bold tabular-nums" style={{ color: t.c }}>
                {t.v}
              </div>
            </div>
          ))}
        </div>
        <div className="grid min-h-0 grid-cols-[1.55fr_1fr] gap-2">
          <div className="demo-pop flex flex-col rounded-lg border border-border bg-surface p-2.5" style={d(550)}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-semibold">Funil de conversão</span>
              <span className="font-mono text-[6px] uppercase text-faint">48 leads</span>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-1 pb-0.5">
              {funnel.map((f, i) => (
                <div key={f.l} className="flex items-center gap-1.5">
                  <span className="w-12 shrink-0 text-[7.5px] text-muted">{f.l}</span>
                  <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="demo-bar block h-full rounded-full"
                      style={{ width: `${f.w}%`, background: f.c, opacity: 0.85, ...d(650 + i * 90) }}
                    />
                  </span>
                  <span className="w-4 text-right font-mono text-[7px] tabular-nums text-muted">{f.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="demo-pop relative flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-2.5" style={d(650)}>
            <span className="absolute left-2.5 top-2 text-[9px] font-semibold">Por temperatura</span>
            <div
              className="mt-2 flex h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{
                background:
                  "conic-gradient(var(--hot) 0 135deg, var(--warm) 135deg 210deg, var(--cold) 210deg 360deg)",
              }}
            >
              <span className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-surface">
                <span className="font-display text-[13px] font-bold leading-none">48</span>
                <span className="mt-0.5 text-[5px] uppercase tracking-wider text-faint">leads</span>
              </span>
            </div>
            <div className="flex gap-2.5 font-mono text-[7px] text-muted">
              <span><span className="text-hot">●</span> Quente 18</span>
              <span><span className="text-warm">●</span> 10</span>
              <span><span className="text-cold">●</span> 20</span>
            </div>
            {/* atividade ao vivo */}
            <div className="demo-toast absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-1 shadow-[var(--shadow-md)]">
              <MdOutlineVisibility size={8} className="text-brand" />
              <span className="text-[6.5px]">
                <b>The Oak &amp; Barrel</b> abriu o preview · agora
              </span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ScreenLeads() {
  const rows = [
    { s: 92, n: "The Oak & Barrel", m: "Restaurante · Manchester", t: "QUENTE", c: "var(--hot)", tag: "sem site", tel: "+44 161 496 0102" },
    { s: 84, n: "The Grooming Room", m: "Barbearia · Stockholm", t: "QUENTE", c: "var(--hot)", tag: "só social", tel: "+46 8 555 1147" },
    { s: 64, n: "Dublin Corner Café", m: "Café · Dublin", t: "MORNO", c: "var(--warm)", tag: "site lento", tel: "+353 1 475 8809" },
    { s: 41, n: "Cork Barber Co", m: "Barbearia · Cork", t: "FRIO", c: "var(--cold)", tag: "não-mobile", tel: "+353 21 427 3311" },
  ];
  return (
    <Shell active={1} eyebrow="descoberta" title="Leads" subtitle="Busque por país, cidade e categoria — rankeado pela dor">
      <div className="grid h-full grid-rows-[auto_1fr] gap-2">
        <div className="demo-pop flex items-center gap-1.5" style={d(0)}>
          {["🇬🇧 Reino Unido", "Manchester", "Restaurantes", "1–50"].map((f) => (
            <span key={f} className="rounded-md border border-border bg-surface px-2 py-1 text-[7.5px] text-muted">
              {f}
            </span>
          ))}
          <span className="ml-auto rounded-md bg-brand px-2.5 py-1 text-[7.5px] font-bold text-brand-fg">
            Buscar leads
          </span>
        </div>
        <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2">
          {rows.map((r, i) => (
            <div key={r.n} className="demo-pop flex flex-col rounded-lg border border-border bg-surface p-2.5" style={d(150 + i * 110)}>
              <div className="flex items-start justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md font-display text-[12px] font-bold tabular-nums"
                  style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)` }}
                >
                  {r.s}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 font-mono text-[6px] font-bold"
                  style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)` }}
                >
                  {r.t}
                </span>
              </div>
              <div className="mt-1.5 text-[9.5px] font-semibold leading-tight">{r.n}</div>
              <div className="text-[7px] text-muted">{r.m}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[6px] uppercase text-muted">
                  {r.tag}
                </span>
                <span className="font-mono text-[6px] text-faint">{r.tel}</span>
              </div>
              <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                <span className="rounded-md border border-border px-2 py-[3px] text-[6.5px] font-semibold text-muted">
                  Gerar preview
                </span>
                <span className="rounded-md bg-brand px-2 py-[3px] text-[6.5px] font-bold text-brand-fg">
                  Enviar pro CRM
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function ScreenCrm() {
  const cols: { l: string; n: number; cards: { n: string; s: number; c: string }[] }[] = [
    { l: "Base", n: 22, cards: [{ n: "Green Grocer", s: 58, c: "var(--warm)" }, { n: "Olive & Thyme", s: 73, c: "var(--hot)" }] },
    { l: "Abordado", n: 9, cards: [{ n: "The Oak & Barrel", s: 92, c: "var(--hot)" }, { n: "Amsterdam Ink", s: 67, c: "var(--warm)" }] },
    { l: "Agendado", n: 5, cards: [{ n: "PetCare Clinic", s: 81, c: "var(--hot)" }] },
    { l: "Follow Up", n: 6, cards: [{ n: "Klippet Nordic", s: 76, c: "var(--hot)" }] },
    { l: "Convertido", n: 4, cards: [{ n: "The Bruncherie", s: 88, c: "var(--hot)" }] },
  ];
  return (
    <Shell active={2} eyebrow="pipeline" title="CRM" subtitle="Arraste pelo funil — de Base a Convertido">
      <div className="grid h-full grid-cols-5 gap-1.5">
        {cols.map((col, i) => (
          <div key={col.l} className="demo-pop flex min-h-0 flex-col rounded-lg border border-border bg-surface-2/60 p-1.5" style={d(i * 90)}>
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="font-mono text-[7px] font-semibold uppercase tracking-wider text-muted">{col.l}</span>
              <span className="rounded bg-surface px-1 font-mono text-[7px] tabular-nums text-faint">{col.n}</span>
            </div>
            <div className="space-y-1.5">
              {col.cards.map((card, j) => (
                <div key={card.n} className="demo-pop rounded-md border border-border bg-surface p-2 shadow-[var(--shadow-sm)]" style={d(250 + i * 90 + j * 120)}>
                  <div className="truncate text-[8px] font-semibold">{card.n}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5">
                    <span className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="demo-bar block h-full rounded-full" style={{ width: `${card.s}%`, background: card.c, ...d(500 + i * 90) }} />
                    </span>
                    <span className="font-mono text-[7px] font-bold tabular-nums" style={{ color: card.c }}>
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
    { n: "The Grooming Room", swap: true, t: "há 12 min" },
    { n: "The Oak & Barrel", s: "ABRIU", c: "var(--warm)", t: "há 1 h" },
    { n: "FlexFit Studio", s: "ENVIADO", c: "var(--cold)", t: "há 3 h" },
    { n: "Dublin Corner Café", s: "RASCUNHO", c: "var(--faint)", t: "ontem" },
  ];
  return (
    <Shell active={3} eyebrow="caixa de saída" title="Outreach" subtitle="Rascunho → enviado → abriu → respondeu">
      <div className="grid h-full grid-rows-[1fr_auto] gap-2">
        <div className="grid min-h-0 grid-rows-4 gap-2">
          {rows.map((r, i) => (
            <div key={r.n} className="demo-pop flex items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5" style={d(i * 110)}>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[9px] font-bold text-brand"
                style={{ background: "var(--brand-soft)" }}
              >
                {r.n[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[9.5px] font-semibold">{r.n}</div>
                <div className="truncate text-[7px] text-muted">Quick note about your website — preview inside…</div>
              </div>
              {r.swap ? (
                <span className="relative inline-flex h-4 w-16 shrink-0 items-center justify-center">
                  <span
                    className="demo-swap-a absolute inset-0 inline-flex items-center justify-center rounded-full font-mono text-[6.5px] font-bold"
                    style={{ color: "var(--warm)", background: "color-mix(in srgb, var(--warm) 14%, transparent)" }}
                  >
                    ABRIU
                  </span>
                  <span
                    className="demo-swap-b absolute inset-0 inline-flex items-center justify-center rounded-full font-mono text-[6.5px] font-bold"
                    style={{ color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}
                  >
                    RESPONDEU ✓
                  </span>
                </span>
              ) : (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[6.5px] font-bold"
                  style={{ color: r.c, background: `color-mix(in srgb, ${r.c} 12%, transparent)` }}
                >
                  {r.s}
                </span>
              )}
              <span className="shrink-0 font-mono text-[6.5px] text-faint">{r.t}</span>
            </div>
          ))}
        </div>
        <div className="demo-pop rounded-lg border border-border bg-surface p-2.5" style={d(500)}>
          <div className="flex items-center gap-1.5 text-[8px] text-muted">
            <span className="text-brand">✦</span>
            <span className="min-w-0 truncate">
              IA citou a dor: <i>&ldquo;your site shows as not secure on mobile&rdquo;</i> + link do preview
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-[3px] text-[6.5px] font-semibold">
              <MdOutlineGppGood size={8} className="text-brand" /> opt-out incluído
            </span>
            <span className="shrink-0 rounded-md bg-brand px-2.5 py-[3px] text-[7px] font-bold text-brand-fg">
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

    // abertura 3D da tampa quando o showcase entra em vista
    const opener = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.dataset.open = "true";
          opener.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    opener.observe(root);

    // tilt 3D seguindo o mouse (desligado em touch/reduced-motion)
    const tilt = root.querySelector<HTMLElement>("[data-tilt]");
    const fine =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: MouseEvent) => {
      if (!tilt) return;
      const r = root.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateX(${(3 - py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg)`;
    };
    const onEnter = () => {
      stop();
      if (tilt && fine) tilt.style.transition = "transform 140ms ease-out";
    };
    const onLeave = () => {
      start();
      if (tilt && fine) {
        tilt.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)";
        tilt.style.transform = "rotateX(3deg) rotateY(0deg)";
      }
    };

    tabs.forEach((t) => t.addEventListener("click", onClick));
    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);
    if (fine) root.addEventListener("mousemove", onMove);
    show(0);
    start();
    return () => {
      stop();
      opener.disconnect();
      tabs.forEach((t) => t.removeEventListener("click", onClick));
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div ref={rootRef} className="laptop-root mx-auto max-w-4xl">
      {/* palco: luz atrás do laptop pra ele descolar do fundo da página */}
      <div className="relative">
        <div className="pointer-events-none absolute -inset-x-24 -bottom-10 -top-24" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 65% at 50% 42%, color-mix(in srgb, var(--brand) 34%, transparent), transparent 72%)",
              filter: "blur(30px)",
            }}
          />
          <div
            className="animate-aurora absolute left-1/2 top-1/2 h-[70%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--brand-deep) 30%, transparent), transparent 70%)",
              filter: "blur(46px)",
            }}
          />
        </div>

        {/* laptop */}
        <div style={{ perspective: "1600px" }}>
          <div
            data-tilt
            className="relative mx-auto w-full will-change-transform"
            style={{ transform: "rotateX(3deg)", transformStyle: "preserve-3d" }}
          >
            {/* tampa/tela — abre em 3D a partir da dobradiça */}
            <div className="laptop-lid relative z-10">
              <div
                className="relative rounded-[20px] rounded-b-none border border-white/10 p-2 pb-0 sm:p-3 sm:pb-0"
                style={{
                  background: "linear-gradient(180deg, #262c38 0%, #141821 55%, #0b0e15 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.14), 0 30px 70px -24px rgba(5,12,35,0.65), 0 0 60px -18px color-mix(in srgb, var(--brand) 32%, transparent)",
                }}
              >
                <span className="absolute left-1/2 top-[6px] h-1 w-1 -translate-x-1/2 rounded-full bg-white/25 ring-1 ring-black/40" aria-hidden />
                {/* vidro escuro = tela desligada; o conteúdo "liga" quando a tampa abre */}
                <div className="relative mt-1.5 aspect-[16/10] overflow-hidden rounded-t-[10px] border border-black/60 bg-[#0a0d14]">
                  <div className="laptop-screen-content absolute inset-0 bg-background">
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
                  </div>
                  {/* reflexo de vidro */}
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background:
                        "linear-gradient(115deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 28%, transparent 45%)",
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
            {/* base/teclado — alumínio escuro */}
            <div className="relative mx-[-3.5%]" aria-hidden>
              <div
                className="relative h-[15px] rounded-b-[16px] rounded-t-[3px] border border-white/10"
                style={{
                  background: "linear-gradient(180deg, #323947 0%, #1c212c 45%, #10141c 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), 0 26px 50px -18px rgba(5,12,35,0.7)",
                }}
              >
                <span
                  className="mx-auto block h-[7px] w-24 rounded-b-xl"
                  style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.2))" }}
                />
                <span className="absolute inset-x-8 bottom-[2px] h-px bg-white/10" />
              </div>
            </div>
            {/* sombra de contato + reflexo no "chão" */}
            <div
              className="mx-auto mt-2 h-6 w-[82%] rounded-[100%]"
              style={{
                background:
                  "radial-gradient(50% 100% at 50% 0%, rgba(5,12,35,0.5), color-mix(in srgb, var(--brand-deep) 20%, transparent) 45%, transparent 75%)",
                filter: "blur(10px)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* abas com progresso do ciclo */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Telas do produto">
        {SCREENS.map((s, k) => (
          <button
            key={s.id}
            type="button"
            data-tab
            data-active={k === 0 ? "true" : "false"}
            aria-pressed={k === 0}
            className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted transition-all duration-300 hover:text-foreground data-[active=true]:border-brand/40 data-[active=true]:bg-brand-soft data-[active=true]:text-brand"
          >
            <s.icon size={13} />
            {s.label}
            <span className="tab-progress absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-brand/50" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
