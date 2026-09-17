import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { defaultContentForLead, parseSiteContent, type SiteContent } from "../lib/site.ts";

/**
 * Devolve a linha de preview do lead, criando-a com token novo e
 * `content = defaultContentForLead(lead)` quando não existe. NUNCA sobrescreve
 * `content` existente: o conteúdo salvo é a única fonte de verdade (spec 2.3).
 * `generate`, `ensureForLead` e `publish` passam por aqui (e `saveContent`, no
 * plano B).
 */
export async function ensurePreview(ctx: MutationCtx, lead: Doc<"leads">): Promise<Doc<"previews">> {
  const existing = await ctx.db
    .query("previews")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .first();
  if (existing) return existing;

  const token = crypto.randomUUID().replace(/-/g, "");
  const id = await ctx.db.insert("previews", {
    orgId: lead.orgId,
    leadId: lead._id,
    token,
    content: defaultContentForLead(lead),
    openCount: 0,
  });
  const created = await ctx.db.get(id);
  // Invariante (get logo após insert): Error comum de propósito, não é mensagem pra usuária.
  if (!created) throw new Error("Falha ao criar preview");
  return created;
}

/**
 * `content` parseado (formato antigo convertido; corrompido vira o mínimo). No
 * mínimo o nome sai vazio: aqui entra o nome, a cidade e o país do lead, que a
 * query tem à mão (spec 2.1, "substituído pelo nome do lead quando o chamador o tem").
 */
export async function readContent(ctx: QueryCtx | MutationCtx, preview: Doc<"previews">): Promise<SiteContent> {
  const content = parseSiteContent(preview.content);
  if (content.name) return content;
  const lead = await ctx.db.get(preview.leadId);
  if (!lead) return content;
  return { ...content, name: lead.name, city: lead.city ?? null, countryCode: lead.countryCode };
}

/** URLs do storage para as imagens enviadas (spec 2.3). Id sem arquivo (apagado) some da lista. */
export async function resolveImages(
  ctx: QueryCtx | MutationCtx,
  content: SiteContent,
): Promise<{ heroUrl?: string; galleryUrls: string[] }> {
  const heroUrl = content.heroImage ? ((await ctx.storage.getUrl(content.heroImage)) ?? undefined) : undefined;
  const urls = await Promise.all((content.gallery ?? []).map((id) => ctx.storage.getUrl(id)));
  return { heroUrl, galleryUrls: urls.filter((u): u is string => typeof u === "string") };
}
