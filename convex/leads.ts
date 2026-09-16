import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  isEmailable,
  canContactByEmail,
  inferLegalForm,
  inferContactType,
  type Signals,
} from "./lib/domain";

const legalFormV = v.union(
  v.literal("incorporated"),
  v.literal("sole_trader"),
  v.literal("unknown"),
);
const contactTypeV = v.union(v.literal("role"), v.literal("named"), v.literal("unknown"));

const stageArg = v.union(
  v.literal("base"),
  v.literal("approached"),
  v.literal("scheduled"),
  v.literal("followup"),
  v.literal("converted"),
  v.literal("lost"),
);

/** Espelha `lostReason` do schema e `LOST_REASONS` do domínio. */
const lostReasonV = v.union(
  v.literal("too_expensive"),
  v.literal("has_site"),
  v.literal("no_response"),
  v.literal("not_interested"),
  v.literal("other"),
);

const signalsV = v.object({
  noSite: v.boolean(),
  socialOnly: v.boolean(),
  noHttps: v.boolean(),
  notMobile: v.boolean(),
  slow: v.boolean(),
  sparseProfile: v.boolean(),
});

// ---------------------------------------------------------------------------
// Public (authed) API
// ---------------------------------------------------------------------------

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

/** Funnel + headline counts for the dashboard. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const byStage = { base: 0, approached: 0, scheduled: 0, followup: 0, converted: 0, lost: 0 };
    let emailable = 0;
    let noSite = 0;
    for (const lead of leads) {
      byStage[lead.stage] += 1;
      // canContactByEmail, não lead.emailable cru: o consentimento explícito
      // (contactOptInAt) destrava o email e o app inteiro trata esses leads como
      // abordáveis — contar só `emailable` faria a métrica mentir para baixo.
      if (canContactByEmail(lead)) emailable += 1;
      if (lead.signals?.noSite || lead.signals?.socialOnly) noSite += 1;
    }
    return { total: leads.length, byStage, emailable, noSite };
  },
});

/** Aggregates for the dashboard charts. */
export const analytics = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const tiers = { hot: 0, warm: 0, cold: 0 };
    const scoreBuckets = [0, 0, 0, 0, 0]; // 0-19, 20-39, 40-59, 60-79, 80-100
    const byCountry: Record<string, number> = {};
    const signals = { noSite: 0, socialOnly: 0, noHttps: 0, notMobile: 0, slow: 0, sparseProfile: 0 };

    for (const l of leads) {
      const t = l.tier;
      if (t === "hot" || t === "warm" || t === "cold") tiers[t] += 1;
      const b = Math.min(4, Math.max(0, Math.floor((l.score ?? 0) / 20)));
      scoreBuckets[b] += 1;
      byCountry[l.countryCode] = (byCountry[l.countryCode] ?? 0) + 1;
      const s = l.signals;
      if (s) {
        (Object.keys(signals) as (keyof typeof signals)[]).forEach((k) => {
          if (s[k]) signals[k] += 1;
        });
      }
    }
    return { total: leads.length, tiers, scoreBuckets, byCountry, signals };
  },
});

export const setStage = mutation({
  args: { id: v.id("leads"), stage: stageArg },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    // Guardrail: "Perdido" exige motivo. Toda UI que oferece Perdido abre o modal, que chama markLost.
    if (args.stage === "lost") throw new Error("Use markLost");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: args.stage,
      stageUpdatedAt: now,
      // Sair de Perdido é a única forma de reabrir (não há mutation reopen): o motivo vai junto.
      ...(lead.stage === "lost" ? { lostReason: undefined, lostNote: undefined } : {}),
    });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: args.stage },
    });
  },
});

// ---------------------------------------------------------------------------
// CRM: próxima ação (uma por lead, no próprio documento; os dois campos andam juntos)
// ---------------------------------------------------------------------------

/** Marca a próxima ação. `at` é a meia-noite LOCAL do dia, calculada no navegador (o servidor está em UTC). */
export const setNextAction = mutation({
  args: { id: v.id("leads"), at: v.number(), note: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const note = args.note.trim();
    if (!note) throw new Error("Escreva o que fazer");
    await ctx.db.patch(args.id, { nextActionAt: args.at, nextActionNote: note });
  },
});

/** Conclui a próxima ação: remove os dois campos. */
export const clearNextAction = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    await ctx.db.patch(args.id, { nextActionAt: undefined, nextActionNote: undefined });
  },
});

/**
 * "Perdido" sempre com motivo. Move para lost, limpa a próxima ação e registra o evento
 * (meta.reason vai para o Histórico). Lead JÁ em lost (dar motivo a um perdido legado):
 * só lostReason/lostNote, sem tocar stageUpdatedAt e sem evento.
 */
export const markLost = mutation({
  args: { id: v.id("leads"), reason: lostReasonV, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const lostNote = args.note?.trim() || undefined;
    if (lead.stage === "lost") {
      await ctx.db.patch(args.id, { lostReason: args.reason, lostNote });
      return;
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: "lost",
      stageUpdatedAt: now,
      lostReason: args.reason,
      lostNote,
      nextActionAt: undefined,
      nextActionNote: undefined,
    });
    await ctx.db.insert("events", {
      orgId,
      type: "stage_change",
      leadId: args.id,
      at: now,
      meta: { from: lead.stage, to: "lost", reason: args.reason },
    });
  },
});

/** Marca uma reunião com o lead e move-o para "Agendado". */
export const schedule = mutation({
  args: { id: v.id("leads"), at: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: "scheduled",
      stageUpdatedAt: now,
      meetingAt: args.at,
      meetingNote: args.note,
    });
    if (lead.stage !== "scheduled") {
      await ctx.db.insert("events", {
        orgId,
        type: "stage_change",
        leadId: args.id,
        at: now,
        meta: { from: lead.stage, to: "scheduled", meetingAt: args.at },
      });
    }
  },
});

