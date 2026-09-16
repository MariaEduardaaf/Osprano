/**
 * Shared, pure domain logic — no Convex/server imports, safe to use from the
 * frontend too (via the `@convex/*` path alias).
 */

// ---------------------------------------------------------------------------
// Markets & compliance (email-first, "compliant by design")
// ---------------------------------------------------------------------------

export type ColdEmail = "opt_out" | "conditional" | "opt_in";

export interface Market {
  code: string; // ISO alpha-2
  name: string;
  flag: string;
  coldEmail: ColdEmail;
  legalReview?: "pending" | "validated"; // undefined = não aplicável (mercados launch opt-out)
}

/** V1 launch markets: opt-out or conditional cold B2B email. */
export const MARKETS: Record<string, Market> = {
  GB: { code: "GB", name: "Reino Unido", flag: "🇬🇧", coldEmail: "opt_out" },
  NL: { code: "NL", name: "Holanda", flag: "🇳🇱", coldEmail: "opt_out" },
  IE: { code: "IE", name: "Irlanda", flag: "🇮🇪", coldEmail: "opt_out" },
  SE: { code: "SE", name: "Suécia", flag: "🇸🇪", coldEmail: "opt_out" },
  NO: { code: "NO", name: "Noruega", flag: "🇳🇴", coldEmail: "conditional" },
  // Cold email é ilegal (opt-in): pesquisáveis, mas só contatáveis por ligação primeiro.
  DE: { code: "DE", name: "Alemanha", flag: "🇩🇪", coldEmail: "opt_in", legalReview: "pending" },
  CH: { code: "CH", name: "Suíça", flag: "🇨🇭", coldEmail: "opt_in", legalReview: "pending" },
  DK: { code: "DK", name: "Dinamarca", flag: "🇩🇰", coldEmail: "opt_in", legalReview: "pending" },
  IT: { code: "IT", name: "Itália", flag: "🇮🇹", coldEmail: "opt_in", legalReview: "pending" },
  ES: { code: "ES", name: "Espanha", flag: "🇪🇸", coldEmail: "opt_in", legalReview: "pending" },
  PT: { code: "PT", name: "Portugal", flag: "🇵🇹", coldEmail: "opt_in", legalReview: "pending" },
};

/** Markets the V1 cold-email motion is allowed to target. */
export const LAUNCH_MARKETS = ["GB", "NL", "IE", "SE", "NO"];

/** OPTIN-01: mercados opt-in — descoberta liberada, cold email nunca (ligação primeiro). */
export const OPT_IN_MARKETS = ["ES", "IT", "PT", "DE", "DK", "CH"];

/** Mercados em que a descoberta é permitida (launch + opt-in). */
export const SEARCHABLE_MARKETS = [...LAUNCH_MARKETS, ...OPT_IN_MARKETS];

export function isLaunchMarket(countryCode: string): boolean {
  return LAUNCH_MARKETS.includes(countryCode.toUpperCase());
}

/** OPTIN-01: "posso buscar aqui?" — mais amplo que isLaunchMarket ("posso enviar cold email?"). */
export function isSearchableMarket(countryCode: string): boolean {
  return SEARCHABLE_MARKETS.includes(countryCode.toUpperCase());
}

// ---------------------------------------------------------------------------
// Suíça: regiões linguísticas (o país é o único mercado multilíngue da base)
// ---------------------------------------------------------------------------

/** Idiomas oficiais que o produto atende na Suíça (romanche fica fora: <0,5%). */
export type SwissLang = "de" | "fr" | "it";

/**
 * Fallback quando a cidade é desconhecida/ausente: alemão, o idioma de ~62% da
 * população. É uma escolha DELIBERADA e testada — nunca um acidente.
 */
export const SWISS_DEFAULT_LANGUAGE: SwissLang = "de";

