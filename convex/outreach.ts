import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOrgId } from "./model/tenant";
import { withAiQuota } from "./model/aiQuota";
import { assertAccepted, getWorkspace } from "./model/workspace";
import { writeEmail, writeCallScript, langForLead, NAME_PLACEHOLDER } from "./lib/outreachAi";
import { requireSender, senderFooterIdentity } from "./lib/sender";
import type { OutreachWarning } from "./lib/outreachAi";
import { CONFIRM_NAME_MESSAGE, leadLabel, shareableFacts, shareableLead } from "./lib/googleData";
import { normalizeEmail, canContactByEmail, addDays } from "./lib/domain";
import { optOutFooter, senderIdentityFrom, stripOptOutFooter, composeOutgoingBody } from "./lib/compliance";
import {
  requireAppUrl,
  requireUnsubscribeBaseUrl,
  unsubscribeUrlFrom,
  hasUnsubscribeLink,
  draftLinkIssue,
} from "./lib/env";
import { addSuppression, isEmailSuppressed } from "./suppressions";
import { userError } from "./lib/errors";

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
// ponytail: a caixa de saída mostra os 300 envios mais recentes; paginar se uma org passar disso
const OUTBOX_LIMIT = 300;

export const outbox = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const rows = await ctx.db
      .query("outreach")
      .withIndex("by_org_channel", (q) => q.eq("orgId", orgId).eq("channel", "email"))
      .order("desc")
      .take(OUTBOX_LIMIT);

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
        name: leadLabel(lead),
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

/** Devolve o rascunho REALMENTE persistido (assunto + corpo SEM rodapé), não os argumentos
    recebidos. O rodapé (identidade do cliente, descadastro, fonte do dado) é montado só em
    `prepareSend`, na hora de enviar: assim nunca fica desatualizado (perfil trocado) nem
    carrega o rodapé antigo com o nome da Duda. */
export const upsertDraft = internalMutation({
  args: {
    orgId: v.string(),
    leadId: v.id("leads"),
    subject: v.string(),
    body: v.string(),
    previewToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ subject: string; body: string }> => {
    const lead = await ctx.db.get(args.leadId);
    // Defesa em profundidade: hoje o único chamador é `draft` (já gateado), mas o gate
    // mora também aqui, colado na escrita — qualquer chamador interno futuro passaria
    // direto e persistiria assunto/corpo de email para um lead sem base legal.
    if (!lead) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    const existing = await emailRowForLead(ctx, args.leadId);
    const unsubscribeToken = existing?.unsubscribeToken ?? crypto.randomUUID().replace(/-/g, "");
    const body = stripOptOutFooter(args.body); // rodapé só em prepareSend
    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        body,
        previewToken: args.previewToken,
        unsubscribeToken,
        status: "draft",
      });
    } else {
      await ctx.db.insert("outreach", {
        orgId: args.orgId,
        leadId: args.leadId,
        channel: "email",
        subject: args.subject,
        body,
        previewToken: args.previewToken,
        unsubscribeToken,
        status: "draft",
      });
    }
    return { subject: args.subject, body };
  },
});

export const setUnsubscribeToken = internalMutation({
  args: { outreachId: v.id("outreach"), unsubscribeToken: v.string() },
  handler: async (ctx, { outreachId, unsubscribeToken }) => {
    await ctx.db.patch(outreachId, { unsubscribeToken });
  },
});

/**
 * Só-leitura: IDIOMA do prospect por trás de um token de unsubscribe, para a página de
 * confirmação (COMP-02) sair no idioma em que o rodapé foi escrito.
 *
 * Devolve o idioma já resolvido (não o país) por dois motivos: `langForLead` precisa da
 * CIDADE além do país — na Suíça o idioma é regional — e o endpoint público não tem por
 * que receber dado do lead que não vai usar. Token desconhecido ou lead sumido → null,
 * e o handler cai no inglês.
 *
 * Substitui `suppressions.countryForUnsubToken`, que só conhecia o país (Genebra recebia
 * a página em alemão). Vive aqui porque lê a tabela `outreach`.
 */
