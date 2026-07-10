"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader, EmptyState } from "@/components/ui";
import { PublishButton } from "@/components/publish-button";

export default function SitesPage() {
  const sites = useQuery(api.previews.listSites, {});

  return (
    <>
      <PageHeader title="Meus Projetos" subtitle="Previews gerados e sites publicados" />

      {sites === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : sites.length === 0 ? (
        <EmptyState title="Nenhum site ainda">
          Vá em Leads, gere um preview e publique — vira um site white-label com URL própria.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {sites.map((s) => (
            <div
              key={s._id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{s.name}</h3>
                  {s.published ? (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      Publicado
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                      Preview
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {s.city ?? "—"} · {s.openCount} aberturas
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={`/p/${s.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-muted hover:text-foreground hover:underline"
                >
                  Preview ↗
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