/**
 * DE ONDE VEM O CAMPO `city` DE UM LEAD (verificado no código, não suposto —
 * o comentário que ficava aqui afirmava o contrário e estava factualmente errado):
 *
 *   1. Google Places (convex/places.ts) grava `city: args.city`, isto é, a cidade
 *      que a usuária escolheu no SELECT — forma LOCAL, vinda de CITIES_BY_COUNTRY.CH.
 *      O `languageCode: "en"` do request afeta só `displayName`/`formattedAddress`,
 *      e o field mask nem pede `addressComponents`: o Places NUNCA é a origem do
 *      nome da cidade. Ou seja, por esta porta chega "Genève", não "Geneva".
 *   2. Foursquare (convex/foursquare.ts) grava `p.location?.locality ?? args.city`.
 *      É a ÚNICA origem em que a cidade vem de um provedor externo — e o risco real
 *      aqui não é exônimo inglês: é a `locality` ser um SUBÚRBIO/COMUNA da
 *      aglomeração (Carouge, Paradiso, Riehen…), que sem mapa cai calado no
 *      fallback alemão e manda francês/italiano em alemão.
 *   3. Criação manual (convex/leads.ts `create`) aceita texto livre: daí vêm
 *      exônimos de qualquer idioma ("Genf", "Zurigo", "Bâle") e sufixos
 *      (", Switzerland", " NE").
 *
 * Consequência para as listas abaixo: os alias de exônimo (en/de/fr/it) são
 * COBERTURA DEFENSIVA para (3) e para colagens manuais — não são a origem
 * principal. A cobertura que paga a conta no dia a dia é a de subúrbios, por (2).
 */

/** Sufixos de país que aparecem colados na cidade em dados reais/colados à mão. */
const SWISS_COUNTRY_SUFFIXES = new Set(["switzerland", "suisse", "schweiz", "svizzera", "ch"]);

/** Códigos dos 26 cantões — sufixo canônico em endereços suíços ("Neuchâtel NE"). */
const SWISS_CANTON_CODES = new Set([
  "ag", "ai", "ar", "be", "bl", "bs", "fr", "ge", "gl", "gr", "ju", "lu", "ne",
  "nw", "ow", "sg", "sh", "so", "sz", "tg", "ti", "ur", "vd", "vs", "zg", "zh",
]);

/**
 * Chave canônica de cidade: minúsculas, sem acento, separadores virando espaço e
 * sufixos de país/cantão descartados. Isso faz casar de uma só vez:
 *   - forma local vs sem acento         ("Genève" / "Geneve")
 *   - caixa qualquer                    ("GENEVE" / "geneve")
 *   - abreviação com ou sem ponto       ("St. Gallen" / "St Gallen")
 *   - nomes compostos                   ("Yverdon-les-Bains", "Biel/Bienne")
 *   - sufixo de país                    ("Geneve, Switzerland" / "Genf, Schweiz")
 *   - sufixo cantonal                   ("Neuchâtel NE" / "Lugano TI")
 * O que NÃO dá para derivar por regra — exônimos que mudam a grafia (Genf,
 * Zurigo, Bâle, Basle) — entra como alias explícito nas listas abaixo.
 *
 * O descarte de sufixo só roda enquanto sobrar pelo menos um token, então uma
 * entrada que seja SÓ o cantão ("GE") continua desconhecida em vez de virar "".
 * Nenhum nome das listas termina em token de 2 letras, e as chaves do mapa são
 * construídas por esta mesma função — o corte é simétrico e não quebra
 * "St. Gallen" nem "Biel/Bienne".
 */
function normalizeCityKey(city: string): string {
  const tokens = city
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,/\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1] ?? "";
    if (SWISS_COUNTRY_SUFFIXES.has(last) || SWISS_CANTON_CODES.has(last)) tokens.pop();
    else break;
  }
  return tokens.join(" ");
}

/**
 * Romandia (francófona): cidades do select, comunas das aglomerações de Genebra,
 * Lausanne e Neuchâtel (o que o Foursquare devolve em `locality`) e exônimos.
 *
 * Fribourg/Freiburg é oficialmente BILÍNGUE: classificada como francesa porque
 * ~63% da população fala francês. É uma aproximação deliberada — a cidade tem
 * minoria germanófona relevante, e aqui se escolhe a maioria em vez de deixar
 * o prospect sem idioma definido.
 */
