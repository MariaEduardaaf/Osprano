/**
 * Website enrichment helpers for the Digital Presence Score. Pure `fetch` — runs
 * in the default Convex action runtime (no Node APIs needed).
 *
 * REGRA DESTE ARQUIVO: "não consegui medir" NUNCA vira "está ruim".
 *
 * Cada sinal daqui vira uma frase afirmativa num email mandado para um negócio
 * europeu real ("their website has no HTTPS"). Um `catch { return false }`
 * genérico transforma timeout, DNS lento, WAF/Cloudflare bloqueando o nosso
 * user-agent ou 403 anti-bot em uma ACUSAÇÃO factual sobre a empresa do
 * prospect. Por isso a medição é modelada em três estados — medido-bom,
 * medido-ruim e DESCONHECIDO — e só o medido-ruim pode virar pain.
 *
 * A forma escolhida foi um objeto discriminado (`{ status, reason }`) em vez de
 * `boolean | undefined`:
 *   - `undefined` num boolean é fácil demais de colapsar de volta com `!x` (foi
 *     exatamente `noHttps = !https` que causou o bug);
 *   - o `reason` deixa o motivo do "desconhecido" auditável no log da action,
 *     sem precisar de campo novo no schema (Signals continua boolean = "pain
 *     VERIFICADA", e desconhecido simplesmente não pontua).
 */

const HTTPS_TIMEOUT_MS = 7000;
const HTTP_FALLBACK_TIMEOUT_MS = 5000;
const UA = "Mozilla/5.0 (compatible; osprano/1.0)";

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Classificação PURA de resultado de fetch (testável sem rede)
// ---------------------------------------------------------------------------

/** Por que um fetch falhou. Só `tls`/`refused` são compatíveis com "não tem HTTPS". */
export type FetchFailure = "timeout" | "dns" | "tls" | "refused" | "network";

/**
 * Resultado observável de uma tentativa de conexão. `location`/`finalUrl` existem
 * para reconhecer o redirect http→https: dependendo do runtime, um redirect
 * aparece como header `Location` (redirect manual) ou como `res.url` diferente
 * do pedido (redirect seguido).
 */
export type Probe =
  | { kind: "response"; status: number; location?: string | null; finalUrl?: string | null }
  | { kind: "failure"; failure: FetchFailure };

/** Achata name/message/code/cause de um erro em texto minúsculo (profundidade limitada). */
function errorText(err: unknown, depth = 0): string {
  if (depth > 4 || err === null || err === undefined) return "";
  if (typeof err === "string") return err.toLowerCase();
  if (typeof err !== "object") return String(err).toLowerCase();

  const e = err as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
  const parts: string[] = [];
  for (const value of [e.name, e.message, e.code]) {
    if (typeof value === "string") parts.push(value);
  }
  if (e.cause !== undefined && e.cause !== err) parts.push(errorText(e.cause, depth + 1));
  return parts.join(" ").toLowerCase();
}

/**
 * Classifica o erro de um fetch. A ordem importa: abort/timeout primeiro (um
 * AbortError costuma vir embrulhado num TypeError "fetch failed"), DNS antes de
 * TLS, e o default é `network` — o balde mais conservador, que nunca vira pain.
 */
export function classifyFetchError(err: unknown): FetchFailure {
  const text = errorText(err);
  if (!text) return "network";
  if (/abort|timed?\s?out|etimedout|esockettimedout|deadline/.test(text)) return "timeout";
  if (/enotfound|eai_again|getaddrinfo|dns|name not resolved|unknown host|nodename/.test(text)) {
    return "dns";
  }
  if (
    /certificate|cert_|_cert|err_cert|ssl|tls|handshake|eproto|self[ _]signed|unable[ _]to[ _]verify|alt[ _]?name|hostname mismatch|wrong[ _]version[ _]number/.test(
      text,
    )
  ) {
    return "tls";
  }
  if (/econnrefused|connection refused|err_connection_refused/.test(text)) return "refused";
  return "network";
}

export type HttpsStatus = "secure" | "insecure" | "unknown";

export type HttpsReason =
  /** secure: houve resposta sobre TLS (qualquer status — até 403 de WAF prova o handshake). */
  | "https_responded"
  /** insecure: ÚNICA evidência positiva aceita — TLS não sobe e o mesmo host serve em http. */
  | "no_tls_listener_http_serves"
  | "https_failed_http_also_failed"
  | "http_redirects_to_https"
  | "https_timeout"
  | "https_dns_failure"
  | "https_network_failure";

export interface HttpsCheck {
  status: HttpsStatus;
  reason: HttpsReason;
}

/** Só falha de TLS/porta fechada justifica sondar http — timeout/DNS não provam nada. */
export function needsHttpProbe(failure: FetchFailure): boolean {
  return failure === "tls" || failure === "refused";
}

