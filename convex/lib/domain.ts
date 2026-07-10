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

/**
 * The "sole-trader trap" guardrail. In opt-out markets the cold-email exemption
 * covers incorporated companies and generic/role inboxes — NOT sole traders or
 * named-individual addresses. Returns whether this lead is safe to cold-email.
 */
export function isEmailable(input: {
  countryCode: string;
  legalForm?: "incorporated" | "sole_trader" | "unknown";
  contactType?: "role" | "named" | "unknown";
}): boolean {
  if (!isLaunchMarket(input.countryCode)) return false;
  if (input.legalForm === "sole_trader") return false;
  if (input.contactType === "named") return false;
  return true;
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
  noSite: 45,
  socialOnly: 35,
  noHttps: 15,
  notMobile: 20,
  slow: 15,
  sparseProfile: 10,
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