const SWISS_FRENCH_CITIES = [
  "Genève", "Geneva",
  "Lausanne",
  "Neuchâtel", "Neuchatel",
  // Bilíngue oficial → francês pela maioria (~63%). "Freiburg" é a forma ALEMÃ da
  // mesma cidade suíça: sem o alias ela cairia no fallback e sairia em alemão.
  // Só é consultada quando o país é CH, então não colide com Freiburg im Breisgau (DE).
  "Fribourg", "Freiburg",
  "Sion",
  "Montreux",
  "Vevey",
  "Yverdon-les-Bains",
  "La Chaux-de-Fonds",
  "Le Locle",
  "Delémont",
  "Porrentruy",
  "Nyon",
  "Morges",
  "Bulle",
  "Martigny",
  "Monthey",
  "Sierre",
  "Aigle",
  "Gland",
  "Renens",
  "Ecublens",
  "Prilly",
  "Pully",
  // --- Aglomeração de GENEBRA (cantão GE, 100% francófono) ---
  "Carouge",
  "Vernier",
  "Lancy",
  "Meyrin",
  "Onex",
  "Versoix",
  "Thônex",
  "Chêne-Bougeries",
  "Chêne-Bourg",
  "Plan-les-Ouates",
  "Grand-Saconnex", "Le Grand-Saconnex", // a comuna é "Le Grand-Saconnex"; sem artigo também aparece
  "Bernex",
  "Confignon",
  "Collonge-Bellerive",
  "Cologny",
  "Veyrier",
  "Troinex",
  "Perly", "Perly-Certoux", // nome oficial da comuna é "Perly-Certoux"
  "Satigny",
  "Genthod",
  "Bellevue",
  "Prégny-Chambésy",
  // --- Aglomeração de LAUSANNE (cantão VD, francófono) ---
  "Epalinges",
  "Chavannes-près-Renens",
  "Crissier",
  "Bussigny",
  "Lutry",
  "Paudex",
  "Belmont-sur-Lausanne",
  "Le Mont-sur-Lausanne",
  "Cheseaux", "Cheseaux-sur-Lausanne",
  // --- Aglomeração de NEUCHÂTEL (cantão NE, francófono) ---
  "Peseux",
  "Corcelles", "Corcelles-Cormondrèche",
  "Colombier",
  "Boudry",
  "Saint-Blaise",
  // --- Exônimos: cidade francófona com nome em outro idioma (criação manual) ---
  "Genf",       // alemão para Genève
  "Ginevra",    // italiano para Genève
  "Losanna",    // italiano para Lausanne
  "Neuenburg",  // alemão para Neuchâtel (existe Neuenburg am Rhein na Alemanha,
                // mas este mapa só é consultado quando countryCode === "CH")
  "Neucastello", // forma italiana arcaica de Neuchâtel
  "Sitten",     // alemão para Sion
];

/**
 * Ticino + Grigioni italiano: cidades, comuni/quartieri das aglomerações de
 * Lugano e Locarno (o que chega como `locality` do Foursquare). Os nomes são
 * idênticos em qualquer idioma — aqui não há exônimo a cobrir.
 */
const SWISS_ITALIAN_CITIES = [
  "Lugano",
  "Bellinzona",
  "Locarno",
  "Chiasso",
  "Mendrisio",
  "Ascona",
  "Biasca",
  "Losone",
  "Minusio",
  "Massagno",
  "Giubiasco",
  "Poschiavo",
  "Mesocco",
  // --- Aglomeração de LUGANO ---
  "Paradiso",
  "Viganello",
  "Pregassona",
  "Breganzona",
  "Savosa",
  "Sorengo",
  "Cadempino",
  "Vezia",
  "Canobbio",
  "Agno",
  "Caslano",
  // --- Aglomeração de LOCARNO / Bellinzonese ---
  "Muralto",
  "Tenero", "Tenero-Contra",
  "Gordola",
  "Cadenazzo",
  "Gambarogno",
];

/**
 * Suíça alemã — o resto do país, e também o destino do fallback. Inclui os
 * bairros/comunas das aglomerações de Zurique, Basileia e Berna, que também
 * podem chegar como `locality`, e os exônimos francês/italiano.
 *
 * Biel/Bienne é a segunda cidade oficialmente BILÍNGUE: classificada como alemã
 * porque ~55% da população fala alemão. Mesma aproximação deliberada de
 * Fribourg, só que caindo para o outro lado. "Biel" e "Bienne" isolados entram
 * como alias porque a fonte pode devolver só uma das metades do nome.
 */
