import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {eyebrow && (
          <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[2rem] font-bold leading-none tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        {subtitle && <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-faint">
          {label}
        </div>
        {icon && <span className={accent ? "text-brand" : "text-faint"}>{icon}</span>}
      </div>
      <div
        className={`mt-3 font-display text-[2.5rem] font-semibold leading-none tabular-nums ${
          accent ? "text-brand" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border-strong bg-surface/40 px-6 py-16 text-center">
      <p className="font-display text-lg font-medium text-foreground">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

const TONE: Record<string, string> = {
  brand: "text-brand border-brand/25 bg-brand-soft",
  hot: "text-hot border-hot/30 bg-hot/10",
  warm: "text-warm border-warm/30 bg-warm/10",
  cold: "text-cold border-cold/30 bg-cold/10",
  neutral: "text-muted border-border bg-surface-2",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "brand" | "hot" | "warm" | "cold" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const TIER_COLOR: Record<string, string> = {
  hot: "var(--hot)",
  warm: "var(--warm)",
  cold: "var(--cold)",
};

/** Radial score meter — the signature detail on lead cards. */
export function ScoreDonut({
  score,
  tier,
  size = 46,
}: {
  score: number;
  tier: "hot" | "warm" | "cold";
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = TIER_COLOR[tier];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