function isRedirectToHttps(probe: Probe): boolean {
  if (probe.kind !== "response") return false;
  const isRedirectStatus = probe.status >= 300 && probe.status <= 399;
  if (isRedirectStatus && /^https:\/\//i.test((probe.location ?? "").trim())) return true;
  return /^https:\/\//i.test((probe.finalUrl ?? "").trim());
}

/**
 * Decide o estado de HTTPS a partir das sondagens. PURA — sem rede.
 *
 * `insecure` exige evidência positiva de ausência: o https falhou por TLS/porta
 * fechada E o http do mesmo host respondeu. Qualquer outro caminho (timeout,
 * DNS, bloqueio, http também fora do ar, ou http redirecionando para https) é
 * `unknown` — e unknown nunca vira pain.
 */
export function classifyHttps(https: Probe, http: Probe | null): HttpsCheck {
  if (https.kind === "response") {
    return https.status > 0
      ? { status: "secure", reason: "https_responded" }
      : { status: "unknown", reason: "https_network_failure" };
  }

  if (!needsHttpProbe(https.failure)) {
    const reason: HttpsReason =
      https.failure === "timeout"
        ? "https_timeout"
        : https.failure === "dns"
          ? "https_dns_failure"
          : "https_network_failure";
    return { status: "unknown", reason };
  }

  if (!http || http.kind === "failure" || http.status <= 0) {
    return { status: "unknown", reason: "https_failed_http_also_failed" };
  }
  if (isRedirectToHttps(http)) {
    // O site QUER https (redireciona para lá): nossa sonda é que não chegou.
    return { status: "unknown", reason: "http_redirects_to_https" };
  }
  return { status: "insecure", reason: "no_tls_listener_http_serves" };
}

async function probe(url: string, ms: number): Promise<Probe> {
  try {
    const res = await fetchWithTimeout(url, ms, {
      redirect: "follow",
      headers: { "user-agent": UA },
    });
    return {
      kind: "response",
      status: res.status,
      location: res.headers.get("location"),
      finalUrl: res.url || null,
    };
  } catch (err) {
    return { kind: "failure", failure: classifyFetchError(err) };
  }
}

/**
 * Estado do HTTPS de um site. Nunca devolve "insecure" por falha de rede — ver
 * `classifyHttps`. O http só é sondado quando o https falhou de um jeito que
 * pode significar ausência de TLS (`needsHttpProbe`); nos demais casos nem vale
 * o request.
 */
export async function checkHttps(url: string): Promise<HttpsCheck> {
  const host = url.replace(/^https?:\/\//, "");
  const httpsProbe = await probe(`https://${host}`, HTTPS_TIMEOUT_MS);
  if (httpsProbe.kind === "response" || !needsHttpProbe(httpsProbe.failure)) {
    return classifyHttps(httpsProbe, null);
  }
  const httpProbe = await probe(`http://${host}`, HTTP_FALLBACK_TIMEOUT_MS);
  return classifyHttps(httpsProbe, httpProbe);
}

const JUNK_EMAIL =
  /(sentry|example\.(com|org)|wixpress|godaddy|googleapis|schema\.org|w3\.org|\.png|\.jpg|@x\.com)/i;

/** Extract a contact email from the business's own website (free, legit). Prefers role/same-domain. */
export async function extractEmail(url: string): Promise<string | null> {
  const host = url.replace(/^https?:\/\//, "");
  try {
    const res = await fetchWithTimeout(`https://${host}`, 8000, {
      headers: { "user-agent": UA },
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

// ---------------------------------------------------------------------------
// PageSpeed — mesma régua: não medido ≠ ruim
// ---------------------------------------------------------------------------

export interface PageSpeed {
  /** Lighthouse performance 0–1. `null` = não medido (não é "lento"). */
  perf: number | null;
  /** Auditoria de viewport. `null` = ausente/inconclusiva (não é "não-mobile"). */
  mobileFriendly: boolean | null;
}

/** Abaixo disso o site é lento o bastante para virar argumento. */
export const SLOW_PERF_THRESHOLD = 0.5;

function prop(obj: unknown, key: string): unknown {
  return typeof obj === "object" && obj !== null ? (obj as Record<string, unknown>)[key] : undefined;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Lê a resposta do PageSpeed Insights. PURA — recebe o JSON já parseado.
 * `null` = a medição não aconteceu (sem lighthouseResult, runtimeError do
 * Lighthouse, ou nenhuma das duas métricas presente). Uma auditoria ausente
 * vira `null` no campo, nunca `false`.
 */
export function parsePageSpeed(data: unknown): PageSpeed | null {
  const lr = prop(data, "lighthouseResult");
  if (lr === undefined || lr === null) return null;

  const runtimeErrorCode = prop(prop(lr, "runtimeError"), "code");
  if (typeof runtimeErrorCode === "string" && runtimeErrorCode !== "NO_ERROR") return null;

  const rawPerf = finiteNumber(prop(prop(prop(lr, "categories"), "performance"), "score"));
  const perf = rawPerf !== null && rawPerf >= 0 && rawPerf <= 1 ? rawPerf : null;

  const viewport = finiteNumber(prop(prop(prop(lr, "audits"), "viewport"), "score"));
  // Auditoria binária: 1 passa, 0 falha. Qualquer outra coisa (ou ausente,
  // incluindo scoreDisplayMode "notApplicable" com score null) = desconhecido.
  const mobileFriendly = viewport === null ? null : viewport >= 1 ? true : viewport <= 0 ? false : null;

  if (perf === null && mobileFriendly === null) return null;
  return { perf, mobileFriendly };
}

/** Sinal `slow`: só com performance medida abaixo do limiar. */
export function isSlow(ps: PageSpeed | null): boolean {
  return ps !== null && ps.perf !== null && ps.perf < SLOW_PERF_THRESHOLD;
}

/** Sinal `notMobile`: só com auditoria de viewport medida e REPROVADA. */
export function isNotMobile(ps: PageSpeed | null): boolean {
  return ps?.mobileFriendly === false;
}

/** Google PageSpeed Insights (mobile). `null` = não medido (nunca "ruim"). */
export async function fetchPageSpeed(url: string, key?: string): Promise<PageSpeed | null> {
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=mobile&category=performance` +
    (key ? `&key=${key}` : "");
  try {
    const res = await fetchWithTimeout(endpoint, 30000);
    if (!res.ok) return null;
    return parsePageSpeed(await res.json());
  } catch {
    return null;
  }
}