const SWISS_GERMAN_CITIES = [
  "Zürich", "Zurich",
  "Basel", "Basle",
  "Bern", "Berne",
  "Winterthur",
  "Luzern", "Lucerne",
  "St. Gallen", "Sankt Gallen", "St Gallen", "Saint Gallen",
  "Thun",
  "Biel/Bienne", "Biel", "Bienne", // bilíngue oficial → alemão pela maioria (~55%)
  "Chur",
  "Zug",
  "Schaffhausen",
  "Aarau",
  "Baden",
  "Olten",
  "Solothurn",
  "Frauenfeld",
  "Wil",
  "Rapperswil-Jona",
  "Uster",
  "Dübendorf",
  "Emmen",
  "Kriens",
  "Köniz",
  "Wetzikon",
  "Schlieren",
  "Kloten",
  "Bülach",
  "Herisau",
  "Davos",
  "Interlaken",
  // --- Bairros de Zurique e comunas da aglomeração (cantão ZH) ---
  "Oerlikon",
  "Altstetten",
  "Wiedikon",
  "Opfikon",
  "Wallisellen",
  "Adliswil",
  "Horgen",
  "Meilen",
  "Küsnacht",
  "Thalwil",
  // --- Aglomeração de BASILEIA (BS/BL) ---
  "Riehen",
  "Allschwil",
  "Muttenz",
  "Pratteln",
  "Binningen",
  // --- Aglomeração de BERNA (parte germanófona do cantão BE) ---
  "Ostermundigen",
  "Wabern",
  "Liebefeld",
  "Ittigen",
  // --- Exônimos: cidade germanófona com nome em francês ou italiano ---
  "Bâle",        // fr → Basel
  "Coire",       // fr → Chur
  "Saint-Gall",  // fr → St. Gallen
  "Schaffhouse", // fr → Schaffhausen
  "Berna",       // it → Bern
  "Basilea",     // it → Basel
  "Lucerna",     // it → Luzern
  "Zurigo",      // it → Zürich
  "Coira",       // it → Chur
  "Sciaffusa",   // it → Schaffhausen
  "Bienna",      // it → Biel/Bienne (alemão pela maioria, ver acima)
  "San Gallo",   // it → St. Gallen
];

/** Cidade normalizada → idioma. Exportado para as invariantes de teste. */
export const SWISS_CITY_LANGUAGE: ReadonlyMap<string, SwissLang> = new Map<string, SwissLang>([
  ...SWISS_FRENCH_CITIES.map((c) => [normalizeCityKey(c), "fr"] as [string, SwissLang]),
  ...SWISS_ITALIAN_CITIES.map((c) => [normalizeCityKey(c), "it"] as [string, SwissLang]),
  ...SWISS_GERMAN_CITIES.map((c) => [normalizeCityKey(c), "de"] as [string, SwissLang]),
]);

/** A cidade está no mapa (vs. cair no fallback silencioso)? */
export function isKnownSwissCity(city?: string | null): boolean {
  if (!city) return false;
  return SWISS_CITY_LANGUAGE.has(normalizeCityKey(city));
}

/**
 * Idioma do prospect suíço a partir da cidade. Puro e total: qualquer entrada
 * não reconhecida (desconhecida, vazia, undefined, null) devolve alemão.
 */
export function swissLanguage(city?: string | null): SwissLang {
  if (!city) return SWISS_DEFAULT_LANGUAGE;
  return SWISS_CITY_LANGUAGE.get(normalizeCityKey(city)) ?? SWISS_DEFAULT_LANGUAGE;
}

export type LegalForm = "incorporated" | "sole_trader" | "unknown";
export type ContactType = "role" | "named" | "unknown";

/**
 * The "sole-trader trap" guardrail. In opt-out markets the cold-email exemption
 * covers incorporated companies and generic/role inboxes — NOT sole traders or
 * named-individual addresses. Defensible ONLY when we have positive evidence:
 * an incorporated entity (non-named contact) or a generic role inbox.
 */
export function isEmailable(input: {
  countryCode: string;
  legalForm?: LegalForm;
  contactType?: ContactType;
}): boolean {
  if (!isLaunchMarket(input.countryCode)) return false;
  if (input.contactType === "named") return false; // a named individual = opt-in everywhere
  if (input.legalForm === "sole_trader") return false; // natural person
  if (input.contactType === "role") return true; // generic inbox (info@, contact@…)
  if (input.legalForm === "incorporated") return true; // company, non-named contact
  return false; // unknown/unknown → not defensible
}

/** Forma canônica para casar supressão (Convex não tem índice case-insensitive). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** OPTIN-04: consentimento explícito destrava email independente de mercado/forma jurídica. */
export function canContactByEmail(lead: {
  emailable?: boolean | null;
  contactOptInAt?: number | null;
}): boolean {
  if (lead.emailable === true) return true;
  return typeof lead.contactOptInAt === "number" && lead.contactOptInAt > 0;
}

/**
 * Gate de WhatsApp (COMP-04): só há opt-in se houver timestamp registrado.
 * OPTIN-04: aceita o campo legado (waOptInAt) OU o consentimento generalizado
 * (contactOptInAt) — um consentimento único destrava os dois canais.
 */
export function hasWaOptIn(lead: {
  waOptInAt?: number | null;
  contactOptInAt?: number | null;
}): boolean {
  const wa = typeof lead.waOptInAt === "number" && lead.waOptInAt > 0;
  const contact = typeof lead.contactOptInAt === "number" && lead.contactOptInAt > 0;
  return wa || contact;
}

