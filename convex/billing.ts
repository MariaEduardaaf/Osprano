import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { stripePost } from "./lib/stripe";
import { userError } from "./lib/errors";

function priceFor(plan: "pro" | "agency"): string | undefined {
  return plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_AGENCY;
}

/** Create a Stripe Checkout session to subscribe to a paid plan. Returns the URL. */
export const createCheckout = action({
  args: { plan: v.union(v.literal("pro"), v.literal("agency")) },
  handler: async (ctx, { plan }): Promise<{ url: string }> => {
    const orgId = await requireOrgId(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw userError("STRIPE_SECRET_KEY não configurada.");
    const price = priceFor(plan);
    if (!price) throw userError(`Price do plano ${plan} não configurado (STRIPE_PRICE_*).`);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const ws = await ctx.runQuery(internal.workspaces.getInternal, { orgId });
    let customerId = ws?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripePost(secret, "customers", {
        email: identity?.email ?? "",
        "metadata[orgId]": orgId,
      });
      customerId = String(customer.id);
      await ctx.runMutation(internal.workspaces.setStripeCustomer, { orgId, customerId });
    }

    const session = await stripePost(secret, "checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/plans?status=success`,
      cancel_url: `${appUrl}/plans`,
      "metadata[orgId]": orgId,
      "metadata[plan]": plan,
      "subscription_data[metadata][orgId]": orgId,
      "subscription_data[metadata][plan]": plan,
    });
    return { url: String(session.url) };
  },
});

/** Open the Stripe billing portal for the workspace. */
export const portal = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const orgId = await requireOrgId(ctx);
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw userError("STRIPE_SECRET_KEY não configurada.");
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const ws = await ctx.runQuery(internal.workspaces.getInternal, { orgId });
    if (!ws?.stripeCustomerId) throw userError("Sem assinatura ativa.");

    const session = await stripePost(secret, "billing_portal/sessions", {
      customer: ws.stripeCustomerId,
      return_url: `${appUrl}/plans`,
    });
    return { url: String(session.url) };
  },
});
