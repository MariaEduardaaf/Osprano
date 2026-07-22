import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isDevEnv,
  requireAppUrl,
  requireUnsubscribeBaseUrl,
  requireSenderFrom,
  unsubscribeUrlFrom,
  hasUnsubscribeLink,
  draftLinkIssue,
} from "../convex/lib/env.ts";

const PROD = { CONVEX_ENV: "production" } satisfies NodeJS.ProcessEnv;
const DEV = { CONVEX_ENV: "development" } satisfies NodeJS.ProcessEnv;

/* ---------------------------------------------------------------- isDevEnv */

test("isDevEnv: default-deny — env ausente NÃO é desenvolvimento", () => {
  assert.equal(isDevEnv({}), false);
  assert.equal(isDevEnv({ NODE_ENV: "development" }), false);
});

test("isDevEnv: só CONVEX_ENV=development liga", () => {
  assert.equal(isDevEnv(DEV), true);
  assert.equal(isDevEnv(PROD), false);
});

/* ------------------------------------------------------------- requireAppUrl */

test("requireAppUrl: sem APP_URL fora de dev, LANÇA (não devolve localhost)", () => {
  assert.throws(() => requireAppUrl(PROD), /APP_URL não configurada/);
  assert.throws(() => requireAppUrl({}), /APP_URL não configurada/);
});

test("requireAppUrl: erro diz qual variável falta e onde configurar", () => {
  assert.throws(() => requireAppUrl(PROD), /npx convex env set/);
});

test("requireAppUrl: em desenvolvimento cai no localhost (fluxo local intacto)", () => {
  assert.equal(requireAppUrl(DEV), "http://localhost:3000");
});

test("requireAppUrl: APP_URL explícita vence, sem barra no fim", () => {
  assert.equal(
    requireAppUrl({ ...PROD, APP_URL: "https://app.osprano.com/" }),
    "https://app.osprano.com",
  );
  assert.equal(requireAppUrl({ ...PROD, APP_URL: "  https://app.osprano.com  " }), "https://app.osprano.com");
});

test("requireAppUrl: localhost configurado FORA de dev é erro (link morto para o prospect)", () => {
  assert.throws(
    () => requireAppUrl({ ...PROD, APP_URL: "http://localhost:3000" }),
    /endereço local/,
  );
  assert.throws(() => requireAppUrl({ ...PROD, APP_URL: "http://127.0.0.1:3000" }), /endereço local/);
});

test("requireAppUrl: localhost configurado EM dev continua válido", () => {
  assert.equal(requireAppUrl({ ...DEV, APP_URL: "http://localhost:3001" }), "http://localhost:3001");
});

test("requireAppUrl: valor que não é URL http(s) é erro", () => {
  assert.throws(() => requireAppUrl({ ...PROD, APP_URL: "app.osprano.com" }), /APP_URL inválida/);
  assert.throws(
    () => requireAppUrl({ ...PROD, APP_URL: "ftp://app.osprano.com" }),
    /APP_URL inválida/,
  );
});

/* --------------------------------------------- requireUnsubscribeBaseUrl / URL */

test("requireUnsubscribeBaseUrl: ausente LANÇA — inclusive em desenvolvimento", () => {
  assert.throws(() => requireUnsubscribeBaseUrl(PROD), /CONVEX_SITE_URL não configurada/);
  assert.throws(() => requireUnsubscribeBaseUrl(DEV), /CONVEX_SITE_URL não configurada/);
  assert.throws(() => requireUnsubscribeBaseUrl({ ...PROD, CONVEX_SITE_URL: "   " }), /não configurada/);
});

test("requireUnsubscribeBaseUrl: normaliza barra no fim", () => {
  assert.equal(
    requireUnsubscribeBaseUrl({ CONVEX_SITE_URL: "https://x.convex.site/" }),
    "https://x.convex.site",
  );
});

test("unsubscribeUrlFrom: nunca produz `undefined/unsubscribe`", () => {
  assert.throws(() => unsubscribeUrlFrom("abc", PROD));
  assert.equal(
    unsubscribeUrlFrom("abc123", { CONVEX_SITE_URL: "https://x.convex.site" }),
    "https://x.convex.site/unsubscribe?token=abc123",
  );
});

test("hasUnsubscribeLink: casa pelo token, mesmo se a base mudou de forma", () => {
  const body = "corpo\n\n—\nSent by Ana. Unsubscribe: https://x.convex.site/unsubscribe?token=t1";
  assert.equal(hasUnsubscribeLink(body, "t1"), true);
  assert.equal(hasUnsubscribeLink(body, "t2"), false);
});

/* --------------------------------------------------------- requireSenderFrom */

test("requireSenderFrom: ausente fora de dev LANÇA (nada de identidade inventada)", () => {
  assert.throws(() => requireSenderFrom(PROD), /RESEND_FROM não configurada/);
});

test("requireSenderFrom: em dev usa o placeholder, sem quebrar o fluxo local", () => {
  assert.equal(requireSenderFrom(DEV), "Osprano");
});

test("requireSenderFrom: devolve o valor configurado", () => {
  assert.equal(
    requireSenderFrom({ ...PROD, RESEND_FROM: "Ana <ana@osprano.com>" }),
    "Ana <ana@osprano.com>",
  );
});

/* ------------------------------------------------------------ draftLinkIssue */

test("draftLinkIssue: rascunho legado com undefined/unsubscribe é barrado", () => {
  const body = "oi\n\n—\nUnsubscribe: undefined/unsubscribe?token=abc";
  assert.match(draftLinkIssue(body, PROD) ?? "", /undefined\/unsubscribe/);
  // Também em dev: esse link está quebrado em qualquer ambiente.
  assert.notEqual(draftLinkIssue(body, DEV), null);
});

test("draftLinkIssue: link localhost no corpo é barrado fora de dev", () => {
  const body = "veja: http://localhost:3000/p/tok";
  assert.match(draftLinkIssue(body, PROD) ?? "", /localhost/);
  assert.equal(draftLinkIssue(body, DEV), null);
});

test("draftLinkIssue: corpo limpo passa", () => {
  const body = "veja: https://app.osprano.com/p/tok\n\n—\nUnsubscribe: https://x.convex.site/unsubscribe?token=t";
  assert.equal(draftLinkIssue(body, PROD), null);
});
