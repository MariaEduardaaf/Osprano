/**
 * Website enrichment helpers for the Digital Presence Score. Pure `fetch` — runs
 * in the default Convex action runtime (no Node APIs needed).
 */

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** True if the site serves over HTTPS (any response = handshake succeeded). */
export async function checkHttps(url: string): Promise<boolean> {
  const host = url.replace(/^https?:\/\//, "");
  try {
    const res = await fetchWithTimeout(`https://${host}`, 7000, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; osprano/1.0)" },
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: { viewport?: { score?: number } };
  };
}

export interface PageSpeed {
  perf: number | null; // 0–1 Lighthouse performance score
  mobileFriendly: boolean; // viewport audit passed
}

const JUNK_EMAIL =
  /(sentry|example\.(com|org)|wixpress|godaddy|googleapis|schema\.org|w3\.org|\.png|\.jpg|@x\.com)/i;

/** Extract a contact email from the business's own website (free, legit). Prefers role/same-domain. */
export async function extractEmail(url: string): Promise<string | null> {
  const host = url.replace(/^https?:\/\//, "");
  try {
    const res = await fetchWithTimeout(`https://${host}`, 8000, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; osprano/1.0)" },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 500_000);

    const found = new Set<string>();
    for (const m of html.match(/mailto:([^"'?\s>]+)/gi) ?? []) {
      found.add(m.replace(/mailto:/i, "").split("?")[0]);
    }
    for (const e of html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []) {
      found.add(e);
    }

    const clean = [...found]
      .map((e) => e.toLowerCase())
      .filter((e) => e.includes("@") && !JUNK_EMAIL.test(e) && !/\.(png|jpe?g|gif|webp|css|js)$/i.test(e));
    if (!clean.length) return null;

    const domain = host.replace(/^www\./, "").split("/")[0];
    const base = domain.split(".")[0];
    const sameDomain = clean.filter((e) => {
      const d = e.split("@")[1] ?? "";
      return d === domain || d.includes(base);
    });
    const pool = sameDomain.length ? sameDomain : clean;
    const role = pool.find((e) =>
      /^(info|contact|hello|office|admin|enquir|reserv|booking|sales|mail|reception|geral|kontakt)/i.test(e),
    );
    return role ?? pool[0];
  } catch {
    return null;
  }
}

/** Google PageSpeed Insights (mobile). Returns null on any failure. */
export async function fetchPageSpeed(url: string, key?: string): Promise<PageSpeed | null> {
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=mobile&category=performance` +
    (key ? `&key=${key}` : "");
  try {
    const res = await fetchWithTimeout(endpoint, 30000);
    if (!res.ok) return null;
    const data = (await res.json()) as PsiResponse;
    const perf = data.lighthouseResult?.categories?.performance?.score;
    const viewport = data.lighthouseResult?.audits?.viewport?.score;
    return {
      perf: typeof perf === "number" ? perf : null,
      mobileFriendly: viewport === 1,
    };
  } catch {
    return null;
  }
}
