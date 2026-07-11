import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireOrgId } from "./model/tenant";
import { writeEmail, LANG } from "./lib/outreachAi";
import { normalizeEmail } from "./lib/domain";
import { optOutFooter, senderIdentityFrom } from "./lib/compliance";
import { addSuppression } from "./suppressions";

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

/** Caixa de saída: leads que já têm abordagem, com status (rascunho → enviado → abriu → respondeu). */
export const outbox = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const rows = await ctx.db
      .query("outreach")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const items = [];
    for (const row of rows) {
      const lead = await ctx.db.get(row.leadId);
      if (!lead) continue;

      let status = row.status; // draft | sent | opened | replied | bounced
      let openCount = 0;
      let lastOpenedAt: number | null = null;
      if (status === "sent" || status === "opened") {
        const preview = await ctx.db
          .query("previews")
          .withIndex("by_lead", (q) => q.eq("leadId", row.leadId))
          .first();
        if (preview) {
          openCount = preview.openCount;
          lastOpenedAt = preview.lastOpenedAt ?? null;
          if (status === "sent" && preview.openCount > 0) status = "opened";
        }
      }

      items.push({
        leadId: row.leadId,
        name: lead.name,
        category: lead.category ?? null,
        city: lead.city ?? null,
        score: lead.score ?? null,
        tier: (lead.tier ?? "cold") as "hot" | "warm" | "cold",
        emailable: lead.emailable ?? false,
        status,
        subject: row.subject ?? null,
        previewToken: row.previewToken ?? null,
        sentAt: row.sentAt ?? null,
        openedAt: row.openedAt ?? lastOpenedAt,
        openCount,
        activityAt: row.openedAt ?? lastOpenedAt ?? row.sentAt ?? row._creationTime,
      });
    }

    items.sort((a, b) => (b.activityAt ?? 0) - (a.activityAt ?? 0));
    return items;
  },
});

function buildUnsubscribeUrl(token: string): string {
  return `${process.env.CONVEX_SITE_URL}/unsubscribe?token=${token}`;
}

/** Anexa o rodapé de opt-out se ainda não estiver presente (marcador = a URL única). */
function withOptOutFooter(body: string, lead: Doc<"leads"> | null, token: string): string {
  const url = buildUnsubscribeUrl(token);
  if (body.includes(url)) return body; // idempotente
  const sender = senderIdentityFrom(process.env.RESEND_FROM ?? "Osprano");
  const lang = LANG[lead?.countryCode ?? ""] ?? "English";
  return `${body}${optOutFooter(lang, url, sender)}`;
}

export const upsertDraft = internalMutation({
  args: {
    orgId: v.string(),
    leadId: v.id("leads"),
    subject: v.string(),
    body: v.string(),
    previewToken: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    const existing = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
    const unsubscribeToken = existing?.unsubscribeToken ?? crypto.randomUUID().replace(/-/g, "");
    const body = withOptOutFooter(args.body, lead, unsubscribeToken);
    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        body,
        previewToken: args.previewToken,
        unsubscribeToken,
        status: "draft",
      });
      return existing._id;
    }
    return await ctx.db.insert("outreach", {
      orgId: args.orgId,
      leadId: args.leadId,
      channel: "email",
      subject: args.subject,
      body,
      previewToken: args.previewToken,
      unsubscribeToken,
      status: "draft",
    });
  },
});

export const setUnsubscribeToken = internalMutation({
  args: { outreachId: v.id("outreach"), unsubscribeToken: v.string() },
  handler: async (ctx, { outreachId, unsubscribeToken }) => {
    await ctx.db.patch(outreachId, { unsubscribeToken });
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
    if (lead.email) {
      const suppressed = await ctx.runQuery(internal.suppressions.isSuppressed, {
        email: normalizeEmail(lead.email),
        orgId,
      });
      if (suppressed) throw new Error("Este contato pediu para não ser contatado (opt-out).");
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

/** Registrar supressão manual ("respondeu stop"). Org-scoped. UI na Fase 3. */
export const suppress = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.email) throw new Error("Lead sem email para suprimir.");
    await addSuppression(ctx, {
      email: normalizeEmail(lead.email),
      orgId,
      source: "manual",
      leadId,
    });
    return { suppressed: true };
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
