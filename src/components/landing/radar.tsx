const TONE: Record<string, string> = {
  hot: "var(--hot)",
  warm: "var(--warm)",
  cold: "var(--cold)",
};

// blips positioned by radius (% from center) + angle, so they sit inside the rings
type Blip = { top: string; left: string; score: number; tone: "hot" | "warm" | "cold"; city: string; delay: string };

const BLIPS: Blip[] = [
  { top: "20%", left: "30%", score: 92, tone: "hot", city: "Manchester", delay: "0s" },
  { top: "34%", left: "72%", score: 78, tone: "hot", city: "Amsterdam", delay: "0.9s" },
  { top: "66%", left: "60%", score: 64, tone: "warm", city: "Dublin", delay: "1.7s" },
  { top: "72%", left: "28%", score: 41, tone: "cold", city: "Cork", delay: "2.6s" },
  { top: "50%", left: "84%", score: 71, tone: "warm", city: "Bergen", delay: "3.4s" },
];

export function Radar() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] select-none">
      {/* ambient glow */}
      <div
        className="absolute inset-[-12%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 22%, transparent), transparent 62%)",
        }}
      />

      {/* dish */}
      <div className="absolute inset-0 overflow-hidden rounded-full border border-border-strong bg-surface/60 shadow-[var(--shadow-lg)] backdrop-blur-sm">
        {/* concentric rings */}
        {[86, 62, 38].map((size) => (
          <div
            key={size}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              width: `${size}%`,
              height: `${size}%`,
              borderColor: "color-mix(in srgb, var(--brand) 22%, transparent)",
            }}
          />
        ))}

        {/* crosshair */}
        <div
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
          style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}
        />
        <div
          className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2"
          style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}
        />

        {/* rotating sweep */}
        <div
          className="animate-radar-spin absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--brand) 26%, transparent) 42deg, transparent 68deg)",
          }}
        />

        {/* center */}
        <div
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--brand)", boxShadow: "0 0 14px 2px var(--brand)" }}
        />
      </div>

      {/* blips (above dish so labels stay crisp) */}
      {BLIPS.map((b) => (
        <div
          key={b.city}
          className="animate-blip absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ top: b.top, left: b.left, animationDelay: b.delay }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
              style={{ background: TONE[b.tone], boxShadow: `0 0 10px ${TONE[b.tone]}` }}
            />
            <span
              className="rounded-md border bg-surface/90 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums shadow-[var(--shadow-sm)] backdrop-blur-sm"
              style={{ color: TONE[b.tone], borderColor: `color-mix(in srgb, ${TONE[b.tone]} 40%, transparent)` }}
            >
              {b.score}
            </span>
          </div>
          <span className="mt-0.5 block pl-4 font-mono text-[9px] uppercase tracking-wider text-faint">
            {b.city}
          </span>
        </div>
      ))}

      {/* corner readout — instrument feel */}
      <div className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1 font-mono text-[10px] text-muted shadow-[var(--shadow-md)]">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-ring rounded-full bg-brand align-middle" />
        varrendo 5 mercados · 48 negócios detectados
      </div>
    </div>
  );
}
