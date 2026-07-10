import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";

/** Generate (or refresh) a tracked preview site for a lead. Authed. */
export const generate = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");

    const content = {
      name: lead.name,
      category: lead.category ?? null,
      city: lead.city ?? null,
      phone: lead.phone ?? null,
      rating: lead.rating ?? null,
      reviewsCount: lead.reviewsCount ?? null,
      countryCode: lead.countryCode,
    };

    const existing = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content });
      return existing.token;
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("previews", { orgId, leadId, token, content, openCount: 0 });
    return token;
  },
});

/** Ensure a preview exists for a lead (used by the outreach flow). Returns its token. */
export const ensureForLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const existing = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (existing) return existing.token;

    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead não encontrado");
    const content = {
      name: lead.name,
      category: lead.category ?? null,
      city: lead.city ?? null,
      phone: lead.phone ?? null,
      rating: lead.rating ?? null,
      reviewsCount: lead.reviewsCount ?? null,
      countryCode: lead.countryCode,
    };
    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("previews", { orgId: lead.orgId, leadId, token, content, openCount: 0 });
    return token;
  },
});

/** PUBLIC — the prospect opens this by token; no auth. Returns render content only. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return null;
    return { content: preview.content, openCount: preview.openCount };
  },
});

/**
 * PUBLIC — records that the prospect opened the preview. This is the buying
 * signal: it advances the lead to "opened" so the reseller sees it live.
 */
export const recordOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return;

    const now = Date.now();
    await ctx.db.patch(preview._id, {
      openCount: preview.openCount + 1,
      lastOpenedAt: now,
    });
    await ctx.db.insert("events", {
      orgId: preview.orgId,
      type: "preview_open",
      leadId: preview.leadId,
      previewToken: token,
      at: now,
    });

    const lead = await ctx.db.get(preview.leadId);
    if (lead && (lead.stage === "base" || lead.stage === "approached")) {
      await ctx.db.patch(lead._id, { stage: "opened", stageUpdatedAt: now });
    }
  },
});
