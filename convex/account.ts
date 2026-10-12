import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { purgeOrgBatch } from "./model/purge";
import { stripeDelete } from "./lib/stripe";
import { userError } from "./lib/errors";

export const purgeBatch = internalMutation({
  args: { orgId: v.string() },
  handler: (ctx, { orgId }) => purgeOrgBatch(ctx, orgId),
});

// 20 leads por lote cobre 20.000 leads; a action tem limite de 10 min.
const MAX_BATCHES = 1000;

/** Apaga a conta (LEGAL-05): cancela a assinatura no Stripe, depois limpa o Convex em lotes.
 *  O login do Clerk é removido depois, pela rota do Next (precisa do usuário ainda autenticado). */
export const deleteMyAccount = action({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }): Promise<{ ok: true }> => {
    const orgId = await requireOrgId(ctx);
    if (orgId === "demo") throw userError("O modo demo não apaga conta.");
    if (confirm !== "APAGAR") throw userError("Digite APAGAR para confirmar.");

    const ws = await ctx.runQuery(internal.workspaces.getInternal, { orgId });
    if (ws?.stripeSubscriptionId && ws.subscriptionStatus !== "canceled") {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret)
        throw userError(
          "Não foi possível cancelar a assinatura (STRIPE_SECRET_KEY não configurada). Nada foi apagado.",
        );
      await stripeDelete(secret, `subscriptions/${ws.stripeSubscriptionId}`);
    }

    for (let i = 0; i < MAX_BATCHES; i++) {
      const { done } = await ctx.runMutation(internal.account.purgeBatch, { orgId });
      if (done) return { ok: true };
    }
    throw userError("A exclusão não terminou. Clique em apagar de novo para continuar.");
  },
});
