import type { Doc } from "../_generated/dataModel";
import type { Signals, SwissLang } from "./domain.ts";
import { swissLanguage } from "./domain.ts";

/**
 * Português EUROPEU, qualificado de propósito. O valor do LANG entra CRU no prompt
 * ("Write in ${lang}"), e o nome simples "Portuguese" ancorava o modelo em pt-BR —
 * pior ainda na chamada do script de ligação, que pede uma tradução pt-BR na MESMA
 * mensagem. Este valor é a fronteira entre o idioma do PROSPECT (pt-PT) e o idioma
 * da USUÁRIA (pt-BR, só na tradução). Paridade com os mapas de copy de
 * convex/lib/compliance.ts é coberta por tests/prospect-lang.test.ts.
 */
export const PT_PT = "European Portuguese (pt-PT)";

/** Outreach language per searchable market (launch + opt-in). */
export const LANG: Record<string, string> = {
  GB: "English",
  IE: "English",
  NL: "Dutch",
  SE: "Swedish",
  NO: "Norwegian",
  // Mercados opt-in (OPTIN-03): idioma do script de ligação.
  ES: "Spanish",
  IT: "Italian",
  PT: PT_PT,
  DE: "German",
  DK: "Danish",
  // Padrão da Suíça GERMANÓFONA (~62% do país), não "o idioma da Suíça": o país tem três
  // regiões linguísticas. A fonte de verdade do idioma de um lead é `langForLead` — que
  // consulta a cidade e devolve French em Genebra e Italian em Lugano. Esta entrada existe
  // porque é o fallback dessa função e a âncora dos testes de paridade LANG ↔ copy.
  CH: "German",
};

/** Nome do idioma (no vocabulário do LANG) por região linguística suíça. */
const SWISS_LANG_NAME: Record<SwissLang, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
};

/**
 * Idioma do prospect — FONTE DE VERDADE do outreach e da compliance.
 *
 * Deriva de (país, cidade) porque a Suíça é o único mercado multilíngue da base: um
 * lead em Genebra recebia script de ligação, email e rodapé de opt-out em alemão.
 * Cidade suíça desconhecida → alemão (fallback deliberado de `swissLanguage`).
 * Todos os outros países continuam derivando o idioma só do countryCode.
 *
 * O nome da cidade chega na forma LOCAL ("Genève", "Zürich"): é o valor do select
 * que `convex/places.ts` grava (`city: args.city`), não o que o Places devolve.
 * Exônimo inglês, caixa, acento e subúrbio são cobertura defensiva de
 * `swissLanguage` — a origem de cada forma está documentada em `convex/lib/domain.ts`.
 */
export function langForLead(lead: { countryCode: string; city?: string | null }): string {
  const cc = (lead.countryCode ?? "").toUpperCase();
  if (cc === "CH") return SWISS_LANG_NAME[swissLanguage(lead.city)];
  return LANG[cc] ?? "English";
}

/**
 * Assunto de emergência quando o JSON do modelo não parseia. Cobre TODO valor de
 * LANG: assunto em inglês em cima de um corpo em alemão queima o lead e denuncia
 * automação. Inglês é o último recurso, só para idioma fora do mapa.
 */
const FALLBACK_SUBJECT: Record<string, (business: string) => string> = {
  English: (b) => `${b} — a quick note about your website`,
  Dutch: (b) => `${b} — een korte opmerking over uw website`,
  Swedish: (b) => `${b} — en kort notis om er webbplats`,
  Norwegian: (b) => `${b} — en kort melding om nettstedet deres`,
  Spanish: (b) => `${b} — una nota rápida sobre su sitio web`,
  Italian: (b) => `${b} — una breve nota sul vostro sito web`,
  [PT_PT]: (b) => `${b} — uma nota rápida sobre o seu site`,
  German: (b) => `${b} — eine kurze Nachricht zu Ihrer Website`,
  Danish: (b) => `${b} — en kort besked om jeres hjemmeside`,
  // Suíça francófona (langForLead): sem esta entrada, o corpo sairia em francês e o
  // assunto em inglês — exatamente o que este mapa existe para evitar.
  French: (b) => `${b} — une note rapide au sujet de votre site web`,
};

