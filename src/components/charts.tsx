import type { ReactNode } from "react";

export function ChartCard({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-[var(--radius)] p-6 transition-shadow duration-300 hover:shadow-[var(--shadow-lg)] ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {right && <span className="font-mono text-[11px] uppercase tracking-wider text-faint">{right}</span>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Donut for part-to-whole with few segments. Legend carries identity (not color-alone). */
export function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: Segment[];
  centerValue: ReactNode;
  centerLabel: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const size = 132;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // pure cumulative offsets (no mutation in render)
  const arcs = segments.map((s, i) => {
    const before = segments.slice(0, i).reduce((a, x) => a + x.value, 0);
    return { seg: s, len: (s.value / total) * c, offset: (before / total) * c };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          {arcs.map(({ seg: s, len, offset }) => {
            const gap = s.value > 0 && len > 3 ? 2 : 0; // 2px surface gap between fills
            const shown = Math.max(0, len - gap);
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${shown} ${c - shown}`}
                strokeDashoffset={-offset}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold tabular-nums text-foreground">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-wider text-faint">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-mono tabular-nums text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bars (histogram / distribution). Single hue. */
export function VBars({
  bars,
  color = "var(--brand)",
}: {
  bars: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex h-36 items-end gap-2.5">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-2" title={`${b.label}: ${b.value}`}>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] transition-all duration-500"
              style={{
                height: `${(b.value / max) * 100}%`,
                minHeight: b.value > 0 ? 4 : 0,
                background: color,
              }}
            />
          </div>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">{b.value}</span>
          <span className="text-[10px] text-faint">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bars (magnitude across a few named items). Single hue. */
export function HBars({
  rows,
  color = "var(--brand)",
  labelWidth = "6rem",
}: {
  rows: { label: ReactNode; value: number; key: string }[];
  color?: string;
  labelWidth?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3 text-sm">
          <span className="shrink-0 truncate text-muted" style={{ width: labelWidth }}>
            {r.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-[4px] bg-surface-2" title={`${r.value}`}>
            <div
              className="h-full rounded-[4px] transition-all duration-500"
              style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 4 : 0, background: color }}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
