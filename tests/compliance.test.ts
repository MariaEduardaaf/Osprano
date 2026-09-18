import { test } from "node:test";
import assert from "node:assert/strict";
import { optOutFooter, senderIdentityFrom, unsubscribePageHtml } from "../convex/lib/compliance.ts";
import { hasUnsubscribeLink } from "../convex/lib/env.ts";

const URL = "https://x.convex.site/unsubscribe?token=abc";

/** Espaço insecável (U+00A0) — escrito como escape para ficar visível no diff. */
const NBSP = "\u00A0";

test("optOutFooter: English includes url + sender and starts with the separator", () => {
  const footer = optOutFooter("English", URL, "Ana");
  assert.ok(footer.includes("abc"));
  assert.ok(footer.includes("Ana"));
  assert.ok(footer.startsWith("\n\n—\n"));
});

test("optOutFooter: Dutch includes url and its own copy", () => {
  const footer = optOutFooter("Dutch", URL, "Ana");
  assert.ok(footer.includes(URL));
  assert.ok(footer.includes("Afmelden"));
});

test("optOutFooter: Swedish copy", () => {
  const footer = optOutFooter("Swedish", URL, "Ana");
  assert.ok(footer.includes("Avregistrera"));
});

test("optOutFooter: Norwegian copy", () => {
  const footer = optOutFooter("Norwegian", URL, "Ana");
  assert.ok(footer.includes("Meld deg av"));
});

test("optOutFooter: Spanish copy", () => {
  const footer = optOutFooter("Spanish", URL, "Ana");
  assert.ok(footer.includes(URL));
  assert.ok(footer.includes("baja"));
  assert.ok(footer.startsWith("\n\n—\n"));
});

test("optOutFooter: Italian copy", () => {
  const footer = optOutFooter("Italian", URL, "Ana");
  assert.ok(footer.includes(URL));
  assert.ok(footer.includes("annullare l'iscrizione"));
});

test("optOutFooter: o italiano não mistura Lei com imperativo de tu", () => {
  const footer = optOutFooter("Italian", URL, "Ana");
  // A primeira frase trata por Lei ("Non desidera"); "Annulla" é imperativo de TU
  // e quebrava a forma no meio do mesmo rodapé.
  assert.ok(footer.includes("Non desidera"), footer);
  assert.equal(footer.includes("Annulla "), false, footer);
});

test("optOutFooter: Portuguese copy", () => {
  const footer = optOutFooter("Portuguese", URL, "Ana");
  assert.ok(footer.includes("Cancelar"));
});

test("optOutFooter: German copy", () => {
  const footer = optOutFooter("German", URL, "Ana");
  assert.ok(footer.includes("Abmelden"));
});

test("optOutFooter: Danish copy", () => {
  const footer = optOutFooter("Danish", URL, "Ana");
  assert.ok(footer.includes("Afmeld"));
});

test("optOutFooter: o francês usa espaço insecável antes de ? e :", () => {
  const footer = optOutFooter("French", URL, "Ana");
  assert.ok(footer.includes(`e-mails${NBSP}?`), `sem NBSP antes do "?": ${JSON.stringify(footer)}`);
  assert.ok(
    footer.includes(`désabonner${NBSP}:`),
    `sem NBSP antes do ":": ${JSON.stringify(footer)}`,
  );
  // O defeito que isto trava: com espaço NORMAL, a quebra automática do email em
  // texto puro joga a pontuação sozinha para o começo da linha seguinte.
  assert.equal(footer.match(/ [?!:;]/), null, JSON.stringify(footer));
});

test("página de unsubscribe francesa: nenhum espaço normal antes de ? ! : ;", () => {
  // Só o texto, sem as tags (os `style=` têm `:` legítimo, e não são copy).
  const text = unsubscribePageHtml("French").replace(/<[^>]*>/g, " ");
  assert.ok(text.includes("désabonnement"), text);
  assert.equal(text.match(/ [?!:;]/), null, JSON.stringify(text));
});

test("optOutFooter: unknown language falls back to English", () => {
  const footer = optOutFooter("Klingon", URL, "Ana");
  assert.ok(footer.includes(URL));
});

test("senderIdentityFrom: extracts the display name", () => {
  assert.equal(senderIdentityFrom("Ana <ana@osprano.com>"), "Ana");
});

test("senderIdentityFrom: bare email passes through", () => {
  assert.equal(senderIdentityFrom("ana@osprano.com"), "ana@osprano.com");
});

test("senderIdentityFrom: trims surrounding whitespace", () => {
  assert.equal(senderIdentityFrom("  Team Osprano  <hi@osprano.com> "), "Team Osprano");
});

/* ------------------------------------------------------- idempotência do rodapé (bug UAT) */

/**
 * Espelha `withOptOutFooter` (convex/outreach.ts, impuro — importa `./_generated/server`,
 * fora do que este arquivo pode importar): só anexa o rodapé se `hasUnsubscribeLink` (mesmo
 * caminho+token usado em produção) ainda não achar o marcador no corpo. A composição real é
 * coberta pelo check de CLI ao vivo (ver relatório da correção); aqui trava a PROPRIEDADE —
 * as duas primitivas puras que a produção usa, compostas do mesmo jeito.
 */
function applyFooterIfMissing(body: string, token: string, lang: string, url: string, sender: string): string {
  if (hasUnsubscribeLink(body, token)) return body;
  return `${body}${optOutFooter(lang, url, sender)}`;
}

test("idempotência: aplicar o rodapé duas vezes (mesmo token) gera um só bloco", () => {
  const token = "tok123";
  const url = `https://x.convex.site/unsubscribe?token=${token}`;
  const once = applyFooterIfMissing("Olá, tudo bem?", token, "English", url, "Ana");
  const twice = applyFooterIfMissing(once, token, "English", url, "Ana");
  assert.equal(twice, once);
  assert.equal(once.match(/\n\n—\n/g)?.length, 1, once);
});

test("idempotência: editar o corpo ACIMA do rodapé mantém um só bloco", () => {
  const token = "tok123";
  const url = `https://x.convex.site/unsubscribe?token=${token}`;
  const withFooter = applyFooterIfMissing("Olá, tudo bem?", token, "English", url, "Ana");
  const footerStart = withFooter.indexOf("\n\n—\n");
  // Simula a usuária editando só o texto acima do rodapé, mantendo o bloco intacto.
  const edited = `Olá! Editei o corpo à mão.${withFooter.slice(footerStart)}`;
  const result = applyFooterIfMissing(edited, token, "English", url, "Ana");
  assert.equal(result, edited);
  assert.equal(result.match(/\n\n—\n/g)?.length, 1, result);
});