export const langForUnsubToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<string | null> => {
    const row = await ctx.db
      .query("outreach")
      .withIndex("by_unsub_token", (q) => q.eq("unsubscribeToken", token))
      .first();
    if (!row) return null;
    const lead = await ctx.db.get(row.leadId);
    if (!lead) return null;
    return langForLead(lead);
  },
});

/** Draft a compliant cold email with AI. Gated by canContactByEmail (emailable OU consentimento).
    Devolve também os `warnings` de `writeEmail` (alegação de localidade, lead sem sinal
    verificado): a assinatura antiga os apagava no limite da action, e um aviso que some é o
    mesmo que não ter aviso. Quem chama decide como exibir — mas recebe. */
export const draft = action({
  args: { leadId: v.id("leads") },
  handler: async (
    ctx,
    { leadId },
  ): Promise<{ subject: string; body: string; warnings: OutreachWarning[] }> => {
    const orgId = await requireOrgId(ctx);
    const ws = await ctx.runQuery(internal.workspaces.getInternal, { orgId });
    assertAccepted(ws, orgId);
    const sender = requireSender(ws?.sender); // antes de cota e de IA: sem perfil não se gasta nada
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    // Fase 10: a IA só recebe dado compartilhável (googleData.ts); lead do Google precisa de nome confirmado
    const safe = shareableLead(lead);
    if (!safe.name) throw userError(CONFIRM_NAME_MESSAGE);
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    if (lead.email) {
      const suppressed = await ctx.runQuery(internal.suppressions.isSuppressed, {
        email: normalizeEmail(lead.email),
        orgId,
      });
      if (suppressed) throw userError("Este contato pediu para não ser contatado (opt-out).");
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw userError("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    // PRÉ-CONDIÇÕES DE LINK, resolvidas ANTES da chamada de IA: não gasta tokens num
    // rascunho que não poderia ser enviado. O rascunho volta SEM rodapé; o rodapé (identidade
    // do cliente, descadastro e fonte do dado) é montado só em `prepareSend`, que também
    // exige CONVEX_SITE_URL. Não há header List-Unsubscribe no envio por mailto.
    const appUrl = requireAppUrl();
    requireUnsubscribeBaseUrl();

    const token = await ctx.runMutation(internal.previews.ensureForLead, { leadId });
    // Quem assina é o perfil de remetente do cliente (Ajustes > Remetente), nunca o RESEND_FROM.
    const email = await withAiQuota(ctx, orgId, () => writeEmail(key, safe, `${appUrl}/p/${token}`, {
      callerName: sender.name,
      company: sender.company,
    }));

    // Devolve o que foi persistido (sem rodapé; `prepareSend` o monta ao enviar).
    const persisted = await ctx.runMutation(internal.outreach.upsertDraft, {
      orgId,
      leadId,
      subject: email.subject,
      body: email.body,
      previewToken: token,
    });
    return { subject: persisted.subject, body: persisted.body, warnings: email.warnings };
  },
});

/** OPTIN-03: gera (e persiste) um script de ligação por IA. NÃO exige consentimento — só telefone.
    DECISÃO DELIBERADA: ao contrário de `draft`/`send`, NÃO consulta a lista de supressão. A supressão
    é indexada por email e registra "não me mande email"; a ligação é canal distinto — e é exatamente
    o que resta quando o email está bloqueado (mercado opt-in ou opt-out do prospect). Se o prospect
    pedir para não ser contatado por telefone, isso é tratado como opt-out manual do lead, não aqui. */
export const callScript = action({
  args: { leadId: v.id("leads") },
  handler: async (
    ctx,
    { leadId },
  ): Promise<{ script: string; translation: string; warnings: OutreachWarning[] }> => {
    const orgId = await requireOrgId(ctx);
    const ws = await ctx.runQuery(internal.workspaces.getInternal, { orgId });
    assertAccepted(ws, orgId);
    const sender = requireSender(ws?.sender); // antes de cota e de IA
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    // Fase 10: a IA só recebe dado compartilhável (googleData.ts); lead do Google precisa de nome confirmado
    const safe = shareableLead(lead);
    if (!safe.name) throw userError(CONFIRM_NAME_MESSAGE);
    if (!shareableFacts(lead).phone) throw userError("Lead sem telefone.");
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw userError("ANTHROPIC_API_KEY não configurada no deployment Convex.");

    // A PRÉVIA TEM QUE EXISTIR ANTES DO TEXTO. O prompt do script manda dizer, EM VOZ ALTA e
    // no passado, que "um site de prévia já foi feito para vocês" (item (3) de
    // `callScriptSystemPrompt`) — e esta action nunca criava a prévia: a frase era falsa no
    // instante em que ela era dita ao prospect, e a promessa do fecho ("posso te mandar por
    // email/WhatsApp?") não tinha o que mandar. Mesmo caminho de `draft`:
    // `previews.ensureForLead` é idempotente (devolve o token existente se já houver) e NÃO
    // consome cota — quem cobra usage é `previews.publish`, não a prévia rastreada. O token
    // não entra no texto de propósito: numa ligação ninguém dita URL, e o link segue depois
    // pelo canal que o prospect autorizar.
    await ctx.runMutation(internal.previews.ensureForLead, { leadId });

    // Quem liga se apresenta com o nome do perfil de remetente do cliente (Ajustes > Remetente),
    // nunca o RESEND_FROM. NUNCA um nome inventado pelo modelo: ela lê o script em voz alta.
    const result = await withAiQuota(ctx, orgId, () => writeCallScript(key, safe, {
      callerName: sender.name,
      company: sender.company,
    }));
    await ctx.runMutation(internal.leads.setCallScript, {
      leadId,
      script: result.script,
      translation: result.translation,
    });
    return result;
  },
});

/**
 * SEND-02/SEND-03: prepara a mensagem para o cliente enviar do próprio e-mail. O servidor
 * confere tudo na hora (perfil, dono, mercado/consentimento, e-mail, supressão) e devolve o
 * texto exato que o cliente abre no Gmail/Outlook/app ou copia. NADA é transmitido pelo
 * Osprano. Sem `List-Unsubscribe` (não dá por mailto): o descadastro vai no corpo.
 */
export const prepareSend = mutation({
  args: { leadId: v.id("leads"), subject: v.string(), body: v.string() },
  handler: async (ctx, { leadId, subject, body }): Promise<{ to: string; subject: string; body: string }> => {
    const orgId = await requireOrgId(ctx);
    const ws = await getWorkspace(ctx, orgId);
    assertAccepted(ws, orgId);
    const sender = requireSender(ws?.sender);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    if (!lead.email) throw userError("Lead sem e-mail: preencha em Informações > Contato.");
    if (await isEmailSuppressed(ctx, { email: normalizeEmail(lead.email), orgId })) {
      throw userError("Este contato pediu para não ser contatado (opt-out).");
    }
    const cleanSubject = subject.trim();
    const text = stripOptOutFooter(body).trim();
    if (!cleanSubject || !text) throw userError("Escreva o assunto e a mensagem antes de enviar.");
    if (text.includes(NAME_PLACEHOLDER) || cleanSubject.includes(NAME_PLACEHOLDER)) {
      throw userError(`Troque ${NAME_PLACEHOLDER} pelo seu nome antes de enviar.`);
    }
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw userError("Escreva a abordagem primeiro.");
    const unsubscribeToken = row.unsubscribeToken ?? crypto.randomUUID().replace(/-/g, "");
    const finalBody = composeOutgoingBody(text, {
      lang: langForLead(lead),
      unsubscribeUrl: unsubscribeUrlFrom(unsubscribeToken),
      identity: senderFooterIdentity(sender),
      source: lead.source,
    });
    const issue = draftLinkIssue(finalBody);
    if (issue) throw userError(issue);
    await ctx.db.patch(row._id, { subject: cleanSubject, body: finalBody, unsubscribeToken });
    return { to: lead.email, subject: cleanSubject, body: finalBody };
  },
});

/** SEND-04: "Marquei como enviada". Só marca o que passou por `prepareSend` (corpo com o link
    de descadastro do token da linha). Avança o lead para Abordado e registra email_sent.
    Mesmos portões de mercado e supressão de `prepareSend`. */
export const markSent = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    if (lead.email) {
      const suppressed = await isEmailSuppressed(ctx, {
        email: normalizeEmail(lead.email),
        orgId,
      });
      if (suppressed) throw userError("Este contato pediu para não ser contatado (opt-out).");
    }
    const row = await emailRowForLead(ctx, leadId);
    if (!row?.body || !row.unsubscribeToken || !hasUnsubscribeLink(row.body, row.unsubscribeToken)) {
      throw userError("Clique em Enviar para preparar a mensagem antes de marcar como enviada.");
    }
    const now = Date.now();
    await ctx.db.patch(row._id, { status: "sent", sentAt: now });
    if (lead.stage === "base") {
      await ctx.db.patch(leadId, { stage: "approached", stageUpdatedAt: now });
    }
    await ctx.db.insert("events", { orgId, type: "email_sent", leadId, at: now });
  },
});

