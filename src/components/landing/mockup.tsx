const LEADS = [
  { name: "The Oak & Barrel", meta: "Restaurante · Manchester", tier: "Quente", tone: "hot", score: 92, noSite: true },
  { name: "Jansen Kappers", meta: "Salão · Amsterdam", tier: "Quente", tone: "hot", score: 78, noSite: true },
  { name: "Dublin Corner Café", meta: "Café · Dublin", tier: "Morno", tone: "warm", score: 64, noSite: false },
  { name: "Cork Barber Co", meta: "Barbearia · Cork", tier: "Frio", tone: "cold", score: 41, noSite: true },
];

const TONE: Record<string, string> = {
  hot: "text-hot border-hot/30 bg-hot/10",
  warm: "text-warm border-warm/30 bg-warm/10",
  cold: "text-cold border-cold/30 bg-cold/10",
};
const SCORE_COLOR: Record<string, string> = { hot: "var(--hot)", warm: "var(--warm)", cold: "var(--cold)" };

export function ProductMockup() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lg)]">
      {/* browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-hot/70" />
          <span className="h-3 w-3 rounded-full bg-warm/70" />
          <span className="h-3 w-3 rounded-full bg-brand/70" />
        </div>
        <div className="mx-auto rounded-md bg-surface px-4 py-1 font-mono text-[11px] text-faint">
          app.osprano.com/leads
        </div>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {/* leads */}
        <div className="bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Leads encontrados</span>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
              +48 novos
            </span>
          </div>
          <div className="space-y-2.5">
            {LEADS.map((l) => (
              <div key={l.name} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <span
                  className="font-display text-base font-bold tabular-nums"
                  style={{ color: SCORE_COLOR[l.tone] }}
                >
                  {l.score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.name}</div>
                  <div className="truncate text-[11px] text-muted">{l.meta}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${TONE[l.tone]}`}>
                  {l.tier}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* generated site */}
        <div className="bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Site gerado</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Publicado
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="bg-[#0e0d0a] p-5 text-center">
              <div className="font-display text-sm font-bold text-[#f4f1e9]">The Oak & Barrel</div>
              <div className="mt-1 text-[10px] text-[#f4f1e9]/60">Tradição em Manchester desde 1998</div>
              <div className="mx-auto mt-3 w-fit rounded-full bg-[#f4f1e9] px-3 py-1 text-[10px] font-semibold text-[#0e0d0a]">
                Reservar mesa
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-surface-2 p-3">
              <div className="h-8 rounded bg-warm/25" />
              <div className="h-8 rounded bg-brand/25" />
              <div className="h-8 rounded bg-hot/25" />
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-muted">
            <span className="font-semibold text-brand">✦ IA:</span> abordagem escrita citando &quot;seu site
            aparece como não-seguro no celular&quot;
          </div>
        </div>
      </div>
    </div>
  );
}
