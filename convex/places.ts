import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isLaunchMarket, MARKETS, clampDiscoveryCount } from "./lib/domain";

interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  businessStatus?: string;
}

/**
 * Discover local businesses via Google Places Text Search (New). Uses the
 * Enterprise field mask INLINE (name/address/phone/website/rating/reviews in one
 * call) — ~10× cheaper than a Details-per-place path. Each discovered lead is
 * scheduled for Digital Presence scoring.
 *
 * Guarded to opt-out markets only (compliant by design).
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
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error("GOOGLE_PLACES_API_KEY não configurada no deployment Convex.");

    // Quantos leads buscar (1–50). O Text Search do Google Places devolve ≤20 por
    // página, então paginamos via nextPageToken até atingir o alvo.
    const want = clampDiscoveryCount(args.max);

    // Plan gating (reserve up front so we don't spend Places quota when over limit)
    await ctx.runMutation(internal.workspaces.reserve, {
      orgId,
      kind: "leads",
      count: want,
    });

    let places: PlaceResult[] = [];
    let inserted = 0;
    try {
      const collected: PlaceResult[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 3 && collected.length < want; page++) {
        const reqBody: Record<string, unknown> = {
          textQuery: `${args.category} in ${args.city}`,
          regionCode: country,
          maxResultCount: Math.min(20, want - collected.length),
          languageCode: "en",
        };
        if (pageToken) reqBody.pageToken = pageToken;

        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.nationalPhoneNumber",
              "places.websiteUri",
              "places.rating",
              "places.userRatingCount",
              "places.primaryType",
              "places.businessStatus",
              "nextPageToken",
            ].join(","),
          },
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Places API ${res.status}: ${body.slice(0, 240)}`);
        }

        const data = (await res.json()) as { places?: PlaceResult[]; nextPageToken?: string };
        collected.push(...(data.places ?? []));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }

      places = collected.slice(0, want);

      for (const p of places) {
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        const leadId = await ctx.runMutation(internal.leads.insertDiscovered, {
          orgId,
          source: "places",
          placeId: p.id,
          name: p.displayName?.text ?? "—",
          category: p.primaryType ?? args.category,
          address: p.formattedAddress,
          city: args.city,
          countryCode: country,
          phone: p.nationalPhoneNumber,
          website: p.websiteUri,
          rating: p.rating,
          reviewsCount: p.userRatingCount,
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

    return { found: places.length, inserted };
  },
});
