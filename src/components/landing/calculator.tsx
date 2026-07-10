"use client";

import { useState } from "react";

function eur(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-bold tabular-nums text-brand">{format(value)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-brand"
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export function RevenueCalculator() {
  const [sites, setSites] = useState(5);
  const [price, setPrice] = useState(1500);
  const [maint, setMaint] = useState(60);

  const clients = sites * 12;
  const mrr = clients * maint; // recurring after 12 months
  const monthlySales = sites * price;
  const liberdade = mrr + monthlySales; // total monthly income after 12 months
  const annual = sites * 12 * price + sites * 78 * maint; // one-time sales + ramped maintenance

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-md)] sm:p-8">
      <div className="grid gap-6 sm:grid-cols-3">
        <Slider label="Sites vendidos / mês" value={sites} min={1} max={20} step={1} onChange={setSites} format={(v) => String(v)} />
        <Slider label="Preço à vista" value={price} min={300} max={5000} step={100} onChange={setPrice} format={(v) => `€${eur(v)}`} />
        <Slider label="Manutenção mensal" value={maint} min={20} max={300} step={5} onChange={setMaint} format={(v) => `€${eur(v)}`} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-2 p-5 text-center">
          <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
            Receita recorrente mensal
          </div>
          <div className="mt-1 text-xs text-muted">
            {clients} clientes depois de 12 meses
          </div>
          <div className="mt-2 font-display text-4xl font-bold tabular-nums text-brand">€{eur(mrr)}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 p-5 text-center">
          <div className="font-mono text-[11px] uppercase tracking-wider text-faint">
            Receita anual potencial
          </div>
          <div className="mt-1 text-xs text-muted">vendas à vista + manutenção</div>
          <div className="mt-2 font-display text-4xl font-bold tabular-nums text-foreground">€{eur(annual)}</div>
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl p-7 text-center text-white"
        style={{ background: "linear-gradient(135deg, var(--brand-deep), var(--brand))" }}
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/80">
          Sua renda mensal após 12 meses
        </div>
        <div className="mt-2 font-display text-5xl font-bold tabular-nums sm:text-6xl">€{eur(liberdade)}</div>
        <div className="mt-2 text-sm text-white/70">recorrente + vendas do mês</div>
      </div>
    </div>
  );
}
