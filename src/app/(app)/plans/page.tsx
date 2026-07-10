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
      <PageHeader
        eyebrow="Assinatura"
        title="Planos"
        subtitle="Escale a operação — compliant by design em todos"
      />
      {err && <p className="mb-4 text-sm text-hot">{err}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = current === plan.id;
          const featured = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[var(--radius)] bg-surface p-6 shadow-[var(--shadow-sm)] ${
                featured
                  ? "border-2 border-brand shadow-[var(--shadow-md)]"
                  : "border border-border"
              }`}
            >
              {featured && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-brand px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-fg">
                  Popular
                </span>
              )}
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tabular-nums">€{plan.price}</span>
                <span className="text-sm text-muted">/mês</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="mt-0.5 text-brand">✓</span>
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
