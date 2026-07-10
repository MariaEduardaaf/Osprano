"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/ui";
import { PLANS } from "@convex/lib/domain";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Falha";
}

export default function PlansPage() {
  const ws = useQuery(api.workspaces.current);
  const checkout = useAction(api.billing.createCheckout);
  const portal = useAction(api.billing.portal);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const current = ws?.plan ?? "free";

  async function subscribe(plan: "pro" | "agency") {
    setBusy(plan);
    setErr(null);
    try {
      const { url } = await checkout({ plan });
      window.location.assign(url);
    } catch (e) {
      setErr(msg(e));
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    setErr(null);
    try {
      const { url } = await portal({});
      window.location.assign(url);
    } catch (e) {
      setErr(msg(e));
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Planos" subtitle="Escale a operação — compliant by design em todos" />
      {err && <p className="mb-4 text-sm text-hot">{err}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = current === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-surface p-6 ${
                plan.id === "pro" ? "border-brand" : "border-border"
              }`}
            >
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums">€{plan.price}</span>
                <span className="text-sm text-muted">/mês</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-lg bg-surface-2 py-2 text-center text-sm font-semibold text-muted">
                    Plano atual
                  </div>
                ) : plan.id === "free" ? (
                  current !== "free" ? (
                    <button
                      onClick={manage}
                      disabled={busy === "portal"}
                      className="w-full rounded-lg border border-border py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-50"
                    >
                      Gerenciar assinatura
                    </button>
                  ) : null
                ) : (
                  <button
                    onClick={() => subscribe(plan.id as "pro" | "agency")}
                    disabled={busy === plan.id}
                    className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-fg disabled:opacity-50"
                  >
                    {busy === plan.id ? "Abrindo…" : `Assinar ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {current !== "free" && (
        <button
          onClick={manage}
          disabled={busy === "portal"}
          className="mt-6 text-sm font-medium text-muted hover:text-foreground hover:underline"
        >
          Gerenciar assinatura no portal Stripe →
        </button>
      )}
    </>
  );
}
