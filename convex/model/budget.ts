import type { MutationCtx, QueryCtx } from "../_generated/server";
import { BUDGET_PAUSED_MESSAGE, BUDGET_WARN_RATIO, GLOBAL_BUDGET_USD } from "../lib/budget.ts";
import { monthKey } from "../lib/domain.ts";
import { userError } from "../lib/errors.ts";

const rowOf = (ctx: QueryCtx | MutationCtx, month: string) =>
  ctx.db
    .query("spend")
    .withIndex("by_month", (q) => q.eq("month", month))
    .first();

/** Soma `usd` ao gasto global do mês; recusa (lança) se passar do teto. Chamar na MESMA mutation
 *  da reserva de cota: se lançar, a reserva do cliente é desfeita junto.
 *  ponytail: uma linha por mês recebe todas as escritas pagas; o Convex reexecuta em conflito.
 *  Se virar gargalo, fragmentar por dia. */
export async function chargeBudget(ctx: MutationCtx, usd: number, now: number = Date.now()): Promise<void> {
  if (!(usd > 0)) return;
  const month = monthKey(now);
  const row = await rowOf(ctx, month);
  const before = row?.usd ?? 0;
  const after = before + usd;
  if (after > GLOBAL_BUDGET_USD) {
    console.error(`[ORCAMENTO] teto global de US$ ${GLOBAL_BUDGET_USD} atingido em ${month}: chamada paga recusada`);
    throw userError(BUDGET_PAUSED_MESSAGE);
  }
  const warnAt = GLOBAL_BUDGET_USD * BUDGET_WARN_RATIO;
  const warn = after >= warnAt && before < warnAt && row?.warnedAt === undefined;
  if (warn) console.error(`[ORCAMENTO] 80% do teto global usado em ${month}`);
  if (row) await ctx.db.patch(row._id, { usd: after, ...(warn ? { warnedAt: now } : {}) });
  else await ctx.db.insert("spend", { month, usd: after, ...(warn ? { warnedAt: now } : {}) });
}

export async function budgetStatusFor(ctx: QueryCtx | MutationCtx, now: number) {
  const month = monthKey(now);
  const row = await rowOf(ctx, month);
  const usdSpent = row?.usd ?? 0;
  return {
    month,
    usdSpent,
    budgetUsd: GLOBAL_BUDGET_USD,
    percent: Math.round((usdSpent / GLOBAL_BUDGET_USD) * 100),
    warnedAt: row?.warnedAt ?? null,
  };
}
