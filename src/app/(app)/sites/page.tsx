"use client";

import { useQuery } from "convex/react";
import { MdOpenInNew, MdOutlineLanguage } from "react-icons/md";
import { api } from "@convex/_generated/api";
import { PageHeader, EmptyState } from "@/components/ui";
import { PublishButton } from "@/components/publish-button";

const TIER_COLOR: Record<string, string> = { hot: "var(--hot)", warm: "var(--warm)", cold: "var(--cold)" };

/** Stylized mini-site thumbnail — evokes the generated preview. */
function SiteThumb({ published }: { published: boolean }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-[#0c1120]">
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-white/25" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
      </div>
      {/* fake site content */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <div className="h-2 w-14 rounded-full bg-white/25" />
          <div className="flex gap-1">
            <div className="h-1.5 w-5 rounded-full bg-white/15" />
            <div className="h-1.5 w-5 rounded-full bg-white/15" />
          </div>
        </div>
        <div
          className="h-9 rounded-md"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--brand) 45%, transparent), color-mix(in srgb, var(--brand-deep) 30%, transparent))" }}
        />
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-5 rounded bg-white/10" />
          <div className="h-5 rounded bg-white/10" />
          <div className="h-5 rounded bg-white/10" />
        </div>
      </div>
      {/* status badge */}
      <span
        className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
          published ? "bg-brand/20 text-brand" : "bg-white/10 text-white/70"
        }`}
      >
        {published ? "Publicado" : "Preview"}
      </span>
    </div>
  );
}

export default function SitesPage() {
  const sites = useQuery(api.previews.listSites, {});

  return (
    <>
      <PageHeader
        eyebrow="White-label"
        title="Meus Projetos"
        subtitle="Previews gerados e sites publicados"
      />

      {sites === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : sites.length === 0 ? (
        <EmptyState title="Nenhum site ainda">
          Vá em Leads, gere um preview e publique — vira um site white-label com URL própria.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <div
              key={s._id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <SiteThumb published={s.published} />

              <div className="mt-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold leading-tight">{s.name}</h3>
                  <p className="mt-1 truncate text-xs text-muted">
                    {(s.category ?? "—").replace(/_/g, " ")}
                    {s.city ? ` · ${s.city}` : ""}
                  </p>
                </div>
                {s.score != null && (
                  <span
                    className="shrink-0 font-display text-xl font-bold leading-none tabular-nums"
                    style={{ color: TIER_COLOR[s.tier] ?? "var(--cold)" }}
                  >
                    {s.score}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
                <MdOutlineLanguage size={13} />
                {s.openCount} {s.openCount === 1 ? "abertura" : "aberturas"}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3.5">
                <a
                  href={`/p/${s.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground hover:underline"
                >
                  Preview <MdOpenInNew size={13} />
                </a>
                <PublishButton leadId={s.leadId} slug={s.slug} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