/** Incorporation-marker suffixes in the business name, per launch market. */
const INCORPORATED_SUFFIXES: Record<string, string[]> = {
  GB: ["ltd", "limited", "llp", "plc"],
  IE: ["ltd", "limited", "teoranta", "teo", "plc", "dac", "clg"],
  NL: ["bv", "nv"],
  SE: ["ab"],
  NO: ["as", "asa"],
};

/** Infer legal form from the business name. Absence of a marker → unknown (not sole_trader). */
export function inferLegalForm(name: string, countryCode: string): LegalForm {
  const suffixes = INCORPORATED_SUFFIXES[countryCode.toUpperCase()];
  if (!suffixes) return "unknown";
  const tokens = name.toLowerCase().replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
  return tokens.some((t) => suffixes.includes(t)) ? "incorporated" : "unknown";
}

const ROLE_LOCALPARTS = new Set([
  "info", "contact", "hello", "hi", "hey", "office", "admin", "enquiries", "enquiry",
  "reception", "reservations", "reservation", "booking", "bookings", "sales", "mail",
  "email", "team", "support", "geral", "kontakt", "post", "boka", "hallo", "kontor",
]);

/** Classify an email address as a generic role inbox vs a named individual. */
export function inferContactType(email?: string | null): ContactType {
  if (!email) return "unknown";
  const local = (email.split("@")[0] ?? "").toLowerCase().replace(/[0-9]+$/, "");
  if (!local) return "unknown";
  if (ROLE_LOCALPARTS.has(local)) return "role";
  if (/^[a-z]+[._-][a-z]+$/.test(local)) return "named"; // firstname.lastname
  if (/^[a-z]{2,12}$/.test(local)) return "named"; // single given name
  return "unknown";
}

// ---------------------------------------------------------------------------
// Website classification — "has a real site?" / "social-only?" (free, no API)
// ---------------------------------------------------------------------------

/**
 * Host suffixes that mean "not a real website": social, link-in-bio, free-tier
 * builders, and EU delivery/aggregator links masquerading as the business site.
 * Match on the parsed host, never a substring of the URL.
 */
export const NOT_A_SITE_SUFFIXES: string[] = [
  // social / link-in-bio
  "instagram.com",
  "facebook.com",
  "fb.me",
  "m.me",
  "tiktok.com",
  "linktr.ee",
  "beacons.ai",
  "bio.link",
  "linkin.bio",
  "wa.me",
  "api.whatsapp.com",
  // free-tier micro-sites / builders
  "business.site",
  "sites.google.com",
  "wixsite.com",
  "weebly.com",
  "jimdosite.com",
  "jimdofree.com",
  "godaddysites.com",
  "systeme.io",
  // EU delivery / marketplace (the "site" is really an ordering page)
  "thefork.com",
  "thefork.co.uk",
  "ubereats.com",
  "just-eat.co.uk",
  "just-eat.ie",
  "lieferando.de",
  "glovoapp.com",
  "deliveroo.co.uk",
  "deliveroo.ie",
  "takeaway.com",
  // Brazil (secondary)
  "ifood.com.br",
];

