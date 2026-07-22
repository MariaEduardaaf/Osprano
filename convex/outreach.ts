import { action, mutation, query, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOrgId } from "./model/tenant";
import { writeEmail, writeCallScript, LANG } from "./lib/outreachAi";
import { normalizeEmail, canContactByEmail } from "./lib/domain";
import { optOutFooter, senderIdentityFrom } from "./lib/compliance";
import { addSuppression, isEmailSuppressed } from "./suppressions";

/**
 * A tabela `outreach` é COMPARTILHADA entre canais: convex/whatsapp.ts insere linhas
 * com `channel: "whatsapp"` (status "sent") no MESMO índice `by_lead`. Um `.first()`
 * sem filtro de canal devolve a linha de WhatsApp quando ela vem primeiro no índice —
 * fazendo patch/leitura na linha errada (ex.: marcar o WhatsApp como "email enviado"
 * e deixar o email real intocado). TODA leitura do email de um lead passa por aqui.
 */
async function emailRowForLead(
  ctx: QueryCtx,
  leadId: Id<"leads">,
): Promise<Doc<"outreach"> | null> {
  return await ctx.db
    .query("outreach")
    .withIndex("by_lead", (q) => q.eq("leadId", leadId))
    .filter((q) => q.eq(q.field("channel"), "email"))
    .first();
}

export const getForLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const row = await emailRowForLead(ctx, leadId);
    if (!row || row.orgId !== orgId) return null;
    return row;
  },
});

/** Caixa de saída: leads que já têm abordagem, com status (rascunho → enviado → abriu → respondeu).
    Só linhas de email: a tela (src/app/(app)/outreach/page.tsx) é declaradamente de email
    ("Acompanhe cada abordagem por email"), usa `leadId` como chave de linha (uma linha de
    WhatsApp duplicaria a chave) e oferece "Respondeu", que marca a linha de EMAIL. Sem o
    filtro, um follow-up de WhatsApp apareceria como "email enviado". */
export const outbox = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const rows = await ctx.db
      .query("outreach")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("channel"), "email"))
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
        // Abordabilidade = canContactByEmail (consentimento supera o regime do mercado),
        // nunca o `emailable` cru — mesma regra do resto do app.
        emailable: canContactByEmail(lead),
        status,
        subject: row.subject ?? null,
        previewToken: row.previewToken ?? null,
        sentAt: row.sentAt ?? null,
        openedAt: row.openedAt ?? lastOpenedAt,
        openCount,
        repliedAt: row.repliedAt ?? null,
        activityAt: row.repliedAt ?? row.openedAt ?? lastOpenedAt ?? row.sentAt ?? row._creationTime,
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
    // Defesa em profundidade: hoje o único chamador é `draft` (já gateado), mas o gate
    // mora também aqui, colado na escrita — qualquer chamador interno futuro passaria
    // direto e persistiria assunto/corpo de email para um lead sem base legal.
    if (!lead) throw new Error("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw new Error("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    const existing = await emailRowForLead(ctx, args.leadId);
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

/** Draft a compliant cold email with AI. Gated by canContactByEmail (emailable OU consentimento). */
export const draft = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ subject: string; body: string }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw new Error("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
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

/** OPTIN-03: gera (e persiste) um script de ligação por IA. NÃO exige consentimento — só telefone.
    DECISÃO DELIBERADA: ao contrário de `draft`/`send`, NÃO consulta a lista de supressão. A supressão
    é indexada por email e registra "não me mande email"; a ligação é canal distinto — e é exatamente
    o que resta quando o email está bloqueado (mercado opt-in ou opt-out do prospect). Se o prospect
    pedir para não ser contatado por telefone, isso é tratado como opt-out manual do lead, não aqui. */
export const callScript = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ script: string; translation: string }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!lead.phone) throw new Error("Lead sem telefone.");
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    const result = await writeCallScript(key, lead);
    await ctx.runMutation(internal.leads.setCallScript, {
      leadId,
      script: result.script,
      translation: result.translation,
    });
    return result;
  },
});

