import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { dailyLimitFor, dayKey, limitFor, planOf, PLANS, type DailyKind, type MonthlyKind, type UsageKind } from "../lib/domain.ts";
import { userError } from "../lib/errors.ts";
import { isAccepted, LEGAL_VERSION } from "../lib/legal.ts";
import { isDemoEnabled } from "./tenant.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function getWorkspace(ctx: QueryCtx | MutationCtx, orgId: string) {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
}

export async function ensureWorkspace(ctx: MutationCtx, orgId: string): Promise<Doc<"workspaces">> {
  const existing = await getWorkspace(ctx, orgId);
  if (existing) return existing;
  const id = await ctx.db.insert("workspaces", {
    orgId,
    plan: "trial",
    leadsUsed: 0,
    sitesUsed: 0,
    detailsUsed: 0,
    periodStart: Date.now(),
  });
  const ws = await ctx.db.get(id);
  // Invariante (get logo após insert): Error comum de propósito — não é mensagem pra usuária.
  if (!ws) throw new Error("Falha ao criar workspace");
  return ws;
}

/** Ensure the workspace exists, reset daily counters on a new UTC day and, for paid plans,
 *  monthly usage when the period rolled over. */
export async function ensureFresh(ctx: MutationCtx, orgId: string): Promise<Doc<"workspaces">> {
  let ws = await ensureWorkspace(ctx, orgId);
  const now = Date.now();
  const patch: Partial<Doc<"workspaces">> = {};
  if (ws.dayKey !== dayKey(now)) Object.assign(patch, { dayKey: dayKey(now), searchesToday: 0, verificationsToday: 0 });
  // O teste não renova (PLAN-04): só planos pagos zeram na virada.
  if (planOf(ws.plan) !== "trial" && now - ws.periodStart > MONTH_MS) {
    Object.assign(patch, { leadsUsed: 0, sitesUsed: 0, detailsUsed: 0, aiUsed: 0, verificationsUsed: 0, periodStart: now });
  }
  if (Object.keys(patch).length) {
    await ctx.db.patch(ws._id, patch);
    const fresh = await ctx.db.get(ws._id);
    if (fresh) ws = fresh;
  }
  return ws;
}

export const ACCEPT_REQUIRED_MESSAGE = "Aceite os Termos e o DPA para continuar usando o Osprano.";

/** Guarda server de LEGAL-03: usada no choke point de cota e nas actions que gastam API paga
 *  ou saem ao prospect. Demo (só dev) passa. */
export function assertAccepted(
  ws: { termsVersion?: string; professionalUse?: boolean } | null | undefined,
  orgId: string,
): void {
  if (orgId === "demo" && isDemoEnabled()) return;
  if (!isAccepted(ws)) throw userError(ACCEPT_REQUIRED_MESSAGE);
}

/** Grava o aceite; o cliente só pode aceitar a versão vigente. */
export async function acceptTermsFor(ctx: MutationCtx, orgId: string, version: string): Promise<void> {
  if (version !== LEGAL_VERSION) {
    throw userError("Versão dos termos desatualizada. Recarregue a página.");
  }
  const ws = await ensureWorkspace(ctx, orgId);
  await ctx.db.patch(ws._id, { termsVersion: version, termsAcceptedAt: Date.now(), professionalUse: true });
}

const MONTH_FIELD = {
  leads: "leadsUsed",
  sites: "sitesUsed",
  details: "detailsUsed",
  ai: "aiUsed",
  verifications: "verificationsUsed",
} as const;
const DAY_FIELD = { searches: "searchesToday", verifications: "verificationsToday" } as const;
const UNIT: Record<UsageKind, string> = {
  leads: "leads",
  sites: "sites",
  details: "consultas ao Google",
  ai: "gerações por IA",
  verifications: "verificações",
  searches: "buscas no Google",
};

const monthField = (kind: UsageKind) => (kind in MONTH_FIELD ? MONTH_FIELD[kind as MonthlyKind] : undefined);
const dayField = (kind: UsageKind) => (kind in DAY_FIELD ? DAY_FIELD[kind as DailyKind] : undefined);

function limitMessage(ws: Doc<"workspaces">, kind: UsageKind, limit: number, daily: boolean): string {
  const plan = planOf(ws.plan);
  if (plan === "trial" && ws.trialSpent === true) {
    return "Você já usou o teste grátis em outra conta. Veja os planos em Planos.";
  }
  if (daily) {
    return `Limite diário atingido (${limit} ${UNIT[kind]}/dia). Tente amanhã ou veja os planos em Planos.`;
  }
  if (plan === "trial") return `Seu teste grátis acabou (${limit} ${UNIT[kind]}). Veja os planos em Planos.`;
  return `Limite do plano ${PLANS[plan].name} atingido (${limit} ${UNIT[kind]}/mês). Veja os planos em Planos.`;
}

/** Reserva `count` unidades (mensal e/ou diária conforme o tipo); lança se passar do limite. */
export async function reserveUsage(
  ctx: MutationCtx,
  orgId: string,
  kind: UsageKind,
  count: number,
): Promise<void> {
  if (!Number.isInteger(count) || count < 1) {
    throw userError(`Quantidade de reserva inválida (${count}).`);
  }
  const ws = await ensureFresh(ctx, orgId);
  assertAccepted(ws, orgId);
  const patch: Record<string, number> = {};
  const mf = monthField(kind);
  if (mf) {
    const used = ws[mf] ?? 0;
    const limit = limitFor(ws, kind as MonthlyKind);
    if (used + count > limit) throw userError(limitMessage(ws, kind, limit, false));
    patch[mf] = used + count;
  }
  const df = dayField(kind);
  if (df) {
    const used = ws[df] ?? 0;
    const limit = dailyLimitFor(ws, kind as DailyKind);
    if (used + count > limit) throw userError(limitMessage(ws, kind, limit, true));
    patch[df] = used + count;
  }
  await ctx.db.patch(ws._id, patch);
}

/** Estorna `count` unidades de uso; NUNCA deixa o contador negativo (clamp em 0). */
export async function refundUsage(
  ctx: MutationCtx,
  orgId: string,
  kind: UsageKind,
  count: number,
): Promise<void> {
  if (count <= 0) return;
  const ws = await ensureFresh(ctx, orgId);
  const patch: Record<string, number> = {};
  for (const f of [monthField(kind), dayField(kind)]) {
    if (f) patch[f] = Math.max(0, (ws[f] ?? 0) - count);
  }
  await ctx.db.patch(ws._id, patch);
}