/**
 * Marca contato por DM (Instagram/Facebook) — canal da maioria dos leads sem site: sem
 * email, quem existe é o perfil social. Ao contrário de markSent/draft/send, NÃO passa por
 * canContactByEmail nem pela lista de supressão: as duas são regras de EMAIL FRIO (cold
 * email), e DM manual num perfil que ela já escolheu abrir não é a mesma coisa — não há
 * gate de compliance aqui.
 *
 * Move `stage` de "base" para "approached" (outros estágios ficam intactos, mesma regra de
 * `markSent`) e agenda a próxima ação em 3 dias SÓ quando o lead ainda não tem nenhuma —
 * não pisa num follow-up que ela já tenha marcado à mão.
 *
 * A tabela `outreach` guarda uma linha (`channel: "dm"`, sem `subject`) com o texto
 * enviado, para o histórico ter o corpo exato — mas SEM entrar na `outbox` (que filtra
 * `channel === "email"` de propósito, ver `emailRowForLead`) nem no fluxo de resposta por
 * email (`markReplied`/`suppress` continuam olhando só a linha de email). O canal exato
 * (instagram/facebook) fica no evento `dm_sent`, não nesta linha.
 */
export const markDm = mutation({
  args: {
    leadId: v.id("leads"),
    channel: v.union(v.literal("instagram"), v.literal("facebook")),
    message: v.string(),
  },
  handler: async (ctx, { leadId, channel, message }): Promise<{ stage: Doc<"leads">["stage"] }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    const body = message.trim();
    if (!body) throw userError("Escreva a mensagem antes de marcar");

    const now = Date.now();
    const patch: Partial<Doc<"leads">> = {};
    if (lead.stage === "base") {
      patch.stage = "approached";
      patch.stageUpdatedAt = now;
    }
    // Só agenda quando NÃO existe nenhuma próxima ação — nunca sobrescreve o que ela já marcou.
    if (lead.nextActionAt == null) {
      patch.nextActionAt = addDays(now, 3);
      patch.nextActionNote = "Follow-up DM";
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(leadId, patch);

    const dmRow = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .filter((q) => q.eq(q.field("channel"), "dm"))
      .first();
    if (dmRow) {
      await ctx.db.patch(dmRow._id, { body, status: "sent", sentAt: now });
    } else {
      await ctx.db.insert("outreach", {
        orgId,
        leadId,
        channel: "dm",
        body,
        status: "sent",
        sentAt: now,
      });
    }

    await ctx.db.insert("events", { orgId, type: "dm_sent", leadId, at: now, meta: { channel } });
    return { stage: patch.stage ?? lead.stage };
  },
});

