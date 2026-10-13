import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { userError } from "./lib/errors";
import { budgetStatusFor } from "./model/budget";
import { grantPlanFor, migrateFreeBatch, orgIdForEmail } from "./model/plans";

/**
 * Comandos da Duda para o beta. Só pela CLI; internalMutation/internalQuery nunca são
 * chamáveis pelo cliente:
 *   npx convex run plans:grantPlan '{"orgId":"user_...","plan":"agency"}'
 *   npx convex run plans:grantPlan '{"email":"pessoa@exemplo.com","plan":"solo"}'
 *   npx convex run plans:migrateFreeToTrial '{"dryRun":true}'
 *   npx convex run plans:budgetStatus
 */
export const grantPlan = internalMutation({
  args: {
    plan: v.union(v.literal("trial"), v.literal("solo"), v.literal("pro"), v.literal("agency")),
    orgId: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { plan, orgId, email }) => {
    if ((orgId === undefined) === (email === undefined)) throw userError("Informe orgId ou email, não os dois.");
    const target = orgId ?? (await orgIdForEmail(ctx, email as string));
    if (!target) {
      throw userError(
        "Nenhuma conta encontrada para esse e-mail (só quem aceitou os termos depois da Fase 12). Use o orgId, que é o id do usuário no Clerk.",
      );
    }
    await grantPlanFor(ctx, target, plan);
    return { orgId: target, plan };
  },
});

export const migrateFreeToTrial = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => migrateFreeBatch(ctx, dryRun ?? false),
});

export const budgetStatus = internalQuery({
  args: {},
  handler: async (ctx) => budgetStatusFor(ctx, Date.now()),
});
