import { query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { getWorkspace, ensureWorkspace, reserveUsage, refundUsage } from "./model/workspace";
import { PLANS } from "./lib/domain";

const planV = v.union(v.literal("free"), v.literal("pro"), v.literal("agency"));

/** Current plan + usage for the signed-in workspace (defaults to free). */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const ws = await getWorkspace(ctx, orgId);
    const plan = ws?.plan ?? "free";
    return {
      plan,
      leadsUsed: ws?.leadsUsed ?? 0,
      sitesUsed: ws?.sitesUsed ?? 0,
      limits: { leads: PLANS[plan].leadsPerMonth, sites: PLANS[plan].sitesPerMonth },
      subscriptionStatus: ws?.subscriptionStatus ?? null,
    };
  },
});

/** Reserve usage against the plan (called by discovery/publish flows). */
export const reserve = internalMutation({
  args: {
    orgId: v.string(),
    kind: v.union(v.literal("leads"), v.literal("sites")),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    await reserveUsage(ctx, args.orgId, args.kind, args.count);
  },
});

/** Refund usage previously reserved (called when discovery inserts fewer leads than reserved). */
export const refund = internalMutation({
  args: {
    orgId: v.string(),
    kind: v.union(v.literal("leads"), v.literal("sites")),
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
      plan: canceled ? "free" : (args.plan ?? ws.plan),
      stripeSubscriptionId: args.subscriptionId ?? ws.stripeSubscriptionId,
      subscriptionStatus: args.status,
    });
  },
});
