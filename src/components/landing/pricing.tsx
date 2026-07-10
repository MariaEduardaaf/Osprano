"use client";

import { useState } from "react";
import Link from "next/link";
import { MdCheck } from "react-icons/md";
import { PLANS } from "@convex/lib/domain";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
const CTA_HREF = DEMO ? "/dashboard" : "/sign-up";

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-sm)]">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              !annual ? "bg-brand text-brand-fg" : "text-muted"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              annual ? "bg-brand text-brand-fg" : "text-muted"
            }`}
          >
            Anual
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${annual ? "bg-white/20" : "bg-brand-soft text-brand"}`}>
              −30%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const featured = plan.id === "pro";
          const monthly = annual ? Math.round(plan.price * 0.7) : plan.price;
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
                <span className="font-display text-4xl font-bold tabular-nums">
                  {plan.price === 0 ? "Grátis" : `€${monthly}`}
                </span>
                {plan.price !== 0 && <span className="text-sm text-muted">/mês</span>}
              </div>
              <Link
                href={CTA_HREF}
                className={`mt-5 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  featured
                    ? "bg-brand text-brand-fg hover:bg-brand-hover"
                    : "border border-border-strong hover:bg-surface-2"
                }`}
              >
                {plan.price === 0 ? "Começar grátis" : `Escolher ${plan.name}`}
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
    </div>
  );
}
