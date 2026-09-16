import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOrgId } from "./model/tenant";
import { writeEmail, writeCallScript, langForLead } from "./lib/outreachAi";
import type { OutreachWarning } from "./lib/outreachAi";
import { normalizeEmail, canContactByEmail } from "./lib/domain";
import { optOutFooter, senderIdentityFrom, callerNameFrom } from "./lib/compliance";
import {
  requireAppUrl,
  requireUnsubscribeBaseUrl,
  requireSenderFrom,
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

/**
 * Anexa o rodapé de opt-out se ainda não estiver presente (marcador = caminho + token, que
 * não muda se a base do CONVEX_SITE_URL for reconfigurada — ver `hasUnsubscribeLink`).
 *
 * A URL é montada ANTES do teste de idempotência de propósito: assim a validação de
 * ambiente roda em toda escrita, inclusive quando o rodapé já está lá.
 *
 * LANÇA quando CONVEX_SITE_URL/RESEND_FROM faltam (ver convex/lib/env.ts): o rodapé é
 * PERSISTIDO no rascunho, então um valor inventado aqui fica gravado e viaja para o
 * prospect. Falhar a escrita é o comportamento certo — antes nenhum rascunho do que um
 * rascunho com `undefined/unsubscribe` no rodapé de compliance.
 */
function withOptOutFooter(body: string, lead: Doc<"leads"> | null, token: string): string {
  const url = unsubscribeUrlFrom(token);
  if (hasUnsubscribeLink(body, token)) return body; // idempotente
  const sender = senderIdentityFrom(requireSenderFrom());
  // País E cidade: na Suíça o idioma é regional (Genebra = francês). Sem lead → inglês.
  const lang = lead ? langForLead(lead) : "English";
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
    if (!lead) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
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
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
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

    // PRÉ-CONDIÇÕES DE LINK, resolvidas ANTES da chamada de IA — de propósito.
    // As duas variáveis produzem texto que o PROSPECT lê: o link da prévia (corpo) e o de
    // opt-out (rodapé + header List-Unsubscribe). Checar aqui em cima resolve os dois lados
    // do problema: (1) não gasta tokens da Anthropic para descobrir no fim que o email não
    // pode sair, e (2) não deixa um rascunho pela metade — "gerar rascunho sem poder enviar"
    // é tão ruim quanto falhar tarde, porque o rascunho é o artefato que a usuária copia e
    // manda pelo email dela. CONVEX_SITE_URL só seria usada lá embaixo, no `upsertDraft`
    // (que também a exige, colado na escrita); antecipar aqui é o que evita o desperdício.
    const appUrl = requireAppUrl();
    requireUnsubscribeBaseUrl();
    requireSenderFrom();

    const token = await ctx.runMutation(internal.previews.ensureForLead, { leadId });
    // Mesma identidade do rodapé de opt-out (RESEND_FROM), agora também no CORPO: sem
    // isso a IA inventava quem assina. Sem display name no RESEND_FROM → undefined, e o
    // prompt emite o marcador `[seu nome]` em vez de um nome falso.
    const email = await writeEmail(key, lead, `${appUrl}/p/${token}`, {
      callerName: callerNameFrom(process.env.RESEND_FROM),
    });

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
  handler: async (
    ctx,
    { leadId },
  ): Promise<{ script: string; translation: string; warnings: OutreachWarning[] }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!lead.phone) throw userError("Lead sem telefone.");
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

    // Quem liga se apresenta com o nome do RESEND_FROM (mesma fonte de verdade da
    // identidade do email). Ausente/sem display name → o script sai com `[seu nome]`,
    // que a usuária troca antes de discar. NUNCA um nome inventado pelo modelo: ela lê
    // o script em voz alta num idioma que não fala e se apresentaria como outra pessoa.
    const result = await writeCallScript(key, lead, {
      callerName: callerNameFrom(process.env.RESEND_FROM),
    });
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
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
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
      if (suppressed) throw userError("Este contato pediu para não ser contatado (opt-out).");
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
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw userError("Nenhuma abordagem encontrada para este lead.");
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
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!canContactByEmail(lead)) {
      throw userError("Mercado opt-in: registre o consentimento do prospect antes de enviar email.");
    }
    const row = await emailRowForLead(ctx, leadId);
    if (!row) throw userError("Nenhum rascunho encontrado para este lead.");
    await ctx.db.patch(row._id, { subject, body });
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

/** Optional convenience: send via Resend (needs the lead's email + Resend config). */
export const send = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ sent: boolean }> => {
    const orgId = await requireOrgId(ctx);
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
