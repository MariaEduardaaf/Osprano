import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MdOutlineTravelExplore, MdOutlineForwardToInbox, MdOutlineLanguage } from "react-icons/md";
import type { IconType } from "react-icons";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

const STEPS: { n: string; t: string; d: string; Icon: IconType }[] = [
  { n: "01", t: "Ache a dor", d: "Negócios locais com presença digital fraca, pontuados pela dor.", Icon: MdOutlineTravelExplore },
  { n: "02", t: "Aborde", d: "A IA escreve o email — compliant, só onde é legal.", Icon: MdOutlineForwardToInbox },
  { n: "03", t: "Feche o site", d: "Preview rastreado: você sabe na hora que abriram.", Icon: MdOutlineLanguage },
];

export default async function Home() {
  const userId = DEMO ? null : (await auth()).userId;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 12% 8%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 60%), radial-gradient(50% 40% at 100% 0%, color-mix(in srgb, var(--warm) 12%, transparent), transparent 55%)",
        }}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="var(--brand)" strokeWidth="1.5" opacity="0.4" />
            <circle cx="12" cy="12" r="5" stroke="var(--brand)" strokeWidth="1.5" opacity="0.7" />
            <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
          </svg>
          <span className="font-display text-lg font-bold tracking-tight">sitescout</span>
        </div>
        <Link
          href={DEMO || userId ? "/dashboard" : "/sign-in"}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          {DEMO ? "Ver demo" : userId ? "Dashboard" : "Entrar"}
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-brand">
          Prospecção compliant · Europa
        </div>
        <h1 className="mt-6 max-w-4xl text-balance font-display text-6xl font-bold leading-[0.98] tracking-tight sm:text-8xl">
          Ache a dor.
          <br />
          Feche o site.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
          Encontre negócios locais europeus com presença digital fraca, pontue a dor com o Digital
          Presence Score e aborde por email — <strong className="text-foreground">compliant by
          design</strong>.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          {DEMO ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03]"
            >
              Entrar no app (demo) →
            </Link>
          ) : userId ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03]"
            >
              Ir pro Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-brand-fg shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03]"
              >
                Começar
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-border-strong px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-surface-2"
              >
                Entrar
              </Link>
            </>
          )}
        </div>

        {/* steps */}
        <div className="mt-20 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-surface p-6">
              <div className="flex items-center justify-between">
                <s.Icon size={24} className="text-brand" />
                <span className="font-mono text-xs font-semibold text-brand">{s.n}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
            Mercados de largada
          </span>
          {LAUNCH_MARKETS.map((code) => (
            <span
              key={code}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium"
            >
              {MARKETS[code].flag} {MARKETS[code].name}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
