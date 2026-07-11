import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import type { IconType } from "react-icons";
import {
  MdOutlineTravelExplore,
  MdOutlineAutoAwesome,
  MdOutlineForwardToInbox,
  MdOutlineSend,
  MdOutlineVisibility,
  MdOutlineTrendingUp,
  MdOutlineDashboard,
  MdOutlineInsights,
  MdOutlineViewKanban,
  MdOutlineGppGood,
  MdArrowForward,
  MdArrowOutward,
  MdCheck,
} from "react-icons/md";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";
import { ProductMockup } from "@/components/landing/mockup";
import { Radar } from "@/components/landing/radar";
import { RevenueCalculator } from "@/components/landing/calculator";
import { Faq } from "@/components/landing/faq";
import { Pricing } from "@/components/landing/pricing";
import { Reveal, CountUp, Tilt } from "@/components/landing/motion";
import { LandingHeader } from "@/components/landing/header";
import { LaptopShowcase } from "@/components/landing/laptop";

const SCAN_FEED = [
  "restaurantes · Manchester",
  "cafés · Amsterdam",
  "barbearias · Dublin",
  "academias · Stockholm",
  "spas · Oslo",
  "clínicas · Utrecht",
  "padarias · Cork",
  "floriculturas · Gothenburg",
  "pubs · Bristol",
  "salões · Rotterdam",
  "estúdios · Bergen",
  "oficinas · Galway",
];

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

const STEPS: { icon: IconType; t: string; d: string }[] = [
  { icon: MdOutlineTravelExplore, t: "Ache a dor", d: "Busque negócios locais por país, cidade e categoria. O Digital Presence Score rankeia quem tem site fraco ou nenhum." },
  { icon: MdOutlineAutoAwesome, t: "Gere o preview", d: "Em segundos, um preview profissional do site do negócio, num link único rastreado." },
  { icon: MdOutlineForwardToInbox, t: "A IA escreve a abordagem", d: "Ela lê a dor do lead e escreve o email personalizado citando o problema exato + o link." },
  { icon: MdOutlineSend, t: "Envie compliant", d: "Só mercados opt-out, só entidades incorporadas, com identificação e opt-out. Nada de spam." },
  { icon: MdOutlineVisibility, t: "Saiba quando abriram", d: "O lead avança no funil e você é notificado no instante em que o prospect abre o preview." },
  { icon: MdOutlineTrendingUp, t: "Feche + recorrência", d: "Feche no CRM e transforme a venda em MRR com hospedagem white-label na sua marca." },
];

const FEATURES: { icon: IconType; t: string; d: string }[] = [
  { icon: MdOutlineDashboard, t: "Dashboard", d: "Funil, taxas de conversão e atividade ao vivo — a saúde da operação num relance." },
  { icon: MdOutlineInsights, t: "Digital Presence Score", d: "Pontue a dor de 0 a 100 com sinais reais: sem site, só-social, sem HTTPS, não-mobile, lento." },
  { icon: MdOutlineViewKanban, t: "CRM visual", d: "Kanban do funil (Base → Abordado → Agendado → Follow Up → Convertido). Mova por etapa." },
  { icon: MdOutlineAutoAwesome, t: "Outreach por IA", d: "Email personalizado citando a dor + link do preview. Você revisa e envia num clique." },
  { icon: MdOutlineVisibility, t: "Preview rastreado", d: "Cada proposta num link único. Saiba na hora que o cliente abriu — o momento de fechar." },
  { icon: MdOutlineGppGood, t: "Compliant by design", d: "Só aborda onde é legal (opt-out UE). GDPR-safe, com opt-out em todo email. Sem risco." },
];

const TESTIMONIALS = [
  { name: "James Whitfield", role: "Web studio · Manchester", quote: "Parei de caçar contato na mão. O Osprano acha os negócios com site ruim, escreve o email e eu só fecho." },
  { name: "Sophie Bakker", role: "Freelancer · Amsterdam", quote: "Saber a hora exata que o cliente abriu a prévia mudou minha taxa de fechamento. E tudo dentro da lei." },
  { name: "Liam O'Brien", role: "Agência · Dublin", quote: "A hospedagem white-label virou minha maior fonte de recorrência. Venda única virou MRR de verdade." },
];

