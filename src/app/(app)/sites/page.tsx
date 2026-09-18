"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { MdOpenInNew, MdOutlineLanguage } from "react-icons/md";
import { api } from "@convex/_generated/api";
import { PageHeader, EmptyState } from "@/components/ui";
import { PublishButton } from "@/components/publish-button";
import { TEMPLATES } from "@/components/site-templates";
import { TemplateThumb } from "@/components/site-templates/template-thumb";

const TIER_COLOR: Record<string, string> = { hot: "var(--hot)", warm: "var(--warm)", cold: "var(--cold)" };

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
              className="glass flex flex-col rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-lg)]"
            >
              <div className="relative">
                <TemplateThumb
                  template={s.template}
                  palette={s.palette}
                  name={s.name}
                  className="rounded-xl border border-border"
                />
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                    s.published ? "bg-brand/20 text-brand" : "bg-black/40 text-white/80"
                  }`}
                >
                  {s.published ? "Publicado" : "Preview"}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                {TEMPLATES[s.template].name}
              </p>

              <div className="mt-2 flex items-start justify-between gap-2">
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

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
                <Link
                  href={`/crm/${s.leadId}/site?from=sites`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2"
                >
                  Editar
                </Link>
                <a
                  href={s.published && s.slug ? `/site/${s.slug}` : `/p/${s.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground hover:underline"
                >
                  Abrir <MdOpenInNew size={13} />
                </a>
                <div className="ml-auto">
                  <PublishButton leadId={s.leadId} slug={s.slug} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
