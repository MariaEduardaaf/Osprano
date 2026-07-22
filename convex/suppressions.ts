import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { normalizeEmail } from "./lib/domain";

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
    : await ctx.db
        .query("suppressions")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .filter((q) => q.eq(q.field("orgId"), undefined))
        .first();
  if (existing) return; // idempotente
  await ctx.db.insert("suppressions", {
    email: args.email,
    orgId: args.orgId,
    source: args.source,
    leadId: args.leadId,
    at: Date.now(),
  });
}

export const add = internalMutation({
  args: {
    email: v.string(),
    orgId: v.optional(v.string()),
    source: v.string(),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => addSuppression(ctx, args),
});

/**
 * Fonte ÚNICA da regra de supressão (dual-scope: row da própria org OU global,
 * orgId undefined). Actions usam a internalQuery abaixo (ctx.runQuery); mutations
 * chamam este helper direto, porque uma mutation não pode ctx.runQuery.
 * email DEVE vir normalizado (normalizeEmail).
 */
export async function isEmailSuppressed(
  ctx: QueryCtx,
  { email, orgId }: { email: string; orgId: string },
): Promise<boolean> {
  const rows = await ctx.db
    .query("suppressions")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();
  return rows.some((r) => r.orgId === orgId || r.orgId === undefined);
}

/** Dual-scope: suprimido se houver row da própria org OU global (orgId undefined). */
export const isSuppressed = internalQuery({
  args: { email: v.string(), orgId: v.string() },
  handler: async (ctx, args) => isEmailSuppressed(ctx, args),
});

/*
 * `countryForUnsubToken` viveu aqui e foi REMOVIDA de propósito: ela resolvia o idioma
 * da página de unsubscribe só pelo país, e na Suíça isso mandava o prospect de Genebra
 * para uma página em alemão. Quem faz esse trabalho agora é
 * `outreach.langForUnsubToken`, que devolve o idioma já resolvido por (país, cidade).
 * Não reintroduzir uma versão country-only: dois resolvedores de idioma divergem.
 */

/** Chamado pelo endpoint público (plano 02-03). No-leak: token desconhecido = no-op. */
export const unsubscribeByToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_unsub_token", (q) => q.eq("unsubscribeToken", token))
      .first();
    if (!row) return; // desconhecido/reusado → nada a fazer
    const lead = await ctx.db.get(row.leadId);
    if (!lead?.email) return;
    await addSuppression(ctx, {
      email: normalizeEmail(lead.email),
      orgId: row.orgId,
      source: "unsubscribe_link",
      leadId: row.leadId,
    });
  },
});
