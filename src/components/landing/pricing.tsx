import Link from "next/link";
import { MdCheck } from "react-icons/md";
import { PAID_PLANS, PLANS } from "@convex/lib/domain";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
const CTA_HREF = DEMO ? "/dashboard" : "/sign-up";

export function Pricing() {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const featured = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[var(--radius)] bg-surface p-6 ${
                featured
                  ? "border-2 border-brand shadow-[var(--shadow-lg)]"
                  : "border border-border shadow-[var(--shadow-sm)]"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-fg">
                  Mais popular
                </span>
              )}
              <h3 className="font-display text-xl font-bold">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tabular-nums">€{plan.price}</span>
                <span className="text-sm text-muted">/mês</span>
              </div>
              <Link
                href={CTA_HREF}
                className={`mt-5 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  featured
                    ? "bg-brand text-brand-fg hover:bg-brand-hover"
                    : "border border-border-strong hover:bg-surface-2"
                }`}
              >
                Escolher {plan.name}
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <MdCheck size={17} className="mt-0.5 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {`Teste grátis: ${PLANS.trial.leadsPerMonth} leads e ${PLANS.trial.aiPerMonth} gerações por IA, um teste grátis por e-mail, não renova, sem cartão.`}
      </p>
    </div>
  );
}
