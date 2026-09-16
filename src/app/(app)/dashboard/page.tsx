"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  MdOutlineTravelExplore,
  MdOutlineWebAsset,
  MdOutlineMarkEmailRead,
  MdOutlineCheckCircle,
} from "react-icons/md";
import { PageHeader, StatCard } from "@/components/ui";
import { eventDot, eventIcon } from "@/components/event-glyph";
import { ChartCard, Donut, VBars, HBars } from "@/components/charts";
import { PIPELINE_STAGES, MARKETS } from "@convex/lib/domain";

const STAGE_COLOR: Record<string, string> = {
  base: "var(--cold)",
  approached: "var(--brand)",
  scheduled: "var(--warm)",
  followup: "var(--warm)",
  converted: "var(--brand)",
  lost: "var(--faint)",
};

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

const SIGNAL_LABEL: Record<string, string> = {
  noSite: "Sem site",
  socialOnly: "Só social",
  noHttps: "Sem HTTPS",
  notMobile: "Não-mobile",
  slow: "Lento",
  sparseProfile: "Perfil fraco",
};

function eventLabel(type: string, meta: { to?: string; channel?: string } | null): string {
  switch (type) {
    case "preview_open":
      return "abriu o preview";
    case "email_sent":
      return meta?.channel === "whatsapp" ? "recebeu WhatsApp" : "abordado por email";
    case "reply":
      return "respondeu";
    case "stage_change":
      return meta?.to ? `movido para ${meta.to}` : "mudou de estágio";
    default:
      return type;
  }
}