export function normalizeHost(url: string): string | null {
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export interface WebsiteClass {
  hasRealSite: boolean;
  socialOnly: boolean;
  host: string | null;
}

/** Classify a business's listed website URL (may be undefined/empty). */
export function classifyWebsite(url?: string | null): WebsiteClass {
  if (!url || !url.trim()) return { hasRealSite: false, socialOnly: false, host: null };
  const host = normalizeHost(url);
  if (!host) return { hasRealSite: false, socialOnly: false, host: null };
  const isNotASite = NOT_A_SITE_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
  return { hasRealSite: !isNotASite, socialOnly: isNotASite, host };
}

// ---------------------------------------------------------------------------
// Digital Presence Score — weighted "pain" (0–100, higher = better lead)
// ---------------------------------------------------------------------------

export interface Signals {
  noSite: boolean;
  socialOnly: boolean;
  noHttps: boolean;
  notMobile: boolean;
  slow: boolean;
  sparseProfile: boolean;
}

export const SCORE_WEIGHTS: Record<keyof Signals, number> = {
  noSite: 55,
  socialOnly: 50,
  noHttps: 15,
  notMobile: 20,
  slow: 15,
  sparseProfile: 20,
};

export function computeScore(signals: Signals): number {
  let score = 0;
  for (const key of Object.keys(SCORE_WEIGHTS) as (keyof Signals)[]) {
    if (signals[key]) score += SCORE_WEIGHTS[key];
  }
  return Math.min(100, score);
}

export type Tier = "hot" | "warm" | "cold";

export function tierFromScore(score: number): Tier {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// ---------------------------------------------------------------------------
// Pipeline stages & starter categories
// ---------------------------------------------------------------------------

export type Stage = "base" | "approached" | "scheduled" | "followup" | "converted" | "lost";

export const PIPELINE_STAGES: { id: Stage; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "approached", label: "Abordado" },
  { id: "scheduled", label: "Agendado" },
  { id: "followup", label: "Follow Up" },
  { id: "converted", label: "Convertido" },
  { id: "lost", label: "Perdido" },
];

// ---------------------------------------------------------------------------
// Plans (freemium)
// ---------------------------------------------------------------------------

export type Plan = "free" | "pro" | "agency";

export interface PlanDef {
  id: Plan;
  name: string;
  price: number; // EUR / month
  leadsPerMonth: number;
  sitesPerMonth: number;
  features: string[];
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Gratuito",
    price: 0,
    leadsPerMonth: 60,
    sitesPerMonth: 2,
    features: ["5 categorias", "Digital Presence Score", "2 sites/mês", "Preview rastreado"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 49,
    leadsPerMonth: 2000,
    sitesPerMonth: 50,
    features: [
      "Todas as categorias",
      "Todos os mercados opt-out",
      "Outreach por IA",
      "50 sites/mês",
      "Export CSV",
    ],
  },
  agency: {
    id: "agency",
    name: "Agência",
    price: 149,
    leadsPerMonth: 10000,
    sitesPerMonth: 500,
    features: ["Tudo do Pro", "White-label + domínio próprio", "500 sites/mês", "Prioridade"],
  },
};

export function planLimit(plan: Plan, kind: "leads" | "sites"): number {
  return kind === "leads" ? PLANS[plan].leadsPerMonth : PLANS[plan].sitesPerMonth;
}

/** Clamp do parâmetro `max` de descoberta: default 20, piso 1, teto 50, arredonda decimais. */
export function clampDiscoveryCount(max?: number): number {
  const n = Math.round(max ?? 20);
  const safe = Number.isFinite(n) ? n : 20; // NaN/Infinity → default (Math.max(NaN,1) = NaN em JS)
  return Math.min(Math.max(safe, 1), 50);
}

/** Category options for the discovery UI — value is the Places search term, label is pt-BR. */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "restaurant", label: "Restaurante" },
  { value: "cafe", label: "Café" },
  { value: "bar", label: "Bar" },
  { value: "pub", label: "Pub" },
  { value: "pizza restaurant", label: "Pizzaria" },
  { value: "bakery", label: "Padaria" },
  { value: "pastry shop", label: "Confeitaria" },
  { value: "ice cream shop", label: "Sorveteria" },
  { value: "barber shop", label: "Barbearia" },
  { value: "hair salon", label: "Cabeleireiro" },
  { value: "beauty salon", label: "Salão de beleza" },
  { value: "nail salon", label: "Manicure / unhas" },
  { value: "spa", label: "Spa / estética" },
  { value: "tattoo studio", label: "Estúdio de tatuagem" },
  { value: "gym", label: "Academia" },
  { value: "personal trainer", label: "Personal trainer" },
  { value: "yoga studio", label: "Estúdio de yoga" },
  { value: "dentist", label: "Dentista" },
  { value: "doctor", label: "Clínica médica" },
  { value: "physiotherapist", label: "Fisioterapia" },
  { value: "veterinarian", label: "Veterinário" },
  { value: "pharmacy", label: "Farmácia" },
  { value: "optician", label: "Óptica" },
  { value: "pet store", label: "Petshop" },
  { value: "florist", label: "Floricultura" },
  { value: "hotel", label: "Hotel" },
  { value: "bed and breakfast", label: "Pousada / B&B" },
  { value: "real estate agency", label: "Imobiliária" },
  { value: "lawyer", label: "Advogado" },
  { value: "accountant", label: "Contador" },
  { value: "car repair", label: "Mecânica" },
  { value: "car wash", label: "Lava-rápido" },
  { value: "driving school", label: "Autoescola" },
  { value: "plumber", label: "Encanador" },
  { value: "electrician", label: "Eletricista" },
  { value: "locksmith", label: "Chaveiro" },
  { value: "photographer", label: "Fotógrafo" },
  { value: "jewelry store", label: "Joalheria" },
  { value: "clothing store", label: "Loja de roupas" },
  { value: "furniture store", label: "Loja de móveis" },
  { value: "laundry", label: "Lavanderia" },
  { value: "language school", label: "Escola de idiomas" },
];

