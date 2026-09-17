/**
 * OpenStreetMap como fonte de descoberta: lógica pura (sem imports do Convex),
 * testada em tests/osm.test.ts e consumida por convex/osm.ts.
 *
 * Os dados são ODbL (© OpenStreetMap contributors): a UI precisa exibir a
 * atribuição. O OSM não tem nota nem contagem de avaliações, e "sem site" aqui
 * quer dizer "ninguém cadastrou a tag website no mapa", não "o negócio não tem
 * site" (a pontuação depois confere).
 */

/** Um filtro de tag do Overpass: todas as chaves precisam casar (AND). */
export type OsmTagFilter = Record<string, string>;

/**
 * Categoria do select (valor de CATEGORY_OPTIONS) → filtros OSM. Mais de um filtro
 * = OR na consulta. Categoria fora do mapa → [] (a action recusa com userError).
 */
const OSM_TAGS_BY_CATEGORY: Record<string, OsmTagFilter[]> = {
  restaurant: [{ amenity: "restaurant" }],
  cafe: [{ amenity: "cafe" }],
  bar: [{ amenity: "bar" }],
  pub: [{ amenity: "pub" }],
  "pizza restaurant": [{ amenity: "restaurant", cuisine: "pizza" }],
  bakery: [{ shop: "bakery" }],
  "pastry shop": [{ shop: "pastry" }],
  "ice cream shop": [{ amenity: "ice_cream" }],
  "barber shop": [{ shop: "hairdresser" }],
  "hair salon": [{ shop: "hairdresser" }],
  "beauty salon": [{ shop: "beauty" }],
  "nail salon": [{ shop: "beauty", beauty: "nails" }],
  spa: [{ shop: "massage" }, { leisure: "spa" }],
  "tattoo studio": [{ shop: "tattoo" }],
  gym: [{ leisure: "fitness_centre" }],
  "personal trainer": [{ leisure: "fitness_centre" }],
  "yoga studio": [{ leisure: "fitness_centre", sport: "yoga" }],
  dentist: [{ amenity: "dentist" }],
  doctor: [{ amenity: "doctors" }, { amenity: "clinic" }],
  physiotherapist: [{ healthcare: "physiotherapist" }],
  veterinarian: [{ amenity: "veterinary" }],
  pharmacy: [{ amenity: "pharmacy" }],
  optician: [{ shop: "optician" }],
  "pet store": [{ shop: "pet" }],
  florist: [{ shop: "florist" }],
  hotel: [{ tourism: "hotel" }],
  "bed and breakfast": [{ tourism: "guest_house" }],
  "real estate agency": [{ office: "estate_agent" }],
  lawyer: [{ office: "lawyer" }],
  accountant: [{ office: "accountant" }],
  "car repair": [{ shop: "car_repair" }],
  "car wash": [{ amenity: "car_wash" }],
  "driving school": [{ amenity: "driving_school" }],
  plumber: [{ craft: "plumber" }],
  electrician: [{ craft: "electrician" }],
  locksmith: [{ shop: "locksmith" }, { craft: "locksmith" }],
  photographer: [{ craft: "photographer" }, { shop: "photo" }],
  "jewelry store": [{ shop: "jewelry" }],
  "clothing store": [{ shop: "clothes" }],
  "furniture store": [{ shop: "furniture" }],
  laundry: [{ shop: "laundry" }, { shop: "dry_cleaning" }],
  "language school": [{ amenity: "language_school" }],
};

export function osmTagsForCategory(value: string): OsmTagFilter[] {
  return OSM_TAGS_BY_CATEGORY[value.trim().toLowerCase()] ?? [];
}

/** Escapa aspas e barra invertida num literal de string do Overpass QL. */
function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Consulta Overpass QL: um `nwr[...]` por filtro (union = OR), restrito à área
 * (relation do Nominatim + 3600000000). `out center` dá um ponto para ways/relations.
 */
export function buildOverpassQuery(areaId: number, filters: OsmTagFilter[], limit: number): string {
  const clauses = filters
    .map((f) => {
      const tags = Object.entries(f)
        .map(([k, v]) => `[${quote(k)}=${quote(v)}]`)
        .join("");
      return `nwr${tags}(area.a);`;
    })
    .join("");
  return `[out:json][timeout:25];area(${areaId})->.a;(${clauses});out center tags ${limit};`;
}

/** Elemento como vem do Overpass (`out center tags`). */
export interface OsmElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
}

export interface OsmLead {
  placeId: string;
  name: string;
  address?: string;
  city: string;
  phone?: string;
  website?: string;
  email?: string;
}

function clean(value?: string): string | undefined {
  const s = value?.trim();
  return s ? s : undefined;
}

/**
 * Elemento OSM → candidato a lead. Sem `name` não vira lead (null). Aceita as
 * variantes `contact:*` das tags de contato. Cidade: `addr:city` ou a cidade buscada.
 */
export function osmElementToLead(el: OsmElement, fallbackCity: string): OsmLead | null {
  const tags = el.tags ?? {};
  const name = clean(tags.name);
  if (!name) return null;

  const street = clean(tags["addr:street"]);
  const number = clean(tags["addr:housenumber"]);
  const postcode = clean(tags["addr:postcode"]);
  const addrCity = clean(tags["addr:city"]);
  const line1 = [street, number].filter(Boolean).join(" ");
  const line2 = [postcode, addrCity].filter(Boolean).join(" ");
  const address = [line1, line2].filter(Boolean).join(", ");

  return {
    placeId: `osm:${el.type}/${el.id}`,
    name,
    address: address || undefined,
    city: addrCity ?? fallbackCity,
    phone: clean(tags.phone) ?? clean(tags["contact:phone"]),
    website: clean(tags.website) ?? clean(tags["contact:website"]),
    email: clean(tags.email) ?? clean(tags["contact:email"]),
  };
}

/**
 * Ordena para a abordagem: sem site primeiro (é o lead que o produto quer),
 * e dentro de cada grupo quem tem telefone antes. Estável: empates mantêm a
 * ordem do Overpass.
 */
export function rankForOutreach<T extends { website?: string; phone?: string }>(leads: T[]): T[] {
  const rank = (l: T) => (l.website ? 2 : 0) + (l.phone ? 0 : 1);
  return [...leads].sort((a, b) => rank(a) - rank(b));
}

/**
 * Política de retentativa do Overpass: os espelhos públicos respondem 429 (limite
 * por IP), 503 e 504 (instância ocupada) mesmo com a consulta correta. Nesses
 * casos vale tentar UMA vez num segundo espelho; qualquer outro status é erro real.
 */
export function shouldRetryOverpass(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

/** Mensagem para a usuária: "ocupado" (retentável) vs. erro de verdade. */
export function overpassErrorMessage(status: number): string {
  if (shouldRetryOverpass(status)) {
    return `Overpass ocupado agora (HTTP ${status}); tente de novo em alguns segundos.`;
  }
  return `Overpass respondeu ${status}`;
}
