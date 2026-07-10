import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { writeEmail } from "./lib/outreachAi";

export const getForLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!row || row.orgId !== orgId) return null;
    return row;
  },
});

export const upsertDraft = internalMutation({
  args: {
    orgId: v.string(),
    leadId: v.id("leads"),
    subject: v.string(),
    body: v.string(),
    previewToken: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        body: args.body,
        previewToken: args.previewToken,
        status: "draft",
      });
      return existing._id;
    }
    return await ctx.db.insert("outreach", {
      orgId: args.orgId,
      leadId: args.leadId,
      channel: "email",
      subject: args.subject,
      body: args.body,
      previewToken: args.previewToken,
      status: "draft",
    });
  },
});

/** Draft a compliant cold email with AI. Gated to emailable leads only. */
export const draft = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ subject: string; body: string }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.emailable) {
      throw new Error("Fora do escopo compliant: mercado opt-in, ou pessoa nomeada/autônomo.");
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    const token = await ctx.runMutation(internal.previews.ensureForLead, { leadId });
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const email = await writeEmail(key, lead, `${appUrl}/p/${token}`);

    await ctx.runMutation(internal.outreach.upsertDraft, {
      orgId,
      leadId,
      subject: email.subject,
      body: email.body,
      previewToken: token,
    });
    return email;
  },
});

/** Mark the outreach as sent (for the "I sent it myself" flow). Advances the lead. */
export const markSent = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const now = Date.now();
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (row) await ctx.db.patch(row._id, { status: "sent", sentAt: now });
    if (lead.stage === "base") {
      await ctx.db.patch(leadId, { stage: "approached", stageUpdatedAt: now });
    }
    await ctx.db.insert("events", { orgId, type: "email_sent", leadId, at: now });
  },
});

/** Optional convenience: send via Resend (needs the lead's email + Resend config). */
export const send = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ sent: boolean }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.emailable) throw new Error("Fora do escopo compliant.");
    if (!lead.email) throw new Error("Lead sem email — copie a abordagem e envie do seu email.");

    const row = await ctx.runQuery(api.outreach.getForLead, { leadId });
    if (!row?.subject || !row?.body) throw new Error("Escreva a abordagem primeiro.");

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw new Error("RESEND_API_KEY / RESEND_FROM não configurados.");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: lead.email, subject: row.subject, text: row.body }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Resend ${res.status}: ${t.slice(0, 200)}`);
    }

    await ctx.runMutation(api.outreach.markSent, { leadId });
    return { sent: true };
  },
});