/** Main cities per searchable market (launch + opt-in) for the discovery UI. */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  GB: [
    "London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Sheffield", "Bristol",
    "Newcastle", "Nottingham", "Leicester", "Coventry", "Bradford", "Cardiff", "Belfast",
    "Brighton", "Kingston upon Hull", "Plymouth", "Stoke-on-Trent", "Wolverhampton", "Derby",
    "Southampton", "Portsmouth", "Reading", "Glasgow", "Edinburgh", "Aberdeen", "Dundee",
    "Swansea", "Norwich", "Oxford", "Cambridge", "York", "Milton Keynes", "Bournemouth",
    "Ipswich", "Exeter",
  ],
  NL: [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Tilburg",
    "Almere", "Breda", "Nijmegen", "Enschede", "Haarlem", "Arnhem", "Amersfoort", "Zaanstad",
    "'s-Hertogenbosch", "Zwolle", "Leiden", "Maastricht", "Dordrecht", "Ede", "Alphen aan den Rijn",
    "Leeuwarden", "Alkmaar", "Delft", "Venlo", "Deventer", "Helmond", "Hilversum", "Apeldoorn",
  ],
  IE: [
    "Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Dundalk", "Swords",
    "Bray", "Navan", "Kilkenny", "Ennis", "Carlow", "Tralee", "Newbridge", "Portlaoise",
    "Naas", "Athlone", "Mullingar", "Wexford", "Letterkenny", "Sligo", "Clonmel", "Greystones",
  ],
  SE: [
    "Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping",
    "Helsingborg", "Jönköping", "Norrköping", "Lund", "Umeå", "Gävle", "Borås", "Södertälje",
    "Eskilstuna", "Halmstad", "Växjö", "Karlstad", "Sundsvall", "Östersund", "Trollhättan",
    "Luleå", "Kalmar",
  ],
  NO: [
    "Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand",
    "Sandnes", "Tromsø", "Sarpsborg", "Skien", "Ålesund", "Sandefjord", "Haugesund", "Tønsberg",
    "Moss", "Porsgrunn", "Bodø", "Arendal", "Hamar", "Larvik", "Halden", "Lillehammer", "Molde",
  ],
  // Mercados opt-in (OPTIN-01): pesquisáveis, contato por ligação primeiro.
  ES: [
    "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma",
    "Bilbao", "Alicante", "Córdoba", "Valladolid",
  ],
  IT: [
    "Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze",
    "Bari", "Catania", "Venezia", "Verona",
  ],
  PT: [
    "Lisboa", "Porto", "Vila Nova de Gaia", "Braga", "Amadora", "Setúbal", "Coimbra", "Queluz",
    "Funchal", "Aveiro", "Faro", "Almada",
  ],
  DE: [
    "Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main", "Stuttgart", "Düsseldorf",
    "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
  ],
  DK: [
    "København", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens",
    "Vejle", "Roskilde", "Herning",
  ],
  // Suíça: cobre as três regiões linguísticas (ver swissLanguage). Nomes LOCAIS,
  // que é o que a usuária vê no select — o resolvedor casa local e inglês.
  CH: [
    "Zürich", "Genève", "Basel", "Lausanne", "Bern", "Winterthur", "Luzern", "St. Gallen",
    "Lugano", "Biel/Bienne", "Thun", "Fribourg", "Neuchâtel", "Zug", "Chur", "Schaffhausen",
    "Sion", "Montreux", "Bellinzona", "Locarno", "Chiasso",
  ],
};

export const STARTER_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "hair_salon",
  "beauty_salon",
  "gym",
  "dentist",
  "plumber",
  "electrician",
  "car_repair",
] as const;

// ---------------------------------------------------------------------------
// CRM: fluxo do dia e informação do lead. Tudo puro; quem depende do relógio
// recebe `now`. "Dia civil local" = fuso do processo que chama (o navegador,
// na UI; o Convex roda em UTC e por isso NUNCA faz aritmética de data).
// ---------------------------------------------------------------------------

export type Currency = "EUR" | "GBP" | "SEK" | "NOK" | "DKK" | "CHF";

const CURRENCY_BY_COUNTRY: Record<string, Currency> = {
  GB: "GBP",
  SE: "SEK",
  NO: "NOK",
  CH: "CHF",
  DK: "DKK",
};

/** Moeda derivada do país, sem campo no lead: fora da tabela é euro. */
export function currencyForCountry(countryCode: string): Currency {
  return CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "EUR";
}

export function currencySymbol(currency: Currency): string {
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  if (currency === "CHF") return "CHF";
  return "kr";
}