/** Registra o opt-in explícito do prospect para WhatsApp (COMP-04). Origem + timestamp. */
export const recordWaOptIn = mutation({
  args: {
    leadId: v.id("leads"),
    source: v.string(), // "replied_email" | "phone_call" | "in_person"
    note: v.optional(v.string()),
  },
  handler: async (ctx, { leadId, source, note }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(leadId, { waOptInAt: now, waOptInSource: source });
    await ctx.db.insert("events", {
      orgId,
      type: "wa_opt_in",
      leadId,
      at: now,
      meta: { source, ...(note ? { note } : {}) },
    });
    return { optInAt: now };
  },
});

/** OPTIN-04: consentimento de contato generalizado (email + WhatsApp). Origem + timestamp + evento. */
export const recordContactOptIn = mutation({
  args: {
    leadId: v.id("leads"),
    // Vocabulário FECHADO: o consentimento é a prova legal do envio, então a origem
    // precisa ser auditável — string livre permitiria gravar qualquer coisa.
    source: v.union(
      v.literal("phone_call"),
      v.literal("in_person"),
      v.literal("reply"),
      v.literal("other"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { leadId, source, note }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    await ctx.db.patch(leadId, {
      contactOptInAt: now,
      contactOptInSource: source,
      ...(note ? { contactOptInNote: note } : {}),
    });
    await ctx.db.insert("events", {
      orgId,
      type: "contact_opt_in",
      leadId,
      at: now,
      meta: { source, ...(note ? { note } : {}) },
    });
    return { optInAt: now };
  },
});

// ---------------------------------------------------------------------------
// Internal API (used by the discovery + scoring pipeline)
// ---------------------------------------------------------------------------

export const getInternal = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => ctx.db.get(leadId),
});

/** Insert (or refresh) a discovered business, deduped by placeId within the org. */
export const insertDiscovered = internalMutation({
  args: {
    orgId: v.string(),
    source: v.union(v.literal("places"), v.literal("fsq"), v.literal("osm"), v.literal("scrape")),
    placeId: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    countryCode: v.string(),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewsCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const web = classifyWebsite(args.website);
    const signals: Signals = {
      noSite: !args.website,
      socialOnly: web.socialOnly,
      noHttps: false, // refined by scoring
      notMobile: false,
      slow: false,
      sparseProfile: !args.phone || args.rating === undefined || (args.reviewsCount ?? 0) < 5,
    };
    const score = computeScore(signals);
    const legalForm = inferLegalForm(args.name, args.countryCode);
    const contactType = inferContactType(args.email);
    const emailable = isEmailable({ countryCode: args.countryCode, legalForm, contactType });

    const existing = await ctx.db
      .query("leads")
      .withIndex("by_org_place", (q) => q.eq("orgId", args.orgId).eq("placeId", args.placeId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        category: args.category,
        address: args.address,
        city: args.city,
        phone: args.phone,
        website: args.website,
        rating: args.rating,
        reviewsCount: args.reviewsCount,
        signals,
        score,
        tier: tierFromScore(score),
        scoredAt: now,
        legalForm,
        contactType,
        emailable,
        fetchedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("leads", {
      orgId: args.orgId,
      source: args.source,
      placeId: args.placeId,
      name: args.name,
      category: args.category,
      address: args.address,
      city: args.city,
      countryCode: args.countryCode,
      phone: args.phone,
      website: args.website,
      email: args.email,
      rating: args.rating,
      reviewsCount: args.reviewsCount,
      score,
      tier: tierFromScore(score),
      signals,
      scoredAt: now,
      legalForm,
      contactType,
      emailable,
      stage: "base",
      stageUpdatedAt: now,
      saved: false, // discovered → sits on the Leads screen until "Enviar para CRM"
      fetchedAt: now,
    });
  },
});

/** Apply the refined Digital Presence Score + compliance enrichment after scoring. */
export const applyScore = internalMutation({
  args: {
    leadId: v.id("leads"),
    signals: signalsV,
    score: v.number(),
    tier: v.union(v.literal("hot"), v.literal("warm"), v.literal("cold")),
    email: v.optional(v.string()),
    legalForm: legalFormV,
    contactType: contactTypeV,
    emailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      signals: args.signals,
      score: args.score,
      tier: args.tier,
      ...(args.email ? { email: args.email } : {}),
      legalForm: args.legalForm,
      contactType: args.contactType,
      emailable: args.emailable,
      scoredAt: Date.now(),
    });
  },
});

/** OPTIN-03: persiste o script de ligação gerado pela IA no lead. */
export const setCallScript = internalMutation({
  args: { leadId: v.id("leads"), script: v.string(), translation: v.string() },
  handler: async (ctx, { leadId, script, translation }) => {
    await ctx.db.patch(leadId, {
      callScript: script,
      callScriptPt: translation,
      callScriptAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Manual add (handy before wiring live discovery)
// ---------------------------------------------------------------------------

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
      saved: true, // criado manualmente → já entra no CRM
      fetchedAt: now,
    });
  },
});

/** Marca leads escolhidos na descoberta como "no CRM" (Enviar para CRM). */
export const saveMany = mutation({
  args: { ids: v.array(v.id("leads")) },
  handler: async (ctx, { ids }) => {
    const orgId = await requireOrgId(ctx);
    let saved = 0;
    for (const id of ids) {
      const lead = await ctx.db.get(id);
      if (!lead || lead.orgId !== orgId) continue;
      if (lead.saved === true) continue;
      await ctx.db.patch(id, { saved: true });
      saved += 1;
    }
    return { saved };
  },
});
