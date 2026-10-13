import type { MutationCtx } from "../_generated/server";
import { deleteLeadCascade } from "./leads.ts";
import { globalizeOrgSuppression } from "./suppressions.ts";

// Lotes conservadores para caber nos limites por mutation do Convex (~16k leituras,
// ~8k escritas, 1 s). A action chama em loop; cada lote é uma transação.
const LEAD_BATCH = 20;
const ROW_BATCH = 200;

/**
 * Apaga um lote dos dados de uma org. Devolve `done: true` só quando não sobrou nada,
 * workspace incluído. Reexecutável: org vazia devolve done na primeira chamada.
 *
 * ponytail: uma mutation concorrente depois do purge pode recriar um workspace vazio via
 * `ensureWorkspace`; o cliente sai da conta logo em seguida e o resíduo é um workspace vazio sem dono.
 */
export async function purgeOrgBatch(ctx: MutationCtx, orgId: string): Promise<{ done: boolean }> {
  const leads = await ctx.db
    .query("leads")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .take(LEAD_BATCH);
  if (leads.length > 0) {
    for (const lead of leads) await deleteLeadCascade(ctx, lead);
    return { done: false };
  }

  let touched = 0;

  for (const p of await ctx.db.query("previews").withIndex("by_org", (q) => q.eq("orgId", orgId)).take(ROW_BATCH)) {
    await ctx.db.delete(p._id);
    touched++;
  }
  for (const e of await ctx.db.query("events").withIndex("by_org", (q) => q.eq("orgId", orgId)).take(ROW_BATCH)) {
    await ctx.db.delete(e._id);
    touched++;
  }
  for (const o of await ctx.db.query("outreach").withIndex("by_org", (q) => q.eq("orgId", orgId)).take(ROW_BATCH)) {
    await ctx.db.delete(o._id);
    touched++;
  }
  for (const u of await ctx.db.query("uploads").withIndex("by_org", (q) => q.eq("orgId", orgId)).take(ROW_BATCH)) {
    if (await ctx.db.system.get("_storage", u.storageId)) await ctx.storage.delete(u.storageId);
    await ctx.db.delete(u._id);
    touched++;
  }
  // Supressões da org viram globais (SEND-05): quem pediu para não ser contatado continua fora da lista
  // de todos, mesmo depois de a cliente apagar a conta.
  for (const s of await ctx.db
    .query("suppressions")
    .withIndex("by_org_email", (q) => q.eq("orgId", orgId))
    .take(ROW_BATCH)) {
    await globalizeOrgSuppression(ctx, s);
    touched++;
  }
  // Higiene: hoje nada insere em users.
  for (const u of await ctx.db.query("users").withIndex("by_clerk", (q) => q.eq("clerkId", orgId)).take(ROW_BATCH)) {
    await ctx.db.delete(u._id);
    touched++;
  }
  if (touched > 0) return { done: false };

  // O workspace é o último: guarda stripeSubscriptionId e é a âncora para tentar de novo se algo falhar no meio.
  const ws = await ctx.db
    .query("workspaces")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .first();
  if (ws) await ctx.db.delete(ws._id);
  return { done: true };
}
