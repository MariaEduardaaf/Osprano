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
      headers: { "user-agent": "Mozilla/5.0 (compatible; sitescout/1.0)" },
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
