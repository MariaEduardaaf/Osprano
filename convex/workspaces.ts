import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId, isDemoEnabled } from "./model/tenant";
import { getWorkspace, ensureWorkspace, reserveUsage, refundUsage, acceptTermsFor } from "./model/workspace";
import { chargeBudget } from "./model/budget";
import { claimTrial, trialKey } from "./model/plans";
import { LEGAL_VERSION, isAccepted } from "./lib/legal";
import { PLANS, planOf, limitFor, dailyLimitFor, dayKey } from "./lib/domain";

const planV = v.union(v.literal("free"), v.literal("pro"), v.literal("agency"));

const kindV = v.union(
  v.literal("leads"),
  v.literal("sites"),
  v.literal("details"),
  v.literal("ai"),
  v.literal("verifications"),
  v.literal("searches"),
);

/** Current plan + usage for the signed-in workspace (defaults to free). */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const ws = await getWorkspace(ctx, orgId);
    const plan = planOf(ws?.plan ?? "trial");
    const lim = { plan, trialSpent: ws?.trialSpent };
    return {
      plan,
      planName: PLANS[plan].name,
      isTrial: plan === "trial",
      trialSpent: plan === "trial" && ws?.trialSpent === true,
      leadsUsed: ws?.leadsUsed ?? 0,
      sitesUsed: ws?.sitesUsed ?? 0,
      detailsUsed: ws?.detailsUsed ?? 0,
      aiUsed: ws?.aiUsed ?? 0,
      searchesToday: ws?.dayKey === dayKey(Date.now()) ? (ws.searchesToday ?? 0) : 0,
      limits: {
        leads: limitFor(lim, "leads"),
        sites: limitFor(lim, "sites"),
        details: limitFor(lim, "details"),
        ai: limitFor(lim, "ai"),
        searchesPerDay: dailyLimitFor(lim, "searches"),
      },
      subscriptionStatus: ws?.subscriptionStatus ?? null,
      acceptedVersion: ws?.termsVersion ?? null,
      acceptedAt: ws?.termsAcceptedAt ?? null,
      requiredVersion: LEGAL_VERSION,
      acceptanceOk: (orgId === "demo" && isDemoEnabled()) || isAccepted(ws),
    };
  },
});

/** Registra o aceite de Termos + DPA + uso profissional (só a versão vigente). */
export const acceptTerms = mutation({
  args: { version: v.string(), professionalUse: v.literal(true) },
  handler: async (ctx, { version }) => {
    const orgId = await requireOrgId(ctx);
    await acceptTermsFor(ctx, orgId, version);
    // PLAN-04: o teste grátis é da pessoa; demo (sem identidade) não reivindica.
    const identity = await ctx.auth.getUserIdentity();
    if (identity) await claimTrial(ctx, orgId, await trialKey({ email: identity.email, subject: identity.subject }));
  },
});

/** Reserve usage against the plan (called by discovery/publish flows). */
export const reserve = internalMutation({
  args: {
    orgId: v.string(),
    kind: kindV,
    count: v.number(),
    usd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await reserveUsage(ctx, args.orgId, args.kind, args.count);
    // Mesma mutation de propósito: se o orçamento recusar, a reserva do cliente é desfeita junto.
    if (args.usd) await chargeBudget(ctx, args.usd);
  },
});

/** Refund usage previously reserved. Devolve só a cota do cliente, nunca o orçamento global
 *  (conservador: superestima o gasto, nunca subestima). */
export const refund = internalMutation({
  args: {
    orgId: v.string(),
    kind: kindV,
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await refundUsage(ctx, args.orgId, args.kind, args.count);
  },
});

// --- billing internals ---

export const getInternal = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => getWorkspace(ctx, orgId),
});

export const setStripeCustomer = internalMutation({
  args: { orgId: v.string(), customerId: v.string() },
  handler: async (ctx, { orgId, customerId }) => {
    const ws = await ensureWorkspace(ctx, orgId);
    await ctx.db.patch(ws._id, { stripeCustomerId: customerId });
  },
});

/** Apply a Stripe subscription state to the workspace (found by customer id). */
export const applySubscription = internalMutation({
  args: {
    customerId: v.string(),
    plan: v.optional(planV),
    subscriptionId: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const ws = await ctx.db
      .query("workspaces")
      .withIndex("by_customer", (q) => q.eq("stripeCustomerId", args.customerId))
      .first();
    if (!ws) return;
    const canceled = args.status === "canceled" || args.status === "unpaid";
    await ctx.db.patch(ws._id, {
      // Quem cancela volta ao teste já gasto (não ganha teste novo).
      ...(canceled ? { plan: "trial" as const, trialSpent: true } : { plan: args.plan ?? ws.plan }),
      stripeSubscriptionId: args.subscriptionId ?? ws.stripeSubscriptionId,
      subscriptionStatus: args.status,
    });
  },
});
