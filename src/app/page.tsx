import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MARKETS, LAUNCH_MARKETS } from "@convex/lib/domain";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export default async function Home() {
  const userId = DEMO ? null : (await auth()).userId;
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-20">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">sitescout</span>
      <h1 className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Ache a dor. Aborde por email. Feche o site.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Encontre negócios locais europeus com presença digital fraca, pontue a dor com o Digital
        Presence Score e aborde por email —{" "}
        <strong className="text-foreground">compliant by design</strong>.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {DEMO ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg"
          >
            Entrar no app (demo) →
          </Link>
        ) : userId ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg"
          >
            Ir pro Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/sign-up"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg"
            >
              Começar
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-2"
            >
              Entrar
            </Link>
          </>
        )}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-faint">Mercados de largada</span>
        {LAUNCH_MARKETS.map((code) => (
          <span
            key={code}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium"
          >
            {MARKETS[code].flag} {MARKETS[code].name}
          </span>
        ))}
      </div>
    </div>
  );
}
