"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { MdCheck } from "react-icons/md";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/ui";
import { PAID_PLANS, PLANS } from "@convex/lib/domain";
import { LEGAL_IDENTITY } from "@convex/lib/legal";
import { errorMessage } from "@/lib/errors";

export default function PlansPage() {
  const ws = useQuery(api.workspaces.current);
  const portal = useAction(api.billing.portal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function manage() {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await portal({});
      window.location.assign(url);
    } catch (e) {
      setErr(errorMessage(e, "Falha"));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assinatura"
        title="Planos"
        subtitle="Beta fechado: a troca de plano é feita pela equipe. Escolha um plano e fale com a gente."
      />
      {err && <p className="mb-4 text-sm text-hot">{err}</p>}

      {ws?.isTrial && (
        <div className="glass mb-4 rounded-[var(--radius)] p-4 text-sm">
          {ws.trialSpent
            ? "Seu teste grátis já foi usado em outra conta. Escolha um plano para continuar."
            : `Você está no teste grátis: ${PLANS.trial.leadsPerMonth} leads e ${PLANS.trial.aiPerMonth} gerações por IA, um teste grátis por e-mail, não renova.`}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const isCurrent = ws?.plan === plan.id;
          const featured = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={`glass relative flex flex-col rounded-[var(--radius)] p-6 ${
                featured ? "border-2 border-brand" : ""
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
                  <li key={f} className="flex items-start gap-2">
                    <MdCheck size={17} className="mt-0.5 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-lg bg-surface-2 py-2 text-center text-sm font-semibold text-muted">
                    Plano atual
                  </div>
                ) : (
                  <a
                    href={`mailto:${LEGAL_IDENTITY.supportEmail}?subject=${encodeURIComponent(`Quero o plano ${plan.name}`)}`}
                    className="block w-full rounded-lg bg-brand py-2 text-center text-sm font-semibold text-brand-fg"
                  >
                    Pedir este plano
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ws?.subscriptionStatus && (
        <button
          onClick={manage}
          disabled={busy}
          className="mt-6 text-sm font-medium text-muted hover:text-foreground hover:underline"
        >
          Gerenciar assinatura no portal Stripe →
        </button>
      )}
    </>
  );
}
