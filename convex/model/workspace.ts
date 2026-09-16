import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { planLimit } from "../lib/domain";
import { userError } from "../lib/errors";

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
    plan: "free",
    leadsUsed: 0,
    sitesUsed: 0,
    periodStart: Date.now(),
  });
  const ws = await ctx.db.get(id);
  // Invariante (get logo após insert): Error comum de propósito — não é mensagem pra usuária.
  if (!ws) throw new Error("Falha ao criar workspace");
  return ws;
}

/** Ensure the workspace exists and reset monthly usage if the period rolled over. */
export async function ensureFresh(ctx: MutationCtx, orgId: string): Promise<Doc<"workspaces">> {
  let ws = await ensureWorkspace(ctx, orgId);
  if (Date.now() - ws.periodStart > MONTH_MS) {
    await ctx.db.patch(ws._id, { leadsUsed: 0, sitesUsed: 0, periodStart: Date.now() });
    const fresh = await ctx.db.get(ws._id);
    if (fresh) ws = fresh;
  }
  return ws;
}

/** Reserve `count` units of usage; throws (with an upgrade hint) if over the plan limit. */
export async function reserveUsage(
  ctx: MutationCtx,
  orgId: string,
  kind: "leads" | "sites",
  count: number,
): Promise<void> {
  if (!Number.isInteger(count) || count < 1) {
    throw userError(`Quantidade de reserva inválida (${count}).`);
  }
  const ws = await ensureFresh(ctx, orgId);
  const used = kind === "leads" ? ws.leadsUsed : ws.sitesUsed;
  const limit = planLimit(ws.plan, kind);
  if (used + count > limit) {
    const unit = kind === "leads" ? "leads" : "sites";
    throw userError(`Limite do plano ${ws.plan} atingido (${limit} ${unit}/mês). Faça upgrade em Planos.`);
  }
  await ctx.db.patch(
    ws._id,
    kind === "leads" ? { leadsUsed: used + count } : { sitesUsed: used + count },
  );
}

/** Estorna `count` unidades de uso; NUNCA deixa o contador negativo (clamp em 0). */
export async function refundUsage(
  ctx: MutationCtx,
  orgId: string,
  kind: "leads" | "sites",
  count: number,
): Promise<void> {
  if (count <= 0) return;
  const ws = await ensureFresh(ctx, orgId);
  const used = kind === "leads" ? ws.leadsUsed : ws.sitesUsed;
  const next = Math.max(0, used - count);
  await ctx.db.patch(ws._id, kind === "leads" ? { leadsUsed: next } : { sitesUsed: next });
}
