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
}

/** V1 launch markets: opt-out or conditional cold B2B email. */
export const MARKETS: Record<string, Market> = {
  GB: { code: "GB", name: "Reino Unido", flag: "🇬🇧", coldEmail: "opt_out" },
  NL: { code: "NL", name: "Holanda", flag: "🇳🇱", coldEmail: "opt_out" },
  IE: { code: "IE", name: "Irlanda", flag: "🇮🇪", coldEmail: "opt_out" },
  SE: { code: "SE", name: "Suécia", flag: "🇸🇪", coldEmail: "opt_out" },
  NO: { code: "NO", name: "Noruega", flag: "🇳🇴", coldEmail: "conditional" },
  // Present for display/gating only — cold email is unlawful (opt-in) → Phase 2.
  DE: { code: "DE", name: "Alemanha", flag: "🇩🇪", coldEmail: "opt_in" },
  CH: { code: "CH", name: "Suíça", flag: "🇨🇭", coldEmail: "opt_in" },
  DK: { code: "DK", name: "Dinamarca", flag: "🇩🇰", coldEmail: "opt_in" },
  IT: { code: "IT", name: "Itália", flag: "🇮🇹", coldEmail: "opt_in" },
  ES: { code: "ES", name: "Espanha", flag: "🇪🇸", coldEmail: "opt_in" },
};

/** Markets the V1 cold-email motion is allowed to target. */
export const LAUNCH_MARKETS = ["GB", "NL", "IE", "SE", "NO"];

export function isLaunchMarket(countryCode: string): boolean {
  return LAUNCH_MARKETS.includes(countryCode.toUpperCase());
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

export type Stage = "base" | "approached" | "opened" | "replied" | "converted" | "lost";

export const PIPELINE_STAGES: { id: Stage; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "approached", label: "Abordado" },
  { id: "opened", label: "Abriu preview" },
  { id: "replied", label: "Respondeu" },
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

/** Main cities per launch market for the discovery UI. */
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
