/**
 * Sinais de enriquecimento: "não consegui medir" NUNCA pode virar "está ruim".
 *
 * Estes testes cobrem SÓ a lógica pura de classificação (nada bate na rede):
 * dado o resultado observável de um fetch — resposta, timeout, erro de TLS,
 * bloqueio — qual sinal sai. O caminho real (`checkHttps`, `fetchPageSpeed`) é
 * uma casca fina em volta destas funções.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyFetchError,
  classifyHttps,
  needsHttpProbe,
  parsePageSpeed,
  isSlow,
  isNotMobile,
  SLOW_PERF_THRESHOLD,
  type Probe,
} from "../convex/lib/enrich.ts";
import { computeScore, type Signals } from "../convex/lib/domain.ts";

const ok = (status = 200, extra: { location?: string | null; finalUrl?: string | null } = {}): Probe => ({
  kind: "response",
  status,
  ...extra,
});

// ---------------------------------------------------------------------------
// classifyFetchError
// ---------------------------------------------------------------------------

test("classifyFetchError: AbortError (timeout do nosso AbortController) = timeout", () => {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  assert.equal(classifyFetchError(err), "timeout");
});

test("classifyFetchError: ETIMEDOUT embrulhado em cause = timeout", () => {
  const err = new Error("fetch failed", { cause: { code: "ETIMEDOUT" } });
  assert.equal(classifyFetchError(err), "timeout");
});

test("classifyFetchError: DNS não resolve = dns", () => {
  const err = new Error("fetch failed", {
    cause: { code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND padaria.co.uk" },
  });
  assert.equal(classifyFetchError(err), "dns");
});

test("classifyFetchError: erros de certificado/TLS = tls", () => {
  const cases = [
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "EPROTO",
    "ERR_SSL_WRONG_VERSION_NUMBER",
  ];
  for (const code of cases) {
    assert.equal(classifyFetchError(new Error("fetch failed", { cause: { code } })), "tls", code);
  }
});

test("classifyFetchError: conexão recusada na 443 = refused", () => {
  assert.equal(
    classifyFetchError(new Error("fetch failed", { cause: { code: "ECONNREFUSED" } })),
    "refused",
  );
});

test("classifyFetchError: erro genérico/desconhecido = network (balde conservador)", () => {
  assert.equal(classifyFetchError(new TypeError("fetch failed")), "network");
  assert.equal(classifyFetchError(new Error("socket hang up")), "network");
  assert.equal(classifyFetchError(undefined), "network");
  assert.equal(classifyFetchError({}), "network");
});

test("classifyFetchError: cause cíclica não estoura a pilha", () => {
  const err: { message: string; cause?: unknown } = { message: "boom" };
  err.cause = err;
  assert.equal(classifyFetchError(err), "network");
});

// ---------------------------------------------------------------------------
// needsHttpProbe — quando vale sondar http
// ---------------------------------------------------------------------------

test("needsHttpProbe: só falha de TLS/porta fechada justifica sondar http", () => {
  assert.equal(needsHttpProbe("tls"), true);
  assert.equal(needsHttpProbe("refused"), true);
  assert.equal(needsHttpProbe("timeout"), false);
  assert.equal(needsHttpProbe("dns"), false);
  assert.equal(needsHttpProbe("network"), false);
});

// ---------------------------------------------------------------------------
// classifyHttps — o coração do achado
// ---------------------------------------------------------------------------

test("classifyHttps: qualquer resposta sobre TLS = secure", () => {
  assert.deepEqual(classifyHttps(ok(200), null), { status: "secure", reason: "https_responded" });
  assert.equal(classifyHttps(ok(301), null).status, "secure");
  assert.equal(classifyHttps(ok(500), null).status, "secure");
});

test("classifyHttps: 403/429 de WAF sobre HTTPS é secure — o handshake aconteceu", () => {
  // Era o pior falso positivo: Cloudflare bloqueia o user-agent osprano/1.0 e o
  // sistema acusava o negócio de não ter HTTPS.
  assert.equal(classifyHttps(ok(403), null).status, "secure");
  assert.equal(classifyHttps(ok(429), null).status, "secure");
});

test("classifyHttps: timeout = unknown, nunca insecure", () => {
  const r = classifyHttps({ kind: "failure", failure: "timeout" }, null);
  assert.equal(r.status, "unknown");
  assert.equal(r.reason, "https_timeout");
});

test("classifyHttps: DNS lento/quebrado = unknown", () => {
  assert.equal(classifyHttps({ kind: "failure", failure: "dns" }, null).status, "unknown");
});

test("classifyHttps: falha de rede genérica = unknown", () => {
  assert.equal(classifyHttps({ kind: "failure", failure: "network" }, null).status, "unknown");
});

test("classifyHttps: erro de TLS + http servindo = insecure (única evidência positiva)", () => {
  const r = classifyHttps({ kind: "failure", failure: "tls" }, ok(200));
  assert.deepEqual(r, { status: "insecure", reason: "no_tls_listener_http_serves" });
});

test("classifyHttps: porta 443 recusada + http servindo = insecure", () => {
  assert.equal(classifyHttps({ kind: "failure", failure: "refused" }, ok(200)).status, "insecure");
});

test("classifyHttps: erro de TLS mas http também fora = unknown", () => {
  const r = classifyHttps({ kind: "failure", failure: "tls" }, { kind: "failure", failure: "timeout" });
  assert.deepEqual(r, { status: "unknown", reason: "https_failed_http_also_failed" });
});

test("classifyHttps: erro de TLS sem sondagem http = unknown", () => {
  assert.equal(classifyHttps({ kind: "failure", failure: "tls" }, null).status, "unknown");
});

test("classifyHttps: http redireciona para https (Location) = unknown, não insecure", () => {
  const r = classifyHttps(
    { kind: "failure", failure: "tls" },
    ok(301, { location: "https://padaria.co.uk/" }),
  );
  assert.deepEqual(r, { status: "unknown", reason: "http_redirects_to_https" });
});

test("classifyHttps: http redireciona para https (redirect seguido, finalUrl) = unknown", () => {
  const r = classifyHttps(
    { kind: "failure", failure: "tls" },
    ok(200, { finalUrl: "https://padaria.co.uk/" }),
  );
  assert.equal(r.status, "unknown");
});

test("classifyHttps: redirect http→http continua sendo evidência de site sem TLS", () => {
  const r = classifyHttps(
    { kind: "failure", failure: "tls" },
    ok(301, { location: "http://www.padaria.co.uk/", finalUrl: "http://www.padaria.co.uk/" }),
  );
  assert.equal(r.status, "insecure");
});

test("classifyHttps: nunca devolve insecure sem uma sondagem http bem-sucedida", () => {
  const failures = ["timeout", "dns", "tls", "refused", "network"] as const;
  const httpOutcomes: (Probe | null)[] = [
    null,
    { kind: "failure", failure: "timeout" },
    { kind: "failure", failure: "dns" },
    { kind: "failure", failure: "network" },
    ok(0),
  ];
  for (const failure of failures) {
    for (const http of httpOutcomes) {
      assert.notEqual(classifyHttps({ kind: "failure", failure }, http).status, "insecure");
    }
  }
});

// ---------------------------------------------------------------------------
// parsePageSpeed
// ---------------------------------------------------------------------------

test("parsePageSpeed: medição completa", () => {
  const data = {
    lighthouseResult: {
      categories: { performance: { score: 0.31 } },
      audits: { viewport: { score: 1 } },
    },
  };
  assert.deepEqual(parsePageSpeed(data), { perf: 0.31, mobileFriendly: true });
});

test("parsePageSpeed: viewport reprovado = mobileFriendly false (pain verificada)", () => {
  const data = {
    lighthouseResult: { categories: { performance: { score: 0.9 } }, audits: { viewport: { score: 0 } } },
  };
  assert.deepEqual(parsePageSpeed(data), { perf: 0.9, mobileFriendly: false });
});

test("parsePageSpeed: auditoria de viewport ausente = null, NÃO 'não-mobile'", () => {
  const data = { lighthouseResult: { categories: { performance: { score: 0.8 } }, audits: {} } };
  assert.deepEqual(parsePageSpeed(data), { perf: 0.8, mobileFriendly: null });
});

test("parsePageSpeed: viewport notApplicable (score null) = desconhecido", () => {
  const data = {
    lighthouseResult: {
      categories: { performance: { score: 0.8 } },
      audits: { viewport: { score: null, scoreDisplayMode: "notApplicable" } },
    },
  };
  assert.equal(parsePageSpeed(data)?.mobileFriendly, null);
});

test("parsePageSpeed: runtimeError do Lighthouse = nenhuma medição", () => {
  const data = {
    lighthouseResult: {
      runtimeError: { code: "ERRORED_DOCUMENT_REQUEST", message: "Lighthouse não carregou a página" },
      categories: { performance: { score: 0 } },
      audits: { viewport: { score: 0 } },
    },
  };
  assert.equal(parsePageSpeed(data), null);
});

test("parsePageSpeed: runtimeError NO_ERROR não invalida a medição", () => {
  const data = {
    lighthouseResult: {
      runtimeError: { code: "NO_ERROR" },
      categories: { performance: { score: 0.4 } },
      audits: { viewport: { score: 1 } },
    },
  };
  assert.deepEqual(parsePageSpeed(data), { perf: 0.4, mobileFriendly: true });
});

test("parsePageSpeed: resposta de erro/vazia/inesperada = null", () => {
  assert.equal(parsePageSpeed({ error: { code: 429, message: "quota" } }), null);
  assert.equal(parsePageSpeed({}), null);
  assert.equal(parsePageSpeed(null), null);
  assert.equal(parsePageSpeed("<html>429</html>"), null);
  assert.equal(parsePageSpeed({ lighthouseResult: { categories: {}, audits: {} } }), null);
});

test("parsePageSpeed: score fora da faixa 0–1 é descartado", () => {
  const data = {
    lighthouseResult: { categories: { performance: { score: 42 } }, audits: { viewport: { score: 1 } } },
  };
  assert.deepEqual(parsePageSpeed(data), { perf: null, mobileFriendly: true });
});

// ---------------------------------------------------------------------------
// isSlow / isNotMobile — a ponte para Signals
// ---------------------------------------------------------------------------

test("isSlow: só com performance medida abaixo do limiar", () => {
  assert.equal(isSlow({ perf: 0.2, mobileFriendly: true }), true);
  assert.equal(isSlow({ perf: SLOW_PERF_THRESHOLD, mobileFriendly: true }), false);
  assert.equal(isSlow({ perf: 0.9, mobileFriendly: true }), false);
  assert.equal(isSlow({ perf: null, mobileFriendly: true }), false); // não medido ≠ lento
  assert.equal(isSlow(null), false); // PageSpeed fora do ar ≠ lento
});

test("isNotMobile: só com auditoria medida e reprovada", () => {
  assert.equal(isNotMobile({ perf: null, mobileFriendly: false }), true);
  assert.equal(isNotMobile({ perf: null, mobileFriendly: true }), false);
  assert.equal(isNotMobile({ perf: null, mobileFriendly: null }), false); // desconhecido ≠ ruim
  assert.equal(isNotMobile(null), false);
});

// ---------------------------------------------------------------------------
// Regressão do achado: enriquecimento inteiramente fracassado não infla o score
// ---------------------------------------------------------------------------

test("regressão: site inalcançável não gera pain nem pontos (antes: +50 e 3 acusações)", () => {
  // Cenário real: Cloudflare bloqueia o user-agent, PageSpeed não responde.
  const httpsCheck = classifyHttps({ kind: "failure", failure: "timeout" }, null);
  const ps = parsePageSpeed({ error: { code: 500 } });

  const signals: Signals = {
    noSite: false,
    socialOnly: false,
    noHttps: httpsCheck.status === "insecure",
    notMobile: isNotMobile(ps),
    slow: isSlow(ps),
    sparseProfile: false,
  };

  assert.deepEqual(signals, {
    noSite: false,
    socialOnly: false,
    noHttps: false,
    notMobile: false,
    slow: false,
    sparseProfile: false,
  });
  assert.equal(computeScore(signals), 0);
});
