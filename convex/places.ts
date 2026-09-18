import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isSearchableMarket, MARKETS, clampDiscoveryCount, keepOnlyWithoutSite } from "./lib/domain";
import { userError } from "./lib/errors";

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
 * Guarded to mercados pesquisáveis (launch opt-out + opt-in). A emailabilidade
 * continua governada pelo isEmailable no insertDiscovered: leads de mercados
 * opt-in nascem emailable=false (ligação primeiro).
 */
type SearchArgs = { countryCode: string; category: string; city: string; max?: number };

/** Núcleo da busca, sem auth: usado pela action pública e pela operação via CLI (admin). */
export async function runPlacesSearch(
  ctx: ActionCtx,
  orgId: string,
  args: SearchArgs,
): Promise<{ found: number; inserted: number; droppedWithSite: number }> {
    const country = args.countryCode.toUpperCase();
    if (!isSearchableMarket(country)) {
      const name = MARKETS[country]?.name ?? country;
      throw userError(`${name} ainda não está disponível para busca.`);
    }
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw userError("GOOGLE_PLACES_API_KEY não configurada no deployment Convex.");

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
    let droppedWithSite = 0;
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
          // Corpo da resposta só nos logs do Convex: nunca vaza pro cliente.
          console.error(`Places API ${res.status}:`, (await res.text()).slice(0, 240));
          throw userError(`Places API respondeu ${res.status}`);
        }

        const data = (await res.json()) as { places?: PlaceResult[]; nextPageToken?: string };
        collected.push(...(data.places ?? []));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }

      places = collected.slice(0, want);

      // Cada resultado já custou a chamada da API (a cota do Places é por REQUISIÇÃO,
      // não por resultado): descartar quem tem site de verdade não economiza a busca,
      // só evita gravar o lead. Rede social (websiteUri de Instagram/Facebook…) NÃO é
      // site de verdade: continua. Refund automático no final, pelo `want - inserted`.
      const { kept, droppedWithSite: dropped } = keepOnlyWithoutSite(
        places.map((p) => ({ place: p, website: p.websiteUri })),
      );
      droppedWithSite = dropped;

      for (const { place: p } of kept) {
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        const { leadId, created } = await ctx.runMutation(internal.leads.insertDiscovered, {
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
        // Lead que já existia só foi atualizado: não conta nem gasta cota (a reserva é
        // devolvida pelo `want - inserted`), mas repontua do mesmo jeito.
        if (created) inserted += 1;
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

    return { found: places.length, inserted, droppedWithSite };
}

export const search = action({
  args: {
    countryCode: v.string(),
    category: v.string(),
    city: v.string(),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ found: number; inserted: number; droppedWithSite: number }> => {
    const orgId = await requireOrgId(ctx);
    return await runPlacesSearch(ctx, orgId, args);
  },
});
