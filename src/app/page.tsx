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
  MdStar,
} from "react-icons/md";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";
import { ProductMockup } from "@/components/landing/mockup";
import { Radar } from "@/components/landing/radar";
import { RevenueCalculator } from "@/components/landing/calculator";
import { Faq } from "@/components/landing/faq";
import { Pricing } from "@/components/landing/pricing";

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
    <section id={id} className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      {(eyebrow || title) && (
        <div className="mb-14 border-t border-border pt-8">
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
        </div>
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
    <div className="relative overflow-hidden">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]"
        style={{
          background:
            "radial-gradient(50% 40% at 78% 8%, color-mix(in srgb, var(--brand) 20%, transparent), transparent 68%), radial-gradient(45% 35% at 10% 4%, color-mix(in srgb, var(--brand-deep) 12%, transparent), transparent 60%)",
        }}
      />

      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">Osprano</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#como" className="hover:text-foreground">Como funciona</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#precos" className="hover:text-foreground">Preços</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <Link
            href={ctaHref}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover"
          >
            Entrar no app
          </Link>
        </div>
      </header>

      {/* hero — asymmetric: copy left, live radar right */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium shadow-[var(--shadow-sm)]">
            <MdOutlineGppGood size={16} className="text-brand" />
            Compliant by design · Europa
          </div>
          <h1 className="mt-7 text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Ache a dor. Aborde.{" "}
            <span style={{ color: "var(--brand)" }}>Feche o site.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            O Osprano varre a Europa atrás de negócios com presença digital fraca, pontua a dor, e a
            IA escreve a abordagem — <strong className="text-foreground">compliant</strong>. Você
            fecha e transforma em receita recorrente.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03]"
            >
              {ctaLabel}
              <MdArrowForward size={18} />
            </Link>
            <a
              href="#como"
              className="rounded-xl border border-border-strong bg-surface px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Ver como funciona
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {["GDPR compliant", "Só mercados opt-out", "Sem instalar nada"].map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <MdCheck size={16} className="text-brand" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <Radar />
        </div>
      </section>

      {/* stats — instrument readouts */}
      <div className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          {[
            { v: "5", l: "mercados opt-out da UE" },
            { v: "0–100", l: "Digital Presence Score" },
            { v: "GDPR", l: "compliant em cada email" },
            { v: "MRR", l: "hospedagem white-label" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl font-bold tabular-nums sm:text-4xl">{s.v}</div>
              <div className="mt-1 text-sm text-muted">{s.l}</div>
            </div>
          ))}
        </div>
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
          {/* rail */}
          <div className="absolute bottom-6 left-7 top-6 w-px bg-border sm:left-[31px]" aria-hidden />
          <div className="space-y-7">
            {STEPS.map((s, i) => (
              <div key={s.t} className="relative flex gap-5 sm:gap-6">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-brand shadow-[var(--shadow-sm)]">
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
        <ProductMockup />
      </Section>

      {/* compliant differentiator */}
      <Section>
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white sm:p-14"
          style={{ background: "linear-gradient(135deg, var(--brand-deep), var(--brand))" }}
        >
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
                <div key={t} className="rounded-xl bg-white/10 p-4">
                  <div className="font-semibold">{t}</div>
                  <div className="mt-1 text-sm text-white/70">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* features — instrument panel grid (hairline dividers, not floating cards) */}
      <Section
        id="recursos"
        index="03"
        eyebrow="Recursos"
        title="Cada tela, e para que ela serve."
        subtitle="Tudo dentro de um painel só — do achar a dor ao fechar com recorrência."
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="group bg-surface p-6 transition-colors hover:bg-surface-2">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <f.icon size={22} />
                </div>
                <MdArrowOutward
                  size={18}
                  className="text-faint opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* calculator */}
      <Section
        index="04"
        eyebrow="Modelo de receita"
        title="Uma venda única vira receita todo mês."
        subtitle="Cobre pela hospedagem e manutenção enquanto o Osprano faz o trabalho pesado. Ajuste e veja a projeção."
      >
        <div className="mx-auto max-w-3xl">
          <RevenueCalculator />
        </div>
      </Section>

      {/* testimonials */}
      <Section title="Quem prospecta com o Osprano, fecha mais.">
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
              <div className="flex gap-0.5 text-warm">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MdStar key={i} size={16} />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">&quot;{t.quote}&quot;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-brand-fg">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </div>
            </div>
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
        <Pricing />
      </Section>

      {/* faq */}
      <Section id="faq" title="Perguntas frequentes.">
        <Faq />
      </Section>

      {/* final cta */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center text-white sm:py-20"
          style={{ background: "linear-gradient(135deg, var(--brand-deep), var(--brand))" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,0.4) 0 1px, transparent 1px 40px)",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Comece a achar a dor hoje.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/80">
              Grátis para começar. Sem cartão. A primeira busca leva menos de um minuto.
            </p>
            <Link
              href={ctaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-brand-deep transition-transform hover:scale-[1.03]"
            >
              {ctaLabel}
              <MdArrowForward size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-base font-bold">Osprano</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Mercados</span>
            {LAUNCH_MARKETS.map((c) => (
              <span key={c} className="text-sm" title={MARKETS[c].name}>
                {MARKETS[c].flag}
              </span>
            ))}
          </div>
          <div className="text-xs text-faint">© 2026 Osprano · compliant by design</div>
        </div>
      </footer>
    </div>
  );
}
