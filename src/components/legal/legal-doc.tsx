import type { ReactNode } from "react";
import { LEGAL_DOCS, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION, formatLegalDate, type LegalSlug } from "@convex/lib/legal";
import { PlaceholderNotice } from "./legal-links";

export function LegalDoc({ slug, children }: { slug: LegalSlug; children: ReactNode }) {
  const title = LEGAL_DOCS.find((d) => d.slug === slug)?.title ?? slug;
  return (
    <article>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Versão {LEGAL_VERSION} · Vigente desde {formatLegalDate(LEGAL_EFFECTIVE_DATE)}
      </p>
      <PlaceholderNotice className="mt-4" />
      {process.env.VERCEL_ENV !== "production" && (
        <p role="note" className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
          Rascunho técnico: revisar com advogado antes de cobrar o primeiro cliente. Esta nota não aparece em produção.
        </p>
      )}
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-brand [&_a]:underline [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top">
        {children}
      </div>
    </article>
  );
}
