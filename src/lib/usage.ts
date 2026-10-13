export type UsageLevel = "ok" | "warn" | "full";

export interface UsageSnapshot {
  isTrial: boolean;
  trialSpent: boolean;
  leadsUsed: number;
  detailsUsed: number;
  aiUsed: number;
  searchesToday: number;
  limits: { leads: number; details: number; ai: number; searchesPerDay: number };
}

export interface UsageItem {
  key: "leads" | "ai" | "details" | "searches";
  label: string;
  used: number;
  limit: number;
  suffix: string;
  level: UsageLevel;
}

// PLAN-06: aviso em 80% e 100%.
export function usageLevel(used: number, limit: number): UsageLevel {
  if (limit <= 0 || used >= limit) return "full";
  return used >= 0.8 * limit ? "warn" : "ok";
}

export function usageItems(s: UsageSnapshot): UsageItem[] {
  const suffix = s.isTrial ? "no teste" : "/mês";
  const mk = (key: UsageItem["key"], label: string, used: number, limit: number, suf: string): UsageItem => ({
    key,
    label,
    used,
    limit,
    suffix: suf,
    level: usageLevel(used, limit),
  });
  return [
    mk("leads", "Leads", s.leadsUsed, s.limits.leads, suffix),
    mk("ai", "IA", s.aiUsed, s.limits.ai, suffix),
    mk("details", "Google", s.detailsUsed, s.limits.details, suffix),
    mk("searches", "Buscas hoje", s.searchesToday, s.limits.searchesPerDay, "/dia"),
  ];
}

export function usageAlert(s: UsageSnapshot): string | null {
  if (s.trialSpent) return "Seu teste grátis já foi usado. Veja os planos.";
  const items = usageItems(s);
  const full = items.find((i) => i.level === "full");
  if (full) return `Limite de ${full.label} atingido.`;
  const warn = items.find((i) => i.level === "warn");
  if (warn) return `Você já usou ${Math.floor((warn.used / warn.limit) * 100)}% de ${warn.label}.`;
  return null;
}
