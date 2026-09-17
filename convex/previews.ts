import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { reserveUsage } from "./model/workspace";
import { ensurePreview, readContent, resolveImages } from "./model/previews";
import { parseSiteContent } from "./lib/site";
import { userError } from "./lib/errors";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

/**
 * O preview (se houver) de um lead, para a aba Site do CRM e para o editor. Authed.
 * `content` já parseado (spec 2.1) e `images` com as URLs do storage resolvidas;
 * quem monta o SiteView (foto padrão onde não há upload) é a página. Não devolve
 * `lastOpenedAt`: sem uso em src/ (spec 2.3).
 */
export const getForLead = query({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!preview || preview.orgId !== orgId) return null;
    const content = await readContent(ctx, preview);
    return {
      token: preview.token,
      content,
      published: preview.published ?? false,
      slug: preview.slug ?? null,
      openCount: preview.openCount,
      images: await resolveImages(ctx, content),
    };
  },
});

/**
 * Garante o preview rastreado de um lead e devolve o token. Authed. Já existindo,
 * NÃO toca no conteúdo (antes regravava a partir do lead; agora o conteúdo salvo
 * é a fonte de verdade e o lead só o alimenta na criação).
 */
export const generate = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    return (await ensurePreview(ctx, lead)).token;
  },
});

/** Ensure a preview exists for a lead (used by the outreach flow). Returns its token. */
export const ensureForLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead) throw userError("Lead não encontrado");
    return (await ensurePreview(ctx, lead)).token;
  },
});

/** PUBLIC, sem auth: o prospect abre pelo token. Devolve só o que a página renderiza. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return null;
    const content = await readContent(ctx, preview);
    return { content, openCount: preview.openCount, images: await resolveImages(ctx, content) };
  },
});

/**
 * PUBLIC: records that the prospect opened the preview. This is the buying
 * signal: it advances the lead to "opened" so the reseller sees it live.
 */
export const recordOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return;

    // TRCK-01: o dono do workspace abrindo o próprio preview (logado no app, no
    // mesmo browser) NÃO pode contar como sinal de prospect. Um prospect real
    // nunca tem sessão Clerk, então identity é null para ele. Limitação aceita e
    // documentada: uma aba anônima/privada do próprio dono conta como prospect
    // (igual a qualquer ferramenta de tracking). Modo demo não tem ClerkProvider
    // → getUserIdentity() sempre null → aberturas de demo seguem contando (desejado).
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject === preview.orgId) return;

    const now = Date.now();
    await ctx.db.patch(preview._id, {
      openCount: preview.openCount + 1,
      lastOpenedAt: now,
    });
    await ctx.db.insert("events", {
      orgId: preview.orgId,
      type: "preview_open",
      leadId: preview.leadId,
      previewToken: token,
      at: now,
    });

    const lead = await ctx.db.get(preview.leadId);
    if (lead && lead.stage === "base") {
      await ctx.db.patch(lead._id, { stage: "approached", stageUpdatedAt: now });
    }
  },
});

/**
 * Publica o preview como site white-label com slug estável. Cobra 1 site de uso.
 * Publica o `content` SALVO (parseado; um preview antigo é regravado já em v2),
 * nunca uma cópia nova do lead. Já publicado: idempotente, devolve o slug.
 */
export const publish = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");

    const preview = await ensurePreview(ctx, lead);
    if (preview.published && preview.slug) return preview.slug;

    await reserveUsage(ctx, orgId, "sites", 1);
    const content = await readContent(ctx, preview);
    // O slug sai do nome do SITE (o que ela salvou), não do nome cru do lead.
    const slug = `${slugify(content.name)}-${crypto.randomUUID().slice(0, 6)}`;
    await ctx.db.patch(preview._id, { published: true, slug, content });
    return slug;
  },
});

/** PUBLIC: render a published white-label site by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("previews")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!p || !p.published) return null;
    const content = await readContent(ctx, p);
    return { content, token: p.token, images: await resolveImages(ctx, content) };
  },
});

/**
 * All previews/sites for the workspace, newest first, with lead context.
 * `template`/`palette` saem de `parseSiteContent(content)`: não há coluna nova
 * (spec 2.2) e não se resolve storage aqui (a miniatura usa só os defaults).
 */
export const listSites = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const previews = await ctx.db
      .query("previews")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const rows = await Promise.all(
      previews.map(async (p) => {
        const lead = await ctx.db.get(p.leadId);
        const content = parseSiteContent(p.content);
        return {
          _id: p._id,
          leadId: p.leadId,
          token: p.token,
          slug: p.slug ?? null,
          published: p.published ?? false,
          openCount: p.openCount,
          template: content.template,
          palette: content.palette,
          // U+2014 escapado: o mesmo travessão de antes (a página Sites o mostra quando o lead sumiu).
          name: lead?.name ?? "—",
          city: lead?.city ?? null,
          category: lead?.category ?? null,
          score: lead?.score ?? null,
          tier: (lead?.tier ?? "cold") as "hot" | "warm" | "cold",
        };
      }),
    );
    return rows.sort((a, b) => b.openCount - a.openCount);
  },
});
