import { action, internalMutation, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isSearchableMarket, MARKETS, clampDiscoveryCount, keepOnlyWithoutSite } from "./lib/domain";
import { userError } from "./lib/errors";
import { COST_USD } from "./lib/budget";
import {
  DETAILS_BATCH_MAX,
  DETAILS_FIELDS_FULL,
  DETAILS_FIELDS_LIST,
  TEXT_SEARCH_FIELDS,
  fieldMask, toPlaceLite,
  type GooglePlaceLite,
} from "./lib/placesFields";
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

    const plannedPages = Math.ceil(want / 20);
    let pagesFetched = 0;
    let searchesReserved = false;
    // ponytail: página que falhou continua contando no teto diário e no orçamento (o Google pode cobrar); superestima de propósito.
    const refundUnusedPages = async () => {
      if (searchesReserved && plannedPages > pagesFetched) {
        await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "searches", count: plannedPages - pagesFetched });
      }
    };

    let places: PlaceResult[] = [];
    let inserted = 0;
    let droppedWithSite = 0;
    const shown: SearchResult["shown"] = [];
    try {
      await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "searches", count: plannedPages, usd: plannedPages * COST_USD.textSearch });
      searchesReserved = true;
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

        pagesFetched += 1;
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
      await refundUnusedPages();
      const toRefund = want - inserted;
      if (toRefund > 0) {
        await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "leads", count: toRefund });
      }
      throw err;
    }

    await refundUnusedPages();
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

function fetchPlaceDetails(key: string, placeId: string, fields: readonly string[]): Promise<Response> {
  return fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask(fields) },
  });
}

// Dado do Google ao vivo, só na resposta (useAction não é reativo nem cacheado). Nunca gravar,
// nunca devolver por query, nunca logar o corpo. Cada lugar consultado conta 1 na cota mensal
// `detailsPerMonth`.
export const details = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<{ gone: boolean; place: GooglePlaceLite | null }> => {
    const orgId = await requireOrgId(ctx);
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw userError("GOOGLE_PLACES_API_KEY não configurada no deployment Convex.");
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId || lead.source !== "places" || !lead.placeId) {
      throw userError("Lead não encontrado");
    }
    await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "details", count: 1, usd: COST_USD.detailsFull });

    let res: Response;
    try {
      res = await fetchPlaceDetails(key, lead.placeId, DETAILS_FIELDS_FULL);
    } catch (err) {
      await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "details", count: 1 });
      throw err;
    }
    if (res.status === 404) {
      await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "details", count: 1 });
      return { gone: true, place: null };
    }
    if (!res.ok) {
      console.error(`Places Details ${res.status}`);
      await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "details", count: 1 });
      throw userError(`Places API respondeu ${res.status}`);
    }
    return { gone: false, place: toPlaceLite(await res.json()) };
  },
});

export const detailsMany = action({
  args: { leadIds: v.array(v.id("leads")) },
  handler: async (
    ctx,
    { leadIds },
  ): Promise<{
    places: Array<{ leadId: Id<"leads">; place: GooglePlaceLite }>;
    gone: Id<"leads">[];
    failed: number;
  }> => {
    const orgId = await requireOrgId(ctx);
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw userError("GOOGLE_PLACES_API_KEY não configurada no deployment Convex.");

    const ids = [...new Set(leadIds)].slice(0, DETAILS_BATCH_MAX);
    const leads = await Promise.all(ids.map((leadId) => ctx.runQuery(internal.leads.getInternal, { leadId })));
    // Lead confirmado não precisa do Google.
    const eligible = leads.flatMap((l) =>
      l && l.orgId === orgId && l.source === "places" && l.placeId && !l.confirmation
        ? [{ leadId: l._id, placeId: l.placeId }]
        : [],
    );
    if (eligible.length === 0) return { places: [], gone: [], failed: 0 };

    await ctx.runMutation(internal.workspaces.reserve, { orgId, kind: "details", count: eligible.length, usd: eligible.length * COST_USD.detailsList });

    const places: Array<{ leadId: Id<"leads">; place: GooglePlaceLite }> = [];
    const gone: Id<"leads">[] = [];
    let failed = 0;
    await Promise.all(
      eligible.map(async ({ leadId, placeId }) => {
        try {
          const res = await fetchPlaceDetails(key, placeId, DETAILS_FIELDS_LIST);
          if (res.status === 404) gone.push(leadId);
          else if (!res.ok) {
            console.error(`Places Details ${res.status}`);
            failed += 1;
          } else places.push({ leadId, place: toPlaceLite(await res.json()) });
        } catch {
          failed += 1;
        }
      }),
    );

    const toRefund = gone.length + failed;
    if (toRefund > 0) {
      await ctx.runMutation(internal.workspaces.refund, { orgId, kind: "details", count: toRefund });
    }
    return { places, gone, failed };
  },
});
