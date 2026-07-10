"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader, EmptyState } from "@/components/ui";
import { OutreachComposer } from "@/components/outreach-composer";

export default function OutreachPage() {
  const leads = useQuery(api.leads.list, {});
  const emailable = (leads ?? []).filter((l) => l.emailable);

  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle="Abordagem por email escrita pela IA — compliant by design"
      />

      {leads === undefined ? (
        <p className="text-sm text-faint">Carregando…</p>
      ) : emailable.length === 0 ? (
        <EmptyState title="Nenhum lead abordável ainda">
          Só entram aqui leads de mercados opt-out (UK/NL/IE/SE/NO) que passam no guardrail de
          compliance. Descubra na aba Leads.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {emailable.map((lead) => (
            <div key={lead._id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{lead.name}</h3>
                  <p className="truncate text-xs text-muted">
                    {lead.category ?? "—"}
                    {lead.city ? ` · ${lead.city}` : ""} · Score {lead.score ?? "—"} ·{" "}
                    {lead.stage}
                  </p>
                </div>
                <OutreachComposer leadId={lead._id} hasEmail={!!lead.email} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
