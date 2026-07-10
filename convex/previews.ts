import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { reserveUsage } from "./model/workspace";

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

/** Generate (or refresh) a tracked preview site for a lead. Authed. */
export const generate = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");

    const content = {
      name: lead.name,
      category: lead.category ?? null,
      city: lead.city ?? null,
      phone: lead.phone ?? null,
      rating: lead.rating ?? null,
      reviewsCount: lead.reviewsCount ?? null,
      countryCode: lead.countryCode,
    };

    const existing = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content });
      return existing.token;
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("previews", { orgId, leadId, token, content, openCount: 0 });
    return token;
  },
});

/** Ensure a preview exists for a lead (used by the outreach flow). Returns its token. */
export const ensureForLead = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const existing = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (existing) return existing.token;

    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error("Lead não encontrado");
    const content = {
      name: lead.name,
      category: lead.category ?? null,
      city: lead.city ?? null,
      phone: lead.phone ?? null,
      rating: lead.rating ?? null,
      reviewsCount: lead.reviewsCount ?? null,
      countryCode: lead.countryCode,
    };
    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("previews", { orgId: lead.orgId, leadId, token, content, openCount: 0 });
    return token;
  },
});

/** PUBLIC — the prospect opens this by token; no auth. Returns render content only. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const preview = await ctx.db
      .query("previews")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!preview) return null;
    return { content: preview.content, openCount: preview.openCount };
  },
});

/**
 * PUBLIC — records that the prospect opened the preview. This is the buying
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

/** Publish a preview as a white-label site with a stable slug. Charges 1 site of usage. */
export const publish = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.orgId !== orgId) throw new Error("Lead não encontrado");

    const content = {
      name: lead.name,
      category: lead.category ?? null,
      city: lead.city ?? null,
      phone: lead.phone ?? null,
      rating: lead.rating ?? null,
      reviewsCount: lead.reviewsCount ?? null,
      countryCode: lead.countryCode,
    };

    let preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", leadId))
      .first();
    if (!preview) {
      const token = crypto.randomUUID().replace(/-/g, "");
      const id = await ctx.db.insert("previews", { orgId, leadId, token, content, openCount: 0 });
      preview = await ctx.db.get(id);
    }
    if (!preview) throw new Error("Falha ao criar preview");
    if (preview.published && preview.slug) return preview.slug;

    await reserveUsage(ctx, orgId, "sites", 1);
    const slug = `${slugify(lead.name)}-${crypto.randomUUID().slice(0, 6)}`;
    await ctx.db.patch(preview._id, { published: true, slug, content });
    return slug;
  },
});

/** PUBLIC — render a published white-label site by slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("previews")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!p || !p.published) return null;
    return { content: p.content, token: p.token };
  },
});

/** All previews/sites for the workspace, newest first, with lead context. */
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
        return {
          _id: p._id,
          leadId: p.leadId,
          token: p.token,
          slug: p.slug ?? null,
          published: p.published ?? false,
          openCount: p.openCount,
          name: lead?.name ?? "—",
          city: lead?.city ?? null,
        };
      }),
    );
    return rows.sort((a, b) => b.openCount - a.openCount);
  },
});