/** Sem centavos (arredonda), milhar com ponto: "€340", "£1.200", "340 kr", "CHF 340". */
export function formatMoney(amount: number, currency: Currency): string {
  const n = Math.round(amount);
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = (n < 0 ? "-" : "") + digits;
  const symbol = currencySymbol(currency);
  if (currency === "EUR" || currency === "GBP") return `${symbol}${body}`;
  if (currency === "CHF") return `${symbol} ${body}`;
  return `${body} ${symbol}`;
}

const DAY_MS = 86_400_000;
const MONTH_ABBR_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Meia-noite local do dia de `at`. */
function startOfLocalDay(at: number): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Mesmo horário local, `n` dias civis depois: atravessa horário de verão sem virar 23 h. */
export function addDays(at: number, n: number): number {
  const d = new Date(at);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ).getTime();
}

/** Dias civis inteiros de `a` até `b` (positivo quando `b` é depois), fuso local. */
export function daysBetween(a: number, b: number): number {
  // Math.round: o dia da virada de horário de verão tem 23 h ou 25 h.
  return Math.round((startOfLocalDay(b) - startOfLocalDay(a)) / DAY_MS);
}

/**
 * "2026-09-23" (valor do <input type="date">) → meia-noite LOCAL do dia.
 * Nunca `new Date(string)`: isso parseia como UTC e cai no dia errado à noite.
 * Inválido (vazio, outro formato, 31/02) → null.
 */
export function dateInputToTimestamp(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

/** "YYYY-MM-DD" LOCAL, para `value` e `min` do <input type="date">. */
export function toDateInputValue(at: number): string {
  const d = new Date(at);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "hoje", "ontem", "amanhã", senão "23 set". */
export function formatDay(at: number, now: number): string {
  const delta = daysBetween(now, at);
  if (delta === 0) return "hoje";
  if (delta === -1) return "ontem";
  if (delta === 1) return "amanhã";
  const d = new Date(at);
  return `${d.getDate()} ${MONTH_ABBR_PT[d.getMonth()]}`;
}

/** Para eventos (passado): "agora", "há 5 min", "há 2 h", "ontem", senão formatDay. */
export function formatRelative(at: number, now: number): string {
  const diff = now - at;
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  const days = daysBetween(at, now);
  if (days === 0) return `há ${Math.floor(diff / 3_600_000)} h`;
  if (days === 1) return "ontem";
  return formatDay(at, now);
}

export interface NextAction {
  at: number;
  note: string;
}

export type ActionStatus = "overdue" | "today" | "upcoming";

/** Uma próxima ação por lead, no próprio documento. Sem `nextActionAt` não há ação. */
export function nextActionOf(lead: {
  nextActionAt?: number | null;
  nextActionNote?: string | null;
}): NextAction | null {
  if (typeof lead.nextActionAt !== "number") return null;
  return { at: lead.nextActionAt, note: lead.nextActionNote ?? "" };
}

/** Antes de hoje 00:00 local = atrasada; mesmo dia civil = hoje; depois = futura. */
export function actionStatus(at: number, now: number): ActionStatus {
  const delta = daysBetween(now, at);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  return "upcoming";
}

export const STALLED_AFTER_DAYS = 7;

type StalledInput = {
  nextActionAt?: number | null;
  nextActionNote?: string | null;
  stage: string;
  stageUpdatedAt: number;
};

/**
 * Dias desde a última mudança de estágio, SÓ quando não há ação e o estágio não é
 * converted nem lost; senão null. Conta a partir de stageUpdatedAt (não do último
 * evento): é o estágio que mede avanço, e ler eventos por card custaria uma query cada.
 */
export function stalledDays(lead: StalledInput, now: number): number | null {
  if (nextActionOf(lead) !== null) return null;
  if (lead.stage === "converted" || lead.stage === "lost") return null;
  return daysBetween(lead.stageUpdatedAt, now);
}

export function isStalled(lead: StalledInput, now: number): boolean {
  const days = stalledDays(lead, now);
  return days !== null && days >= STALLED_AFTER_DAYS;
}

/** Com ação antes de sem ação; entre com ação, `at` crescente; entre sem ação, score decrescente. */
export function compareByNextAction(
  a: { nextActionAt?: number | null; score?: number | null },
  b: { nextActionAt?: number | null; score?: number | null },
): number {
  const aAt = typeof a.nextActionAt === "number" ? a.nextActionAt : null;
  const bAt = typeof b.nextActionAt === "number" ? b.nextActionAt : null;
  if (aAt !== null && bAt !== null) return aAt - bAt;
  if (aAt !== null) return -1;
  if (bAt !== null) return 1;
  return (b.score ?? 0) - (a.score ?? 0);
}
