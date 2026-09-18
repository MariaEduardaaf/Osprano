import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { emailFields, normalizeInstagram, normalizeFacebook } from "./lib/domain";

/**
 * Manutenção: passa tudo que pertence a uma org para outra (ex.: dados
 * importados do demo para a conta real da dona). Só pela CLI
 * (`npx convex run admin:adoptOrg '{"from":"demo","to":"user_..."}'`);
 * internalMutation nunca é chamável pelo cliente.
 */
export const adoptOrg = internalMutation({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const counts: Record<string, number> = {};
    // Tabelas com índice by_org.
    for (const table of ["leads", "previews", "events", "outreach"] as const) {
      let n = 0;
      for (const doc of await ctx.db.query(table).withIndex("by_org", (q) => q.eq("orgId", from)).collect()) {
        await ctx.db.patch(doc._id, { orgId: to });
        n += 1;
      }
      counts[table] = n;
    }
    // Sem índice by_org: varredura completa (tabelas pequenas).
    for (const table of ["uploads", "suppressions"] as const) {
      let n = 0;
      for (const doc of await ctx.db.query(table).collect()) {
        if (doc.orgId !== from) continue;
        await ctx.db.patch(doc._id, { orgId: to });
        n += 1;
      }
      counts[table] = n;
    }
    const fromWs = await ctx.db.query("workspaces").withIndex("by_org", (q) => q.eq("orgId", from)).first();
    const toWs = await ctx.db.query("workspaces").withIndex("by_org", (q) => q.eq("orgId", to)).first();
    if (fromWs) {
      if (toWs) {
        await ctx.db.patch(toWs._id, {
          plan: fromWs.plan,
          leadsUsed: fromWs.leadsUsed,
          sitesUsed: fromWs.sitesUsed,
          periodStart: fromWs.periodStart,
        });
        await ctx.db.delete(fromWs._id);
      } else {
        await ctx.db.patch(fromWs._id, { orgId: to });
      }
      counts.workspaces = 1;
    }
    return counts;
  },
});

/** Apaga um lead e tudo que pende dele (preview e fotos, uploads, eventos, outreach). Só CLI. */
export const deleteLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { deleted: false };
    for (const p of await ctx.db.query("previews").withIndex("by_lead", (q) => q.eq("leadId", leadId)).collect())
      await ctx.db.delete(p._id);
    for (const u of await ctx.db.query("uploads").withIndex("by_lead", (q) => q.eq("leadId", leadId)).collect()) {
      await ctx.storage.delete(u.storageId);
      await ctx.db.delete(u._id);
    }
    for (const e of await ctx.db.query("events").withIndex("by_org", (q) => q.eq("orgId", lead.orgId)).collect())
      if (e.leadId === leadId) await ctx.db.delete(e._id);
    for (const o of await ctx.db.query("outreach").withIndex("by_org", (q) => q.eq("orgId", lead.orgId)).collect())
      if (o.leadId === leadId) await ctx.db.delete(o._id);
    await ctx.db.delete(leadId);
    return { deleted: true, name: lead.name };
  },
});

/** Grava o e-mail do negócio e recalcula abordabilidade, como o updateInfo faria. Só CLI. */
export const setLeadEmail = internalMutation({
  args: { leadId: v.id("leads"), email: v.optional(v.string()) },
  handler: async (ctx, { leadId, email }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    const clean = email?.trim().toLowerCase() || undefined;
    const fields = emailFields(lead, clean);
    await ctx.db.patch(leadId, fields);
    return { name: lead.name, ...fields };
  },
});

/** Marca como perdido com motivo (mesma regra do markLost). Só CLI. */
export const markLost = internalMutation({
  args: { leadId: v.id("leads"), reason: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { leadId, reason, note }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    const now = Date.now();
    await ctx.db.patch(leadId, {
      stage: "lost",
      stageUpdatedAt: now,
      lostReason: reason as Doc<"leads">["lostReason"],
      lostNote: note?.trim() || undefined,
      nextActionAt: undefined,
      nextActionNote: undefined,
    });
    await ctx.db.insert("events", { orgId: lead.orgId, type: "stage_change", leadId, at: now, meta: { from: lead.stage, to: "lost", reason } });
    return { name: lead.name, from: lead.stage };
  },
});

/** Instagram/Facebook do lead, normalizados como no updateInfo. Só CLI. */
export const setLeadSocial = internalMutation({
  args: { leadId: v.id("leads"), instagram: v.optional(v.string()), facebook: v.optional(v.string()) },
  handler: async (ctx, { leadId, instagram, facebook }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    const patch: { instagram?: string; facebook?: string } = {};
    if (instagram !== undefined) patch.instagram = normalizeInstagram(instagram) || undefined;
    if (facebook !== undefined) patch.facebook = normalizeFacebook(facebook) || undefined;
    await ctx.db.patch(leadId, patch);
    return { name: lead.name, ...patch };
  },
});

/** Manda leads para o CRM (saved=true), como o botão "Enviar pro CRM". Só CLI. */
export const saveLeads = internalMutation({
  args: { leadIds: v.array(v.id("leads")) },
  handler: async (ctx, { leadIds }) => {
    let n = 0;
    for (const id of leadIds) {
      const lead = await ctx.db.get(id);
      if (!lead) continue;
      await ctx.db.patch(id, { saved: true });
      n += 1;
    }
    return { saved: n };
  },
});