/** Assunto de fallback no idioma do prospect (inglês só para idioma desconhecido). */
export function fallbackSubject(lang: string, businessName: string): string {
  const build = FALLBACK_SUBJECT[lang] ?? FALLBACK_SUBJECT.English;
  return build(businessName);
}

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
  const lang = langForLead(lead);
  const s = lead.signals;
  const pains = s
    ? (Object.keys(SIGNAL_TEXT) as (keyof Signals)[]).filter((k) => s[k]).map((k) => SIGNAL_TEXT[k])
    : [];

  const system =
    `You write SHORT, honest, compliant B2B cold emails for an independent web ` +
    `professional reaching a local business about their online presence. ` +
    `Write the ENTIRE email (subject included) in ${lang} — the prospect's language, ` +
    `never a related variety of it. Max ~120 words. Professional, no hype, no fake urgency. ` +
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
  // Fallback de parse: o corpo cru veio no idioma do prospect — o assunto TEM que
  // acompanhar, senão o alemão recebe assunto em inglês com corpo em alemão.
  return { subject: fallbackSubject(lang, lead.name), body: text };
}

/**
 * Gera um script de ligação B2B curto (~150 palavras) no idioma do mercado + tradução pt-BR.
 * O fecho pede EXPLICITAMENTE consentimento para enviar a prévia por email/WhatsApp.
 */
export async function writeCallScript(
  apiKey: string,
  lead: Doc<"leads">,
): Promise<{ script: string; translation: string }> {
  const lang = langForLead(lead);
  const s = lead.signals;
  const pains = s
    ? (Object.keys(SIGNAL_TEXT) as (keyof Signals)[]).filter((k) => s[k]).map((k) => SIGNAL_TEXT[k])
    : [];

  const system =
    `You write a SHORT spoken cold-call opening script (~150 words) for an independent web ` +
    `professional calling a local business about their online presence, in a market where cold ` +
    `EMAIL is not legally usable without prior consent but a B2B phone call is. ` +
    `The two output fields have two DIFFERENT audiences and two DIFFERENT languages — never mix them: ` +
    `"script" is what the caller says OUT LOUD to the prospect and MUST be written in ${lang} ` +
    `(the prospect's language, not a related variety of it); "translation" is a faithful Brazilian ` +
    `Portuguese (pt-BR) rendering of that same script, written only so the Brazilian caller understands ` +
    `what they are reading aloud. Even when the prospect's language is itself a form of Portuguese, ` +
    `"script" stays in ${lang} and only "translation" is pt-BR. ` +
    `The call MUST: (1) open by identifying the caller, (2) name the SPECIFIC gap ` +
    `noticed, (3) mention a free preview website already built for them, (4) end by EXPLICITLY asking ` +
    `for permission to send it by email or WhatsApp. ` +
    `Return STRICT JSON only: {"script": string, "translation": string}. No markdown.`;

  const user =
    `Business: ${lead.name}` +
    `${lead.city ? ` in ${lead.city}` : ""}` +
    `${lead.category ? `, a ${lead.category.replace(/_/g, " ")}` : ""}. ` +
    `Issues noticed: ${pains.length ? pains.join("; ") : "weak online presence"}. ` +
    `Write the call script and its pt-BR translation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 800,
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
    const parsed = JSON.parse(text) as { script: string; translation: string };
    if (parsed.script && parsed.translation) return parsed;
  } catch {
    // fall through
  }
  // Fallback de parse: devolve o texto cru como script, mas a tradução fica VAZIA de propósito.
  // Repetir o texto estrangeiro na coluna "Tradução (pt-BR)" seria uma tradução falsa — e como
  // quem liga não fala o idioma, isso é pior que não ter tradução. "" = tradução indisponível
  // (a UI trata esse caso); nunca finja que traduziu.
  return { script: text, translation: "" };
}