/** Mark the outreach as sent (for the "I sent it myself" flow). Advances the lead.
    OPTIN-04: este é o 3º caminho que produz "email enviado" (junto de draft/send) e por isso
    passa pelo MESMO gate — sem ele, um lead de mercado opt-in sem consentimento ficaria com
    status "sent" + evento "email_sent" registrados. `send` já checa antes de chamar esta
    mutation, então a chamada interna continua passando. */
export const markSent = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw new Error("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    // Mesma checagem de supressão de `draft`/`send`: sem ela, um prospect que pediu
    // opt-out ainda podia ser registrado como "enviei eu mesmo". Como markSent é
    // mutation (não action), chama o helper de ctx.db em vez de ctx.runQuery — mesma
    // fonte de verdade da internalQuery `suppressions.isSuppressed`.
    if (lead.email) {
      const suppressed = await isEmailSuppressed(ctx, {
        email: normalizeEmail(lead.email),
        orgId,
      });
      if (suppressed) throw new Error("Este contato pediu para não ser contatado (opt-out).");
    }
    const now = Date.now();
    const row = await emailRowForLead(ctx, leadId);
    if (row) await ctx.db.patch(row._id, { status: "sent", sentAt: now });
    if (lead.stage === "base") {
      await ctx.db.patch(leadId, { stage: "approached", stageUpdatedAt: now });
    }
    await ctx.db.insert("events", { orgId, type: "email_sent", leadId, at: now });
  },
});

/** TRCK-02: marca uma abordagem como "respondeu" manualmente (outbox / lead-detail). */
export const markReplied = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw new Error("Nenhuma abordagem encontrada para este lead.");
    const now = Date.now();
    await ctx.db.patch(row._id, { status: "replied", repliedAt: now });
    await ctx.db.insert("events", { orgId, type: "reply", leadId, at: now });
    return { repliedAt: now };
  },
});

/** OUTR-01: persiste o que o usuário editou no composer, antes de send/markSent/copy.
    NÃO injeta rodapé de opt-out — o send (Fase 2) re-garante footer/headers de forma
    idempotente, então uma edição do usuário nunca remove a garantia de compliance.
    OPTIN-04: mesmo gate de draft/send/markSent — persistir rascunho de email para um lead
    sem base legal não deve acontecer. Não quebra fluxo legítimo: só existe rascunho para
    editar se `draft` (já gateado) rodou antes. */
export const updateDraft = mutation({
  args: { leadId: v.id("leads"), subject: v.string(), body: v.string() },
  handler: async (ctx, { leadId, subject, body }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw new Error("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw new Error("Nenhum rascunho encontrado para este lead.");
    await ctx.db.patch(row._id, { subject, body });
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
    if (!canContactByEmail(lead)) {
      throw new Error("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    if (!lead.email) throw new Error("Lead sem email — copie a abordagem e envie do seu email.");

    const suppressed = await ctx.runQuery(internal.suppressions.isSuppressed, {
      email: normalizeEmail(lead.email),
      orgId,
    });
    if (suppressed) throw new Error("Este contato pediu para não ser contatado (opt-out).");

    const row = await ctx.runQuery(api.outreach.getForLead, { leadId });
    if (!row?.subject || !row?.body) throw new Error("Escreva a abordagem primeiro.");

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw new Error("RESEND_API_KEY / RESEND_FROM não configurados.");

    let unsubscribeToken = row.unsubscribeToken;
    if (!unsubscribeToken) {
      unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
      await ctx.runMutation(internal.outreach.setUnsubscribeToken, {
        outreachId: row._id,
        unsubscribeToken,
      });
    }
    const unsubscribeUrl = `${process.env.CONVEX_SITE_URL}/unsubscribe?token=${unsubscribeToken}`;
    let body = row.body;
    if (!body.includes(unsubscribeUrl)) {
      const lang = LANG[lead.countryCode] ?? "English";
      body = `${body}${optOutFooter(lang, unsubscribeUrl, senderIdentityFrom(from))}`;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: lead.email,
        subject: row.subject,
        text: body,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Resend ${res.status}: ${t.slice(0, 200)}`);
    }

    await ctx.runMutation(api.outreach.markSent, { leadId });
    return { sent: true };
  },
});
