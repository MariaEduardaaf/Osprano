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
  shouldRetryOverpass,
  overpassErrorMessage,
  type OsmElement,
  type OverpassScope,
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
/**
 * Instância principal e um espelho de PLANETA INTEIRO (z.overpass-api.de): a
 * principal responde 429/503/504 com frequência. Espelho regional (overpass.osm.ch
 * é só Suíça) responde 200 vazio para GB/ES e parece "nada encontrado".
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
];
const OVERPASS_RETRY_DELAY_MS = 2000;
/** A consulta pede [timeout:25]; acima disso o endpoint está travado, não lento. */
const OVERPASS_FETCH_TIMEOUT_MS = 30_000;
/** Cidade sem relation no OSM: raio em metros em volta do ponto do Nominatim. */
const AROUND_RADIUS_M = 8000;

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
}

type OverpassAttempt =
  | { ok: true; elements: OsmElement[] }
  | { ok: false; status: number; retryable: boolean };

/**
 * Uma tentativa num endpoint. Erro de rede ou estouro do timeout conta como
 * retentável (status 0): um espelho fora do ar não pode travar a busca.
 */
async function postOverpass(endpoint: string, query: string): Promise<OverpassAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_FETCH_TIMEOUT_MS);
  let status: number;
  let body: string;
  try {
    // O corpo também é lido dentro do timeout: o abort cobre o download, não só o cabeçalho.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    status = res.status;
    body = await res.text();
  } catch (err) {
    console.error(`Overpass ${endpoint} erro de rede:`, String(err).slice(0, 240));
    return { ok: false, status: 0, retryable: true };
  } finally {
    clearTimeout(timer);
  }
  if (status < 200 || status >= 300) {
    // Corpo da resposta só nos logs do Convex: nunca vaza pro cliente.
    console.error(`Overpass ${endpoint} ${status}:`, body.slice(0, 240));
    return { ok: false, status, retryable: shouldRetryOverpass(status) };
  }
  let data: { elements?: OsmElement[] };
  try {
    data = JSON.parse(body) as { elements?: OsmElement[] };
  } catch {
    console.error(`Overpass ${endpoint} 200 com corpo inválido:`, body.slice(0, 240));
    throw userError("Overpass devolveu uma resposta inválida");
  }
  return { ok: true, elements: Array.isArray(data.elements) ? data.elements : [] };
}

/**
 * Tenta a instância principal; se ela estiver ocupada (429/503/504) ou fora do
 * ar, espera 2 s e tenta UMA vez no espelho. Só depois disso vira erro pra usuária.
 */
async function fetchOverpass(query: string): Promise<OsmElement[]> {
  let status = 503; // erro de rede não tem código HTTP: reporta como "ocupado"
  for (const [i, endpoint] of OVERPASS_ENDPOINTS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, OVERPASS_RETRY_DELAY_MS));
    const attempt = await postOverpass(endpoint, query);
    if (attempt.ok) {
      // Espelho vazio logo depois da principal falhar: pode ser cobertura parcial do
      // espelho, não "nada na cidade". Fica no log, não é erro.
      if (i > 0 && attempt.elements.length === 0) {
        console.warn(`Overpass ${endpoint} respondeu 200 sem elementos após falha da principal`);
      }
      return attempt.elements;
    }
    if (attempt.status > 0) status = attempt.status;
    if (!attempt.retryable) break;
  }
  throw userError(overpassErrorMessage(status));
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
      const first = geo[0];
      if (!first) throw userError("Cidade não encontrada no OpenStreetMap");
      // Cidade com relation → área. Sem relation (Brighton é node/way no OSM) → raio
      // em volta do ponto que o Nominatim devolveu, em vez de falhar.
      const relation = geo.find((r) => r.osm_type === "relation" && typeof r.osm_id === "number");
      let scope: OverpassScope;
      if (relation?.osm_id) {
        scope = { areaId: 3600000000 + relation.osm_id };
      } else {
        const lat = Number(first.lat);
        const lon = Number(first.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw userError("Cidade não encontrada no OpenStreetMap");
        }
        scope = { lat, lon, radius: AROUND_RADIUS_M };
      }

      // 2) Overpass: pool fixo de 200, independente do `want`. O Overpass devolve os
      // elementos de id mais baixo (nós antigos, com poucas tags): com um pool pequeno
      // o ranking "sem site + com telefone" não tem de onde escolher.
      const query = buildOverpassQuery(scope, filters, OVERPASS_POOL);
      const elements = await fetchOverpass(query);
      const candidates = elements
        .map((el) => osmElementToLead(el, args.city))
        .filter((l): l is NonNullable<typeof l> => l !== null);
      // `found` é o TAMANHO DO POOL com nome (até OVERPASS_POOL), não quantos negócios
      // existem na cidade: para categoria grande vira ~200 sempre. A UI diz "até X no mapa".
      found = candidates.length;

      // 3) "Buscar mais": pula o que a org já tem, senão a mesma busca devolve os
      // mesmos leads (atualizados, não criados) enquanto o pool não muda.
      const existing = new Set<string>(
        await ctx.runQuery(internal.leads.existingPlaceIds, {
          orgId,
          placeIds: candidates.map((c) => c.placeId),
        }),
      );
      const fresh = candidates.filter((c) => !existing.has(c.placeId));

      const picked = rankForOutreach(fresh).slice(0, want);
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
          instagram: p.instagram,
          facebook: p.facebook,
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
