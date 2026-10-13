import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { COST_USD } from "../lib/budget";

/** PLAN-02: reserva 1 geração de IA (cota do plano + orçamento global, na mesma transação)
 *  ANTES de chamar a Anthropic; se a chamada falhar, devolve a cota (o orçamento não volta). */
export async function withAiQuota<T>(ctx: ActionCtx, orgId: string, call: () => Promise<T>): Promise<T> {
  await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "ai", count: 1, usd: COST_USD.ai });
  try {
    return await call();
  } catch (err) {
    await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "ai", count: 1 });
    throw err;
  }
}