function ago(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function DashboardPage() {
  const stats = useQuery(api.leads.stats);
  const analytics = useQuery(api.leads.analytics);
  const activity = useQuery(api.events.recent);
  const total = stats?.total ?? 0;
  const by = stats?.byStage;
  const abordados = by ? total - by.base : 0;
  const rates = [
    { key: "conv", label: "Taxa de conversão", value: pct(by?.converted ?? 0, total), desc: "Convertidos / Total — o KPI principal do funil.", color: "var(--brand)" },
    { key: "abord", label: "Taxa de abordagem", value: pct(abordados, total), desc: "Abordados / Total — quanto da base está sendo trabalhado.", color: "var(--brand)" },
    { key: "agend", label: "Taxa de agendamento", value: pct(by?.scheduled ?? 0, abordados), desc: "Agendados / Abordados — eficiência da abordagem fria.", color: "var(--warm)" },
    { key: "fup", label: "Taxa de follow up", value: pct(by?.followup ?? 0, abordados), desc: "Follow Up / Abordados — estado transitório; muitos = pipeline parado.", color: "var(--warm)" },
    { key: "perd", label: "Taxa de perdidos", value: pct(by?.lost ?? 0, abordados), desc: "Perdidos / Abordados — problema no script ou no perfil.", color: "var(--hot)" },
  ];

  const countryRows = Object.entries(analytics?.byCountry ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([code, value]) => ({
      key: code,
      value,
      label: (
        <span className="flex items-center gap-1.5">
          <span>{MARKETS[code]?.flag ?? "🏳️"}</span>
          <span className="truncate">{MARKETS[code]?.name ?? code}</span>
        </span>
      ),
    }));

  const signalRows = Object.entries(analytics?.signals ?? {})
    .map(([key, value]) => ({ key, value, label: SIGNAL_LABEL[key] ?? key }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Dashboard" subtitle="A saúde da sua operação num relance" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Leads" value={stats?.total ?? "—"} hint="na base" icon={<MdOutlineTravelExplore size={18} />} />
        <StatCard label="Sem site / social" value={stats?.noSite ?? "—"} hint="maior intenção" icon={<MdOutlineWebAsset size={18} />} />
        {/* OPTIN-04: a métrica agora sai de canContactByEmail no servidor — inclui quem deu
            consentimento explícito, então a copy não pode falar só do regime do mercado. */}
        <StatCard label="Abordáveis" value={stats?.emailable ?? "—"} hint="opt-out ou com consentimento" icon={<MdOutlineMarkEmailRead size={18} />} />
        <StatCard label="Convertidos" value={stats?.byStage.converted ?? "—"} hint="fechados" accent icon={<MdOutlineCheckCircle size={18} />} />
      </div>

      {/* Funnel rates */}
      <div className="mt-6">
        <ChartCard title="Taxas do funil" right="performance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {rates.map((r) => (
              <div key={r.key} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="text-xs font-semibold text-foreground">{r.label}</span>
                </div>
                <div
                  className="mt-2 font-display text-3xl font-bold tabular-nums"
                  style={{ color: r.color }}
                >
                  {r.value}%
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${r.value}%`, background: r.color }}
                  />
                </div>
                <p className="mt-2.5 text-[11px] leading-snug text-muted">{r.desc}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Funnel + tier donut */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard title="Funil de conversão" right={`${total} leads`} className="lg:col-span-3">
          <div className="space-y-3">
            {PIPELINE_STAGES.map((s) => {
              const count = stats?.byStage[s.id] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-3" title={`${s.label}: ${count}`}>
                  <span className="w-24 shrink-0 text-xs text-muted">{s.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                    <div
                      className="flex h-full items-center justify-end rounded-md px-2 transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, count > 0 ? 7 : 0)}%`,
                        backgroundColor: STAGE_COLOR[s.id],
                        opacity: count > 0 ? 0.92 : 0,
                      }}
                    >
                      {count > 0 && <span className="font-mono text-[10px] font-bold text-white/95">{count}</span>}
                    </div>
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-faint">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Por temperatura" className="lg:col-span-2">
          <Donut
            centerValue={total}
            centerLabel="leads"
            segments={[
              { label: "Quente", value: analytics?.tiers.hot ?? 0, color: "var(--hot)" },
              { label: "Morno", value: analytics?.tiers.warm ?? 0, color: "var(--warm)" },
              { label: "Frio", value: analytics?.tiers.cold ?? 0, color: "var(--cold)" },
            ]}
          />
        </ChartCard>
      </div>

      {/* Score distribution + signals */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard title="Distribuição de Score" right="dor" className="lg:col-span-2">
          <VBars
            bars={[
              { label: "0", value: analytics?.scoreBuckets[0] ?? 0 },
              { label: "20", value: analytics?.scoreBuckets[1] ?? 0 },
              { label: "40", value: analytics?.scoreBuckets[2] ?? 0 },
              { label: "60", value: analytics?.scoreBuckets[3] ?? 0 },
              { label: "80", value: analytics?.scoreBuckets[4] ?? 0 },
            ]}
          />
        </ChartCard>

        <ChartCard title="Sinais mais comuns" className="lg:col-span-3">
          {signalRows.length ? (
            <HBars rows={signalRows} labelWidth="6.5rem" />
          ) : (
            <p className="text-sm text-faint">Sem dados ainda.</p>
          )}
        </ChartCard>
      </div>

      {/* Country + activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard title="Leads por país" className="lg:col-span-2">
          {countryRows.length ? (
            <HBars rows={countryRows} labelWidth="7rem" />
          ) : (
            <p className="text-sm text-faint">Sem dados ainda.</p>
          )}
        </ChartCard>

        <ChartCard title="Atividade recente" className="lg:col-span-3">
          {activity === undefined ? (
            <p className="text-sm text-faint">Carregando…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-faint">Aberturas de preview aparecem aqui — o sinal de compra.</p>
          ) : (
            <ul className="space-y-3.5">
              {activity.map((e) => (
                <li key={e._id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0" style={{ color: eventDot(e.type) }}>
                    {eventIcon(e.type, e.meta)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-medium text-foreground">{e.leadName ?? "Lead"}</span>{" "}
                    <span className="text-muted">{eventLabel(e.type, e.meta)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{ago(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}
