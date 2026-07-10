import type { Doc } from "../_generated/dataModel";
import type { Signals } from "./domain";

/** Outreach language per launch market. */
const LANG: Record<string, string> = {
  GB: "English",
  IE: "English",
  NL: "Dutch",
  SE: "Swedish",
  NO: "Norwegian",
};

const SIGNAL_TEXT: Record<keyof Signals, string> = {
  noSite: "has no website at all",
  socialOnly: "only has a social/link-in-bio page, not a real website",
  noHttps: "their website has no HTTPS (browsers show it as 'not secure')",
  notMobile: "their website is not mobile-friendly",
  slow: "their website is slow to load",
  sparseProfile: "their Google Business profile is incomplete",
};

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

/**
 * Draft a short, compliant B2B cold email via Claude. Compliant-by-design:
 * sender identity, relevance-to-business, the specific gap, the preview link,
 * and a one-line opt-out. Returns { subject, body }.
 */
export async function writeEmail(
  apiKey: string,
  lead: Doc<"leads">,
  previewUrl: string,
): Promise<{ subject: string; body: string }> {
  const lang = LANG[lead.countryCode] ?? "English";
  const s = lead.signals;
  const pains = s
    ? (Object.keys(SIGNAL_TEXT) as (keyof Signals)[]).filter((k) => s[k]).map((k) => SIGNAL_TEXT[k])
    : [];

  const system =
    `You write SHORT, honest, compliant B2B cold emails for an independent web ` +
    `professional reaching a local business about their online presence. ` +
    `Write in ${lang}. Max ~120 words. Professional, no hype, no fake urgency. ` +
    `The email MUST: (1) identify the sender as an independent web professional, ` +
    `(2) briefly say why you're contacting them (relevant to their business), ` +
    `(3) name the SPECIFIC gap noticed, (4) include the preview link exactly once, ` +
    `(5) end with a one-line opt-out (e.g. reply "stop" to not be contacted again). ` +
    `Return STRICT JSON only: {"subject": string, "body": string}. No markdown.`;

  const user =
    `Business: ${lead.name}` +
    `${lead.city ? ` in ${lead.city}` : ""}` +
    `${lead.category ? `, a ${lead.category.replace(/_/g, " ")}` : ""}. ` +
    `Issues noticed: ${pains.length ? pains.join("; ") : "weak online presence"}. ` +
    `I already built a free preview website for them: ${previewUrl}. Write the email.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = (data.content ?? []).map((b) => b.text ?? "").join("").trim();

  try {
    const parsed = JSON.parse(text) as { subject: string; body: string };
    if (parsed.subject && parsed.body) return parsed;
  } catch {
    // fall through
  }
  return { subject: `${lead.name} — a quick note about your website`, body: text };
}
