import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { classifyWebsite, emailFields, normalizeInstagram, normalizeFacebook } from "./lib/domain";
import { leadLabel } from "./lib/googleData";
import { deleteLeadCascade } from "./model/leads";
import { buildImportedLead, importDedupeKey } from "./lib/importLead";

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

/** Apaga um lead e tudo que pende dele (preview e fotos, uploads, eventos, outreach). Só CLI.
 *  Cascata compartilhada com `leads.remove` (o botão "Excluir" da UI) via `deleteLeadCascade`. */
export const deleteLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) return { deleted: false };
    await deleteLeadCascade(ctx, lead);
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

/**
 * Move pra Abordado os leads que receberam e-mail fora do app (prospecção manual), achados
 * pelo e-mail, com o follow-up como próxima ação e uma nota no Histórico. Só CLI.
 */
export const markApproached = internalMutation({
  args: {
    orgId: v.string(),
    emails: v.array(v.string()),
    nextActionAt: v.optional(v.number()),
    nextActionNote: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, emails, nextActionAt, nextActionNote, note }) => {
    const leads = await ctx.db.query("leads").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const now = Date.now();
    const moved: string[] = [];
    const notFound: string[] = [];
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      const lead = leads.find((l) => l.email?.trim().toLowerCase() === email);
      if (!lead) {
        notFound.push(email);
        continue;
      }
      await ctx.db.patch(lead._id, {
        stage: "approached",
        stageUpdatedAt: now,
        nextActionAt,
        nextActionNote: nextActionNote?.trim() || undefined,
      });
      await ctx.db.insert("events", { orgId, type: "stage_change", leadId: lead._id, at: now, meta: { from: lead.stage, to: "approached" } });
      const text = note?.trim();
      if (text) await ctx.db.insert("events", { orgId, type: "note", leadId: lead._id, at: now, meta: { text } });
      moved.push(leadLabel(lead));
    }
    return { moved, notFound };
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

/**
 * Prévia (sem apagar nada) da limpeza pós-mudança de regra da descoberta: antes ela
 * guardava todo negócio encontrado, agora só quem não tem site de verdade
 * (classifyWebsite → hasRealSite; rede social continua contando como "sem site"). Lista
 * quem ficaria pra trás numa busca antiga — só o que NUNCA foi enviado ao CRM
 * (saved !== true), porque o que já está no CRM é decisão da dona, não sobra da
 * descoberta. Rode isto ANTES de purgeUnsavedWithSite pra conferir. Só CLI.
 */
export const previewUnsavedWithSite = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const matches = leads.filter((l) => l.saved !== true && classifyWebsite(l.website).hasRealSite);
    return { count: matches.length, names: matches.map((l) => l.name) };
  },
});

/**
 * Apaga (cascata via deleteLeadCascade, mesma de leads.remove/admin.deleteLead) os leads
 * que a descoberta guardou ANTES da regra "só sem site" existir e que nunca foram
 * enviados ao CRM. Mesmo critério do previewUnsavedWithSite — rode ele primeiro pra
 * conferir. Não apaga lead com saved=true, mesmo com site: aí já é decisão da dona. Só CLI.
 */
export const purgeUnsavedWithSite = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const matches = leads.filter((l) => l.saved !== true && classifyWebsite(l.website).hasRealSite);
    const names: string[] = [];
    for (const lead of matches) {
      await deleteLeadCascade(ctx, lead);
      names.push(leadLabel(lead));
    }
    return { deleted: names.length, names };
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

/**
 * Importa leads pesquisados fora do app (prospecção manual) direto no CRM da org.
 * Pula quem já existe (mesmo e-mail, ou mesmo nome + cidade). Cada lead pode
 * levar uma nota (ex.: o e-mail pronto) e a próxima ação. Só CLI:
 * `npx convex run --prod admin:importLeads "$(cat leads.json)"`.
 */
export const importLeads = internalMutation({
  args: {
    orgId: v.string(),
    leads: v.array(
      v.object({
        name: v.string(),
        countryCode: v.string(),
        category: v.optional(v.string()),
        city: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        instagram: v.optional(v.string()),
        facebook: v.optional(v.string()),
        incorporated: v.boolean(),
        businessEmail: v.optional(v.boolean()),
        stage: v.union(v.literal("base"), v.literal("approached")),
        note: v.optional(v.string()),
        nextActionAt: v.optional(v.number()),
        nextActionNote: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { orgId, leads }) => {
    const existing = await ctx.db.query("leads").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const seen = new Set<string>();
    for (const l of existing) {
      seen.add(importDedupeKey({ ...l, name: l.name ?? "" }));
      seen.add(importDedupeKey({ name: l.name ?? "", city: l.city }));
    }
    const now = Date.now();
    const inserted: string[] = [];
    const skipped: string[] = [];
    for (const input of leads) {
      const keys = [importDedupeKey(input), importDedupeKey({ name: input.name, city: input.city })];
      if (keys.some((k) => seen.has(k))) {
        skipped.push(input.name);
        continue;
      }
      keys.forEach((k) => seen.add(k));
      const leadId = await ctx.db.insert("leads", {
        orgId,
        ...buildImportedLead(input),
        stageUpdatedAt: now,
        scoredAt: now,
        fetchedAt: now,
        nextActionAt: input.nextActionAt,
        nextActionNote: input.nextActionNote?.trim() || undefined,
      });
      const text = input.note?.trim();
      if (text) await ctx.db.insert("events", { orgId, type: "note", leadId, at: now, meta: { text } });
      inserted.push(input.name);
    }
    return { inserted: inserted.length, skipped };
  },
});
