import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { normalizeEmail } from "../lib/domain.ts";

// ponytail: lê até 50 linhas por e-mail; acima disso (50 orgs suprimindo o mesmo e-mail) criar índice próprio para a global
export const SUPPRESSION_SCAN = 50;

const rowsForEmail = (ctx: QueryCtx, email: string) =>
  ctx.db
    .query("suppressions")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(SUPPRESSION_SCAN);

/** Insert idempotente: não duplica (email, orgId). email DEVE vir normalizado. */
export async function addSuppression(
  ctx: MutationCtx,
  args: { email: string; orgId?: string; source: string; leadId?: Id<"leads"> },
): Promise<void> {
  const existing = args.orgId
    ? await ctx.db
        .query("suppressions")
        .withIndex("by_org_email", (q) => q.eq("orgId", args.orgId).eq("email", args.email))
        .first()
    : (await rowsForEmail(ctx, args.email)).some((r) => r.orgId === undefined);
  if (existing) return; // idempotente
  await ctx.db.insert("suppressions", {
    email: args.email,
    orgId: args.orgId,
    source: args.source,
    leadId: args.leadId,
    at: Date.now(),
  });
}

/**
 * Fonte ÚNICA da regra de supressão. Actions usam a internalQuery de convex/suppressions.ts;
 * mutations chamam este helper direto. email DEVE vir normalizado (normalizeEmail).
 * SEND-05: descadastro pelo link vale para todos os clientes; linhas antigas gravadas
 * com orgId e source "unsubscribe_link" também valem (sem migração).
 */
export async function isEmailSuppressed(
  ctx: QueryCtx,
  { email, orgId }: { email: string; orgId: string },
): Promise<boolean> {
  const own = await ctx.db
    .query("suppressions")
    .withIndex("by_org_email", (q) => q.eq("orgId", orgId).eq("email", email))
    .first();
  if (own) return true;
  return (await rowsForEmail(ctx, email)).some((r) => r.orgId === undefined || r.source === "unsubscribe_link");
}

/** Endpoint público de descadastro. No-leak: token desconhecido = no-op. Grava global (SEND-05). */
export async function suppressByToken(ctx: MutationCtx, token: string): Promise<void> {
  const row = await ctx.db
    .query("outreach")
    .withIndex("by_unsub_token", (q) => q.eq("unsubscribeToken", token))
    .first();
  if (!row) return; // desconhecido/reusado → nada a fazer
  const lead = await ctx.db.get(row.leadId);
  if (!lead?.email) return;
  await addSuppression(ctx, { email: normalizeEmail(lead.email), source: "unsubscribe_link" });
}

/**
 * Exclusão de conta não tira ninguém da lista de opt-out (13-CONTEXT): a linha da org vira global,
 * ou some se a global igual já existe. No Convex, patch com undefined remove o campo.
 */
export async function globalizeOrgSuppression(ctx: MutationCtx, row: Doc<"suppressions">): Promise<void> {
  if ((await rowsForEmail(ctx, row.email)).some((r) => r.orgId === undefined)) await ctx.db.delete(row._id);
  else await ctx.db.patch(row._id, { orgId: undefined, leadId: undefined });
}
