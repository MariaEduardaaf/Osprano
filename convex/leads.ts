import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  isEmailable,
  type Signals,
} from "./lib/domain";

const stageArg = v.union(
  v.literal("base"),
  v.literal("approached"),
  v.literal("opened"),
  v.literal("replied"),
  v.literal("converted"),
  v.literal("lost"),
);

/** Leads for the current org, ranked by digital-presence pain (score desc). */
export const list = query({
  args: { stage: v.optional(stageArg) },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const leads = args.stage
      ? await ctx.db
          .query("leads")
          .withIndex("by_org_stage", (q) => q.eq("orgId", orgId).eq("stage", args.stage!))
          .collect()
      : await ctx.db
          .query("leads")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect();
    return leads.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) return null;
    return lead;
  },
});

/** Funnel counts for the dashboard. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const byStage = { base: 0, approached: 0, opened: 0, replied: 0, converted: 0, lost: 0 };
    let emailable = 0;
    let noSite = 0;
    for (const lead of leads) {
      byStage[lead.stage] += 1;
      if (lead.emailable) emailable += 1;
      if (lead.signals?.noSite || lead.signals?.socialOnly) noSite += 1;
    }
    return { total: leads.length, byStage, emailable, noSite };
  },
});

export const setStage = mutation({
  args: { id: v.id("leads"), stage: stageArg },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(args.id, { stage: args.stage, stageUpdatedAt: now });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: args.stage },
    });
  },
});

/**
 * Manually add a lead. Computes the website-based signals + a partial score
 * now; full enrichment (PageSpeed/HTTPS) runs in the discovery pipeline (Fase 1).
 */
export const create = mutation({
  args: {
    name: v.string(),
    countryCode: v.string(),
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewsCount: v.optional(v.number()),
    legalForm: v.optional(
      v.union(v.literal("incorporated"), v.literal("sole_trader"), v.literal("unknown")),
    ),
    contactType: v.optional(v.union(v.literal("role"), v.literal("named"), v.literal("unknown"))),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const now = Date.now();

    const web = classifyWebsite(args.website);
    const signals: Signals = {
      noSite: !args.website,
      socialOnly: web.socialOnly,
      noHttps: false,
      notMobile: false,
      slow: false,
      sparseProfile: !args.phone || args.rating === undefined,
    };
    const score = computeScore(signals);

    return await ctx.db.insert("leads", {
      orgId,
      source: "manual",
      name: args.name,
      category: args.category,
      city: args.city,
      address: args.address,
      countryCode: args.countryCode.toUpperCase(),
      website: args.website,
      phone: args.phone,
      email: args.email,
      rating: args.rating,
      reviewsCount: args.reviewsCount,
      score,
      tier: tierFromScore(score),
      signals,
      scoredAt: now,
      legalForm: args.legalForm ?? "unknown",
      contactType: args.contactType ?? "unknown",
      emailable: isEmailable({
        countryCode: args.countryCode,
        legalForm: args.legalForm,
        contactType: args.contactType,
      }),
      stage: "base",
      stageUpdatedAt: now,
      fetchedAt: now,
    });
  },
});
