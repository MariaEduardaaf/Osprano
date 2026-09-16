import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Osprano — data model (V1)
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
  v.literal("scheduled"), // meeting agreed
  v.literal("followup"), // being nurtured
  v.literal("converted"), // closed / won
  v.literal("lost"),
);

const tier = v.union(v.literal("hot"), v.literal("warm"), v.literal("cold"));

/** Motivo fixo de perda (CRM). Espelhado em `LOST_REASONS` de convex/lib/domain.ts. */
const lostReason = v.union(
  v.literal("too_expensive"),
  v.literal("has_site"),
  v.literal("no_response"),
  v.literal("not_interested"),
  v.literal("other"),
);

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
    // Descoberta → CRM: leads buscados começam saved=false (só na tela de Leads);
    // "Enviar para CRM" marca saved=true. undefined (seed/legado) = já no CRM.
    saved: v.optional(v.boolean()),

    // CRM: fluxo do dia e informação do lead. Todos opcionais: lead existente segue válido.
    nextActionAt: v.optional(v.number()), // meia-noite LOCAL do dia (calculada no navegador); anda junto com a nota
    nextActionNote: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactRole: v.optional(v.string()),
    dealSetup: v.optional(v.number()), // moeda derivada do país (currencyForCountry)
    dealMonthly: v.optional(v.number()),
    lostReason: v.optional(lostReason), // leads em `lost` sem motivo existem (legado, seed)
    lostNote: v.optional(v.string()),

    // Agenda (reunião marcada com o lead)
    meetingAt: v.optional(v.number()),
    meetingNote: v.optional(v.string()),

    // WhatsApp opt-in (COMP-04) — só com registro explícito, nunca por estágio de Kanban
    waOptInAt: v.optional(v.number()),
    waOptInSource: v.optional(v.string()), // "replied_email" | "phone_call" | "in_person"

    // Consentimento de contato generalizado (OPTIN-04) — destrava email E WhatsApp
    contactOptInAt: v.optional(v.number()),
    contactOptInSource: v.optional(v.string()), // "phone_call" | "in_person" | "reply" | "other"
    contactOptInNote: v.optional(v.string()), // persistido no doc (diverge do waOptIn, que só grava no evento)

    // Script de ligação gerado (OPTIN-03) — persistido para não regenerar à toa
    callScript: v.optional(v.string()),
    callScriptPt: v.optional(v.string()),
    callScriptAt: v.optional(v.number()),

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
    unsubscribeToken: v.optional(v.string()), // token dedicado do unsubscribe (NÃO reutilizar previewToken)
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()), // TRCK-02: timestamp real da marcação manual de "respondeu"
  })
    .index("by_org", ["orgId"])
    .index("by_lead", ["leadId"])
    .index("by_unsub_token", ["unsubscribeToken"]),

  events: defineTable({
    orgId: v.string(),
    type: v.union(
      v.literal("preview_open"),
      v.literal("email_sent"),
      v.literal("reply"),
      v.literal("stage_change"),
      v.literal("wa_opt_in"),
      v.literal("contact_opt_in"),
      v.literal("note"), // CRM: nota privada do lead; meta: { text }
    ),
    leadId: v.optional(v.id("leads")),
    previewToken: v.optional(v.string()),
    at: v.number(),
    meta: v.optional(v.any()),
  })
    .index("by_org", ["orgId"])
    .index("by_lead", ["leadId", "at"]), // histórico por lead

  suppressions: defineTable({
    email: v.string(), // normalizado (lowercase/trim) via normalizeEmail — SEMPRE gravado normalizado
    orgId: v.optional(v.string()), // undefined = supressão global (todas as orgs)
    source: v.string(), // "unsubscribe_link" | "manual" | "reply_stop"
    leadId: v.optional(v.id("leads")),
    at: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_org_email", ["orgId", "email"]),
});
