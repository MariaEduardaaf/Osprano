"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { MdOpenInNew } from "react-icons/md";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/ui";

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SettingsPage() {
  const ws = useQuery(api.workspaces.current);
  const portal = useAction(api.billing.portal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <PageHeader eyebrow="Conta" title="Settings" subtitle="Plano, uso e assinatura" />

      <div className="max-w-xl space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-faint">Plano</div>
              <div className="mt-1 text-xl font-bold capitalize">{ws?.plan ?? "—"}</div>
            </div>
            <Link
              href="/plans"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg"
            >
              {ws && ws.plan !== "free" ? "Trocar" : "Fazer upgrade"}
            </Link>
          </div>

          {ws && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Leads este mês</span>
                  <span className="tabular-nums">
                    {ws.leadsUsed} / {ws.limits.leads}
                  </span>
                </div>
                <Bar used={ws.leadsUsed} limit={ws.limits.leads} />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Sites este mês</span>
                  <span className="tabular-nums">
                    {ws.sitesUsed} / {ws.limits.sites}
                  </span>
                </div>
                <Bar used={ws.sitesUsed} limit={ws.limits.sites} />
              </div>
            </div>
          )}
        </div>

        {ws && ws.plan !== "free" && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold">Assinatura</div>
            <p className="mt-1 text-sm text-muted">
              Status: {ws.subscriptionStatus ?? "—"}. Gerencie pagamento e cancelamento no portal.
            </p>
            <button
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  const { url } = await portal({});
                  window.location.assign(url);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Falha");
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
            >
              <MdOpenInNew size={16} />
              {busy ? "Abrindo…" : "Abrir portal de billing"}
            </button>
            {err && <p className="mt-2 text-sm text-hot">{err}</p>}
          </div>
        )}
      </div>
    </>
  );
}
