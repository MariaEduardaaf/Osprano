import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isLaunchMarket, MARKETS, clampDiscoveryCount } from "./lib/domain";

interface FsqPlace {
  fsq_id?: string;
  fsq_place_id?: string;
  name?: string;
  tel?: string;
  website?: string;
  email?: string;
  location?: { formatted_address?: string; locality?: string };
  categories?: { name?: string }[];
}

/**
 * Discovery via Foursquare Places (secondary source / fallback to Google Places).
 * No ratings — those come from the Google enrichment layer. Same opt-out guard.
 *
 * NOTE: verify the endpoint/auth against Foursquare's current API before scaling
 * (FSQ migrated APIs in 2025); the storable/resellable path is the FSQ OS open
 * dataset, which is a separate ingestion job.
 */
export const search = action({
  args: {
    countryCode: v.string(),
    category: v.string(),
    city: v.string(),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ found: number; inserted: number }> => {
    const orgId = await requireOrgId(ctx);
    const country = args.countryCode.toUpperCase();
    if (!isLaunchMarket(country)) {
      const name = MARKETS[country]?.name ?? country;
      throw new Error(`${name} está fora do escopo compliant (cold email só em mercados opt-out).`);
    }
    const key = process.env.FSQ_API_KEY;
    if (!key) throw new Error("FSQ_API_KEY não configurada no deployment Convex.");

    const want = clampDiscoveryCount(args.max);

    await ctx.runMutation(internal.workspaces.reserve, {
      orgId,
      kind: "leads",
      count: want,
    });

    let found = 0;
    let inserted = 0;
    try {
      const params = new URLSearchParams({
        query: args.category,
        near: `${args.city}, ${country}`,
        limit: String(want),
        fields: "fsq_id,name,location,tel,website,email,categories",
      });
      const res = await fetch(`https://api.foursquare.com/v3/places/search?${params.toString()}`, {
        headers: { accept: "application/json", authorization: key },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Foursquare ${res.status}: ${body.slice(0, 240)}`);
      }

      const data = (await res.json()) as { results?: FsqPlace[] };
      const results = data.results ?? [];
      found = results.length;

      for (const p of results) {
        const placeId = p.fsq_id ?? p.fsq_place_id;
        if (!placeId || !p.name) continue;
        const leadId = await ctx.runMutation(internal.leads.insertDiscovered, {
          orgId,
          source: "fsq",
          placeId,
          name: p.name,
          category: p.categories?.[0]?.name ?? args.category,
          address: p.location?.formatted_address,
          city: p.location?.locality ?? args.city,
          countryCode: country,
          phone: p.tel,
          website: p.website,
          email: p.email,
        });
        inserted += 1;
        await ctx.scheduler.runAfter(0, internal.scoring.scoreLead, { leadId });
      }
    } catch (err) {
      const toRefund = want - inserted;
      if (toRefund > 0) {
        await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "leads", count: toRefund });
      }
      throw err;
    }

    const leftover = want - inserted;
    if (leftover > 0) {
      await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "leads", count: leftover });
    }

    return { found, inserted };
  },
});