function Section({
  id,
  index,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  index?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28">
      {(eyebrow || title) && (
        <Reveal variant="up" className="mb-14 border-t border-border pt-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              {eyebrow && (
                <div className="mb-4 flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  {index && <span className="tabular-nums text-faint">{index}</span>}
                  <span className="h-1 w-1 rounded-full bg-brand" />
                  {eyebrow}
                </div>
              )}
              {title && (
                <h2 className="text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
                  {title}
                </h2>
              )}
            </div>
            {subtitle && (
              <p className="max-w-sm text-base leading-relaxed text-muted md:text-right">{subtitle}</p>
            )}
          </div>
        </Reveal>
      )}
      {children}
    </section>
  );
}

export default async function Home() {
  const userId = DEMO ? null : (await auth()).userId;
  const ctaHref = DEMO || userId ? "/dashboard" : "/sign-up";
  const ctaLabel = DEMO ? "Entrar no app (demo)" : userId ? "Ir pro painel" : "Começar grátis";

  return (
    // overflow-x-clip (e não hidden): corta o vazamento horizontal das decorações
    // SEM criar scroll container — senão o position:sticky do header morre.
    <div id="top" className="relative overflow-x-clip">
      {/* atmosphere — auroras que derivam + grão fotográfico por cima de tudo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[980px] overflow-hidden" aria-hidden>
        <div
          className="animate-aurora absolute -top-40 right-[-10%] h-[720px] w-[860px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand) 22%, transparent), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="animate-aurora-slow absolute -top-24 left-[-14%] h-[560px] w-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand-deep) 16%, transparent), transparent 68%)",
            filter: "blur(48px)",
          }}
        />
        {/* linhas de latitude — textura de instrumento */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "repeating-linear-gradient(to bottom, transparent 0 79px, color-mix(in srgb, var(--border) 55%, transparent) 79px 80px)",
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />
      </div>
      <div className="bg-grain pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-overlay" aria-hidden />

      {/* nav — sticky, scrollspy e hovers no client component */}
      <LandingHeader ctaHref={ctaHref} ctaLabel="Entrar no app" />

      {/* hero — asymmetric: copy left, live radar right */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-24">
        <div>
          <div
            className="hero-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-1.5 text-sm font-medium shadow-[var(--shadow-sm)] backdrop-blur"
            style={{ "--rise-delay": "0ms" } as React.CSSProperties}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-brand" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Compliant by design · Europa
          </div>
          <h1 className="mt-7 text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="hero-rise block" style={{ "--rise-delay": "90ms" } as React.CSSProperties}>
              Ache a dor.
            </span>
            <span className="hero-rise block" style={{ "--rise-delay": "200ms" } as React.CSSProperties}>
              Aborde.
            </span>
            <span
              className="hero-rise block"
              style={
                {
                  "--rise-delay": "310ms",
                  background: "linear-gradient(100deg, var(--brand), var(--brand-hover) 55%, var(--brand))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                } as React.CSSProperties
              }
            >
              Feche o site.
            </span>
          </h1>
          <p
            className="hero-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
            style={{ "--rise-delay": "440ms" } as React.CSSProperties}
          >
            O Osprano varre a Europa atrás de negócios com presença digital fraca, pontua a dor, e a
            IA escreve a abordagem — <strong className="text-foreground">compliant</strong>. Você
            fecha e transforma em receita recorrente.
          </p>
          <div
            className="hero-rise mt-9 flex flex-wrap gap-3"
            style={{ "--rise-delay": "560ms" } as React.CSSProperties}
          >
            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
            >
              {ctaLabel}
              <MdArrowForward size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#como"
              className="rounded-xl border border-border-strong bg-surface px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Ver como funciona
            </a>
          </div>
          <div
            className="hero-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
            style={{ "--rise-delay": "680ms" } as React.CSSProperties}
          >
            {["GDPR compliant", "Só mercados opt-out", "Sem instalar nada"].map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <MdCheck size={16} className="text-brand" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <div
          className="hero-rise relative flex justify-center lg:justify-end"
          style={{ "--rise-delay": "260ms" } as React.CSSProperties}
        >
          <div className="animate-float w-full max-w-[440px]">
            <Radar />
          </div>
        </div>
      </section>

      {/* telemetria — faixa contínua do que o radar está varrendo agora */}
      <div className="relative border-y border-border bg-surface/40">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" aria-hidden />
        <div className="overflow-hidden py-3.5">
          <div className="animate-marquee flex w-max items-center">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
                {SCAN_FEED.map((item) => (
                  <span
                    key={`${dup}-${item}`}
                    className="inline-flex items-center gap-2.5 whitespace-nowrap px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
                  >
                    <span className="h-1 w-1 rounded-full bg-brand/70" />
                    varrendo {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* readouts — medidores com count-up, não "stats de template" */}
      <div className="mx-auto max-w-6xl px-6">
        <Reveal variant="up">
          <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
            {[
              { n: 5, suffix: "", l: "mercados opt-out da UE" },
              { n: 100, prefix: "0–", suffix: "", l: "Digital Presence Score" },
              { n: 48, suffix: "", l: "negócios na primeira varredura" },
              { n: 100, suffix: "%", l: "dos emails com opt-out" },
            ].map((s, i) => (
              <div key={s.l} className="px-6 py-12 text-center">
                <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">
                  <CountUp end={s.n} prefix={s.prefix ?? ""} suffix={s.suffix} duration={1400 + i * 250} />
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* steps — connected timeline, not a card grid */}
      <Section
        id="como"
        index="01"
        eyebrow="Passo a passo"
        title="Do primeiro lead ao cliente fechado."
        subtitle="Seis etapas, na ordem exata em que você trabalha no painel."
      >
        <div className="relative mx-auto max-w-3xl">
          {/* rail com pulso de energia */}
          <div className="rail-pulse absolute bottom-6 left-7 top-6 w-px overflow-hidden bg-border sm:left-[31px]" aria-hidden />
          <div className="space-y-7">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} variant="up" delay={i * 70}>
                <div className="group relative flex gap-5 sm:gap-6">
                  {/* numeral fantasma — editorial, dá escala sem poluir */}
                  <span
                    className="pointer-events-none absolute -top-3 right-0 select-none font-display text-7xl font-bold tabular-nums text-foreground opacity-[0.045] transition-opacity duration-500 group-hover:opacity-[0.09] sm:text-8xl"
                    aria-hidden
                  >
                    0{i + 1}
                  </span>
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-brand shadow-[var(--shadow-sm)] transition-all duration-300 group-hover:border-brand/40 group-hover:shadow-[0_0_24px_-6px_var(--brand)]">
                    <s.icon size={22} />
                  </div>
                  <div className="pt-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold tabular-nums text-faint">
                        0{i + 1}
                      </span>
                      <h3 className="font-display text-lg font-semibold">{s.t}</h3>
                    </div>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">{s.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* product mockup */}
      <Section
        id="produto"
        index="02"
        eyebrow="O produto"
        title="O painel por dentro."
        subtitle="Leads pontuados de um lado, o site já gerado do outro — e a IA pronta pra escrever."
      >
        <Reveal variant="scale">
          <Tilt className="rounded-2xl">
            <ProductMockup />
          </Tilt>
        </Reveal>
      </Section>

      {/* compliant differentiator */}
      <Section>
        <Reveal variant="up">
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white sm:p-14"
          style={{ background: "linear-gradient(135deg, var(--brand-deep), var(--brand))" }}
        >
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay" aria-hidden />
          {/* radar echo texture */}
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full opacity-20"
            style={{
              background:
                "repeating-radial-gradient(circle, rgba(255,255,255,0.5) 0 1px, transparent 1px 32px)",
            }}
            aria-hidden
          />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider">
              <MdOutlineGppGood size={14} /> O diferencial
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              A única prospecção que não te processa.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              As ferramentas de sempre disparam WhatsApp a frio — ilegal na UE e cara. O Osprano só
              aborda onde a lei permite (mercados opt-out), só entidades incorporadas, e com opt-out
              em todo email. Você escala tranquilo.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Mercados opt-out", "UK · Holanda · Irlanda · Suécia · Noruega"],
                ["GDPR-safe", "Base legal + opt-out em cada envio"],
                ["A armadilha do autônomo", "Só incorporados / inbox de função"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-colors duration-300 hover:bg-white/15">
                  <div className="font-semibold">{t}</div>
                  <div className="mt-1 text-sm text-white/70">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </Reveal>
      </Section>

      {/* features — instrument panel grid (hairline dividers, not floating cards) */}
      <Section
        id="recursos"
        index="03"
        eyebrow="Recursos"
        title="Cada tela, e para que ela serve."
        subtitle="Tudo dentro de um painel só — do achar a dor ao fechar com recorrência."
      >
        <Reveal variant="scale" className="mb-16">
          <LaptopShowcase />
        </Reveal>

        <Reveal variant="up">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="group relative overflow-hidden bg-surface p-6 transition-colors duration-300 hover:bg-surface-2">
                {/* halo que acende no hover */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(closest-side, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%)",
                  }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110">
                    <f.icon size={22} />
                  </div>
                  <MdArrowOutward
                    size={18}
                    className="-translate-x-1 translate-y-1 text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                  />
                </div>
                <h3 className="relative mt-4 font-display text-lg font-semibold">{f.t}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* calculator */}
      <Section
        index="04"
        eyebrow="Modelo de receita"
        title="Uma venda única vira receita todo mês."
        subtitle="Cobre pela hospedagem e manutenção enquanto o Osprano faz o trabalho pesado. Ajuste e veja a projeção."
      >
        <Reveal variant="up" className="mx-auto max-w-3xl">
          <RevenueCalculator />
        </Reveal>
      </Section>

      {/* testimonials — pull-quotes editoriais, sem estrelinha de template */}
      <Section title="Quem prospecta com o Osprano, fecha mais.">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} variant="up" delay={i * 100} className="bg-surface">
              <figure className="flex h-full flex-col p-7 sm:p-8">
                <span className="font-display text-6xl font-bold leading-none text-brand/25" aria-hidden>
                  &ldquo;
                </span>
                <blockquote className="mt-2 flex-1 text-balance font-display text-lg font-medium leading-snug text-foreground">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* pricing */}
      <Section
        id="precos"
        index="05"
        eyebrow="Planos"
        title="Escolha o plano e comece a prospectar."
        subtitle="Sem cartão para começar. Sem fidelidade. Cancele quando quiser."
      >
        <Reveal variant="up">
          <Pricing />
        </Reveal>
      </Section>

      {/* faq */}
      <Section id="faq" title="Perguntas frequentes.">
        <Reveal variant="up">
          <Faq />
        </Reveal>
      </Section>

      {/* final cta — painel-radar assinatura (não repete o gradiente do diferencial) */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal variant="scale">
          <div className="gradient-border relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-20 text-center shadow-[var(--shadow-lg)] sm:py-24">
            {/* eco do radar do hero — fecha o círculo da narrativa */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {[34, 58, 82, 106].map((size) => (
                <div
                  key={size}
                  className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 rounded-full border"
                  style={{
                    width: `${size}%`,
                    aspectRatio: "1",
                    borderColor: "color-mix(in srgb, var(--brand) 14%, transparent)",
                  }}
                />
              ))}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 90% at 50% 115%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%)",
                }}
              />
            </div>
            <div className="relative">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse-ring absolute h-full w-full rounded-full bg-brand" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
                radar ligado · 5 mercados
              </div>
              <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl font-bold tracking-tight sm:text-6xl">
                Comece a achar a dor <span style={{ color: "var(--brand)" }}>hoje</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-muted">
                Grátis para começar. Sem cartão. A primeira busca leva menos de um minuto.
              </p>
              <Link
                href={ctaHref}
                className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-brand px-9 py-4 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
              >
                {ctaLabel}
                <MdArrowForward size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>

      {/* footer — editorial, com marca d'água e colunas de navegação */}
      <footer className="relative overflow-hidden border-t border-border">
        {/* wordmark gigante ancorado no fundo */}
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-[0.18em] select-none text-center font-display text-[22vw] font-bold leading-none tracking-tight text-foreground opacity-[0.035] sm:text-[17vw]"
          aria-hidden
        >
          Osprano
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-16">
          <div className="grid gap-12 pb-14 md:grid-cols-[1.3fr_1fr_1fr]">
            {/* marca */}
            <div>
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="font-display text-lg font-bold tracking-tight">Osprano</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                A camada de aquisição de clientes de quem vende presença digital na Europa. Ache a
                dor, aborde compliant, feche com recorrência.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  Mercados
                </span>
                {LAUNCH_MARKETS.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
                    title={MARKETS[c].name}
                  >
                    {MARKETS[c].flag}
                    <span className="font-mono text-[10px] uppercase text-muted">{c}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* navegação */}
            <nav aria-label="Produto">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                Produto
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[
                  ["#como", "Como funciona"],
                  ["#produto", "O painel por dentro"],
                  ["#recursos", "Recursos"],
                  ["#precos", "Preços"],
                  ["#faq", "Perguntas frequentes"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="group inline-flex items-center gap-1.5 text-muted transition-colors hover:text-foreground"
                    >
                      <span className="h-px w-0 bg-brand transition-all duration-300 group-hover:w-3" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* acesso */}
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                Comece agora
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Grátis para começar. A primeira varredura leva menos de um minuto.
              </p>
              <Link
                href={ctaHref}
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              >
                {ctaLabel}
                <MdArrowForward size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* linha final */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              © 2026 Osprano · compliant by design · feito para a Europa
            </div>
            <a
              href="#top"
              className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
            >
              Voltar ao topo
              <MdArrowForward size={13} className="-rotate-90 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
