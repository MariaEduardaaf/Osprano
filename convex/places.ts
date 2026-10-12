import { action, internalMutation, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isSearchableMarket, MARKETS, clampDiscoveryCount, keepOnlyWithoutSite } from "./lib/domain";
import { userError } from "./lib/errors";
import { TEXT_SEARCH_FIELDS, fieldMask, toPlaceLite, type GooglePlaceLite } from "./lib/placesFields";
import { placesDerived, insertPlacesLead as insertPlacesLeadModel } from "./model/discovery";

interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

/**
 * Discover local businesses via Google Places Text Search (New). Uses the
 * Enterprise field mask INLINE (name/address/phone/website/rating/reviews in one
 * call) — ~10× cheaper than a Details-per-place path. Grava só place_id + derivados;
 * o conteúdo ao vivo volta na resposta (`shown`) para a tela mostrar na hora, sem
 * gravar; não agenda scoring (o score sai pronto da busca).
 *
 * Guarded to mercados pesquisáveis (launch opt-out + opt-in). A emailabilidade
 * é derivada em `placesDerived`: leads de mercados opt-in nascem emailable=false
 * (ligação primeiro).
 */
type SearchResult = {
  found: number;
  inserted: number;
  droppedWithSite: number;
  shown: Array<{ leadId: Id<"leads">; place: GooglePlaceLite }>;
};
type SearchArgs = { countryCode: string; category: string; city: string; max?: number };

/** Núcleo da busca, sem auth: usado pela action pública e pela operação via CLI (admin). */
export async function runPlacesSearch(
  ctx: ActionCtx,
  orgId: string,
  args: SearchArgs,
): Promise<SearchResult> {
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
    const shown: SearchResult["shown"] = [];
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
            "X-Goog-FieldMask": fieldMask(TEXT_SEARCH_FIELDS),
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
        const { leadId, created } = await ctx.runMutation(internal.places.insertPlacesLead, {
          orgId,
          placeId: p.id,
          category: args.category,
          city: args.city,
          countryCode: country,
          derived: placesDerived(
            {
              name: p.displayName?.text,
              website: p.websiteUri,
              phone: p.nationalPhoneNumber,
              rating: p.rating,
              reviewsCount: p.userRatingCount,
            },
            country,
          ),
        });
        // Lead que já existia não conta nem gasta cota (a reserva é devolvida pelo `want - inserted`).
        if (created) inserted += 1;
        shown.push({ leadId, place: toPlaceLite(p) });
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

    return { found: places.length, inserted, droppedWithSite, shown };
}

const signalsV = v.object({
  noSite: v.boolean(),
  socialOnly: v.boolean(),
  noHttps: v.boolean(),
  notMobile: v.boolean(),
  slow: v.boolean(),
  sparseProfile: v.boolean(),
});

export const insertPlacesLead = internalMutation({
  args: {
    orgId: v.string(),
    placeId: v.string(),
    category: v.string(),
    city: v.string(),
    countryCode: v.string(),
    derived: v.object({
      signals: signalsV,
      score: v.number(),
      tier: v.union(v.literal("hot"), v.literal("warm"), v.literal("cold")),
      legalForm: v.union(v.literal("incorporated"), v.literal("sole_trader"), v.literal("unknown")),
      contactType: v.union(v.literal("role"), v.literal("named"), v.literal("unknown")),
      emailable: v.boolean(),
    }),
  },
  handler: (ctx, args) => insertPlacesLeadModel(ctx, args),
});

export const search = action({
  args: {
    countryCode: v.string(),
    category: v.string(),
    city: v.string(),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResult> => {
    const orgId = await requireOrgId(ctx);
    return await runPlacesSearch(ctx, orgId, args);
  },
});
