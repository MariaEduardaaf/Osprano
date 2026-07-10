import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * sitescout — data model (V1)
 *
 * Multi-tenant by `orgId` (MVP: orgId === Clerk user subject; org support later).
 *
 * Google Places ToS: only `placeId` is storable indefinitely. Contact fields
 * (name/phone/website) must be refreshed within ~30 days — see `fetchedAt`.
 * The storable/resellable backbone is Foursquare OS (source === "fsq").
 */

const stage = v.union(
  v.literal("base"), // discovered, not yet contacted
  v.literal("approached"), // outreach sent
  v.literal("opened"), // prospect opened the preview
  v.literal("replied"), // prospect replied
  v.literal("converted"), // closed / won
  v.literal("lost"),
);

const tier = v.union(v.literal("hot"), v.literal("warm"), v.literal("cold"));

/** Digital Presence Score signal breakdown (each true = a reason to buy). */
const signals = v.object({
  noSite: v.boolean(),
  socialOnly: v.boolean(),
  noHttps: v.boolean(),
  notMobile: v.boolean(),
  slow: v.boolean(),
  sparseProfile: v.boolean(),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  }).index("by_clerk", ["clerkId"]),

  workspaces: defineTable({
    orgId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("agency")),
    // usage (reset monthly from periodStart)
    leadsUsed: v.number(),
    sitesUsed: v.number(),
    periodStart: v.number(),
    // billing (Stripe)
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_customer", ["stripeCustomerId"]),

  leads: defineTable({
    orgId: v.string(),
    source: v.union(
      v.literal("places"),
      v.literal("fsq"),
      v.literal("osm"),
      v.literal("scrape"),
      v.literal("manual"),
    ),
    placeId: v.optional(v.string()),

    name: v.string(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    countryCode: v.string(), // ISO-3166-1 alpha-2, e.g. "GB"

    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewsCount: v.optional(v.number()),

    // Digital Presence Score (higher = more digital pain = better lead)
    score: v.optional(v.number()),
    tier: v.optional(tier),
    signals: v.optional(signals),
    scoredAt: v.optional(v.number()),

    // Compliance guardrail (the "sole-trader trap")
    legalForm: v.optional(
      v.union(v.literal("incorporated"), v.literal("sole_trader"), v.literal("unknown")),
    ),
    contactType: v.optional(v.union(v.literal("role"), v.literal("named"), v.literal("unknown"))),
    emailable: v.optional(v.boolean()), // opt-out market + (incorporated || role inbox)

    // Pipeline / CRM
    stage: stage,
    stageUpdatedAt: v.number(),

    fetchedAt: v.number(), // for the Google Places 30-day refresh policy
  })
    .index("by_org", ["orgId"])
    .index("by_org_stage", ["orgId", "stage"])
    .index("by_org_place", ["orgId", "placeId"]),

  previews: defineTable({
    orgId: v.string(),
    leadId: v.id("leads"),
    token: v.string(), // unique, tracked link
    content: v.optional(v.any()), // generated site content
    openCount: v.number(),
    lastOpenedAt: v.optional(v.number()),
    // white-label publish
    published: v.optional(v.boolean()),
    slug: v.optional(v.string()), // stable public slug when published
  })
    .index("by_token", ["token"])
    .index("by_lead", ["leadId"])
    .index("by_slug", ["slug"])
    .index("by_org", ["orgId"]),

  outreach: defineTable({
    orgId: v.string(),
    leadId: v.id("leads"),
    channel: v.union(v.literal("email"), v.literal("whatsapp")), // WhatsApp only post-opt-in
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("opened"),
      v.literal("replied"),
      v.literal("bounced"),
    ),
    previewToken: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_lead", ["leadId"]),

  events: defineTable({
    orgId: v.string(),
    type: v.union(
      v.literal("preview_open"),
      v.literal("email_sent"),
      v.literal("reply"),
      v.literal("stage_change"),
    ),
    leadId: v.optional(v.id("leads")),
    previewToken: v.optional(v.string()),
    at: v.number(),
    meta: v.optional(v.any()),
  }).index("by_org", ["orgId"]),
});