/** TRCK-02: marca uma abordagem como "respondeu" manualmente (outbox / lead-detail). */
export const markReplied = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw userError("Nenhuma abordagem encontrada para este lead.");
    const now = Date.now();
    await ctx.db.patch(row._id, { status: "replied", repliedAt: now });
    await ctx.db.insert("events", { orgId, type: "reply", leadId, at: now });
    return { repliedAt: now };
  },
});

/** Registrar supressão manual ("respondeu stop"). Org-scoped. UI na Fase 3. */
export const suppress = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!lead.email) throw userError("Lead sem email para suprimir.");
    await addSuppression(ctx, {
      email: normalizeEmail(lead.email),
      orgId,
      source: "manual",
      leadId,
    });
    return { suppressed: true };
  },
});

// SEND-02: o Osprano não transmite e-mail de cliente. A integração fica para o envio
// automático (AUTO-*, v2), que antes de ligar precisa trocar a identidade do RESEND_FROM pelo
// perfil de remetente e ter teto diário (M7).
const CLIENT_SEND_VIA_RESEND = false;

/** Envio via Resend (DESLIGADO por CLIENT_SEND_VIA_RESEND; nenhum botão o chama). */
export const send = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ sent: boolean }> => {
    if (!CLIENT_SEND_VIA_RESEND) {
      throw userError("O envio pelo Osprano está desligado: use Enviar para abrir no seu e-mail.");
    }
    const orgId = await requireOrgId(ctx);
    assertAccepted(await ctx.runQuery(internal.workspaces.getInternal, { orgId }), orgId);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    if (!lead.email) throw userError("Lead sem email — copie a abordagem e envie do seu email.");

    const suppressed = await ctx.runQuery(internal.suppressions.isSuppressed, {
      email: normalizeEmail(lead.email),
      orgId,
    });
    if (suppressed) throw userError("Este contato pediu para não ser contatado (opt-out).");

    const row = await ctx.runQuery(api.outreach.getForLead, { leadId });
    if (!row?.subject || !row?.body) throw userError("Escreva a abordagem primeiro.");

    // O corpo pode ter sido gravado ANTES destas travas existirem (há rascunhos no banco com
    // `undefined/unsubscribe` no rodapé) ou num ambiente de desenvolvimento. Como o bloco
    // abaixo só ANEXA rodapé quando o correto falta, o link quebrado antigo iria junto.
    const issue = draftLinkIssue(row.body);
    if (issue) throw userError(issue);

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw userError("RESEND_API_KEY / RESEND_FROM não configurados.");

    let unsubscribeToken = row.unsubscribeToken;
    if (!unsubscribeToken) {
      unsubscribeToken = crypto.randomUUID().replace(/-/g, "");
      await ctx.runMutation(internal.outreach.setUnsubscribeToken, {
        outreachId: row._id,
        unsubscribeToken,
      });
    }
    // Recheca CONVEX_SITE_URL no momento do envio (não confia no que o draft viu): esta URL
    // vai no header List-Unsubscribe de TODO email, inclusive quando o corpo já tem rodapé.
    const unsubscribeUrl = unsubscribeUrlFrom(unsubscribeToken);
    let body = row.body;
    if (!hasUnsubscribeLink(body, unsubscribeToken)) {
      // `lead` é o doc completo (leads.getInternal), então tem `city` — o rodapé do
      // prospect de Genebra sai em francês, não no alemão do país.
      const lang = langForLead(lead);
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
      // Corpo da resposta só nos logs do Convex: nunca vaza pro cliente.
      console.error(`Resend ${res.status}:`, (await res.text()).slice(0, 200));
      throw userError(`Resend respondeu ${res.status}`);
    }

    await ctx.runMutation(api.outreach.markSent, { leadId });
    return { sent: true };
  },
});
