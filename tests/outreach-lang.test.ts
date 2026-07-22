import { test } from "node:test";
import assert from "node:assert/strict";
import { LANG } from "../convex/lib/outreachAi.ts";
import { optOutFooter } from "../convex/lib/compliance.ts";
import {
  OPT_IN_MARKETS,
  SEARCHABLE_MARKETS,
  MARKETS,
  CITIES_BY_COUNTRY,
} from "../convex/lib/domain.ts";

const URL = "https://osprano.example/u/tok123";
const SENDER = "Osprano";
/** Idioma que garantidamente não existe no FOOTER_COPY → devolve o rodapé do fallback. */
const FALLBACK = optOutFooter("__idioma_inexistente__", URL, SENDER);

test("LANG cobre todos os mercados opt-in", () => {
  for (const cc of OPT_IN_MARKETS) {
    assert.equal(typeof LANG[cc], "string");
    assert.ok(LANG[cc].length > 0, `LANG faltando para ${cc}`);
  }
});

test("CH usa alemão (padrão suíço-alemão B2B)", () => {
  assert.equal(LANG.CH, "German");
});

test("LANG cobre todo mercado pesquisável", () => {
  for (const cc of SEARCHABLE_MARKETS) {
    assert.equal(typeof LANG[cc], "string", `LANG faltando para ${cc}`);
    assert.ok(LANG[cc].length > 0, `LANG vazio para ${cc}`);
  }
});

test("o fallback do optOutFooter é o rodapé em inglês (âncora do teste de paridade)", () => {
  assert.equal(FALLBACK, optOutFooter("English", URL, SENDER));
});

test("paridade LANG ↔ FOOTER_COPY: nenhum mercado cai silenciosamente no rodapé em inglês", () => {
  // FOOTER_COPY não é exportado: detectamos o fallback comparando a saída com a do inglês.
  // Mercados anglófonos (GB/IE) usam English de propósito — ali a igualdade é o esperado.
  for (const cc of SEARCHABLE_MARKETS) {
    const lang = LANG[cc];
    const footer = optOutFooter(lang, URL, SENDER);
    assert.ok(footer.includes(URL), `rodapé de ${cc} sem link de opt-out`);
    if (lang === "English") {
      assert.equal(footer, FALLBACK, `${cc} é anglófono e deveria usar o rodapé em inglês`);
    } else {
      assert.notEqual(
        footer,
        FALLBACK,
        `FOOTER_COPY não tem entrada para "${lang}" (${cc}) — o rodapé está caindo no inglês`,
      );
    }
  }
});

test("paridade estrutural: todo mercado pesquisável tem MARKETS e cidades suficientes", () => {
  for (const cc of SEARCHABLE_MARKETS) {
    const market = MARKETS[cc];
    assert.ok(market, `MARKETS faltando para ${cc}`);
    assert.equal(market.code, cc, `MARKETS.${cc}.code inconsistente`);
    const cities = CITIES_BY_COUNTRY[cc];
    assert.ok(Array.isArray(cities), `CITIES_BY_COUNTRY faltando para ${cc}`);
    assert.ok(
      cities.length >= 8,
      `CITIES_BY_COUNTRY.${cc} tem só ${cities.length} cidade(s) — mínimo 8`,
    );
    assert.equal(new Set(cities).size, cities.length, `CITIES_BY_COUNTRY.${cc} tem cidade repetida`);
  }
});
