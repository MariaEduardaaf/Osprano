import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { isSearchableMarket, MARKETS, clampDiscoveryCount } from "./lib/domain";
import { userError } from "./lib/errors";
import {
  osmTagsForCategory,
  buildOverpassQuery,
  osmElementToLead,
  rankForOutreach,
  type OsmElement,
} from "./lib/osm";

/**
 * Descoberta via OpenStreetMap (Nominatim para geocodificar a cidade + Overpass
 * para listar os negócios). Fonte GRÁTIS e sem chave: é o caminho enquanto o
 * Google Places não tem billing. Mesmo funil depois (score, prévia, abordagem).
 *
 * Dados sob ODbL (© OpenStreetMap contributors): a UI exibe a atribuição. Não
 * há nota nem avaliações; "sem site" significa "sem tag website no mapa", e a
 * pontuação em segundo plano refina isso. Mesmo gate de mercados pesquisáveis
 * e mesma emailabilidade (insertDiscovered) do places.ts.
 */

const USER_AGENT = "Osprano/1.0 (+https://github.com/MariaEduardaaf/Osprano)";
const OVERPASS_POOL = 200;

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
}

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
    if (!isSearchableMarket(country)) {
      const name = MARKETS[country]?.name ?? country;
      throw userError(`${name} ainda não está disponível para busca.`);
    }
    const filters = osmTagsForCategory(args.category);
    if (filters.length === 0) throw userError("Categoria sem equivalente no OpenStreetMap");

    const want = clampDiscoveryCount(args.max);

    // Reserva antes de bater nas APIs, como no places.ts (cota do plano).
    await ctx.runMutation(internal.workspaces.reserve, {
      orgId,
      kind: "leads",
      count: want,
    });

    let found = 0;
    let inserted = 0;
    try {
      // 1) Cidade → área do Overpass (relation do Nominatim + 3600000000).
      const geoUrl = new URL("https://nominatim.openstreetmap.org/search");
      geoUrl.searchParams.set("city", args.city);
      geoUrl.searchParams.set("country", country);
      geoUrl.searchParams.set("format", "json");
      geoUrl.searchParams.set("limit", "1");
      const geoRes = await fetch(geoUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!geoRes.ok) {
        console.error(`Nominatim ${geoRes.status}:`, (await geoRes.text()).slice(0, 240));
        throw userError(`Nominatim respondeu ${geoRes.status}`);
      }
      const geo = (await geoRes.json()) as NominatimResult[];
      const relation = geo.find((r) => r.osm_type === "relation" && typeof r.osm_id === "number");
      if (!relation?.osm_id) throw userError("Cidade não encontrada no OpenStreetMap");
      const areaId = 3600000000 + relation.osm_id;

      // 2) Overpass: pool fixo de 200, independente do `want`. O Overpass devolve os
      // elementos de id mais baixo (nós antigos, com poucas tags): com um pool pequeno
      // o ranking "sem site + com telefone" não tem de onde escolher.
      const query = buildOverpassQuery(areaId, filters, OVERPASS_POOL);
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        // Corpo da resposta só nos logs do Convex: nunca vaza pro cliente.
        console.error(`Overpass ${res.status}:`, (await res.text()).slice(0, 240));
        throw userError(`Overpass respondeu ${res.status}`);
      }
      const data = (await res.json()) as { elements?: OsmElement[] };
      const candidates = (data.elements ?? [])
        .map((el) => osmElementToLead(el, args.city))
        .filter((l): l is NonNullable<typeof l> => l !== null);
      found = candidates.length;

      const picked = rankForOutreach(candidates).slice(0, want);
      for (const p of picked) {
        const { leadId, created } = await ctx.runMutation(internal.leads.insertDiscovered, {
          orgId,
          source: "osm",
          placeId: p.placeId,
          name: p.name,
          category: args.category,
          address: p.address,
          city: p.city,
          countryCode: country,
          phone: p.phone,
          website: p.website,
          email: p.email,
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

    return { found, inserted };
  },
});
