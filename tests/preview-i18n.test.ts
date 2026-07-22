import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DICTS, localeForCountry } from "../src/lib/preview-i18n.ts";
import { SEARCHABLE_MARKETS } from "../convex/lib/domain.ts";

test("preview-i18n: countryCode mapeia para o locale correto", () => {
  assert.equal(localeForCountry("GB"), "en");
  assert.equal(localeForCountry("IE"), "en");
  assert.equal(localeForCountry("NL"), "nl");
  assert.equal(localeForCountry("SE"), "sv");
  assert.equal(localeForCountry("NO"), "no");
  // Mercados opt-in: a prévia fala o mesmo idioma do script de ligação/email.
  assert.equal(localeForCountry("ES"), "es");
  assert.equal(localeForCountry("IT"), "it");
  assert.equal(localeForCountry("PT"), "pt");
  assert.equal(localeForCountry("DE"), "de");
  assert.equal(localeForCountry("CH"), "de"); // alemão padrão para B2B suíço
  assert.equal(localeForCountry("DK"), "da");
  assert.equal(localeForCountry("gb"), "en"); // case-insensitive
  assert.equal(localeForCountry("de"), "de"); // case-insensitive
  assert.equal(localeForCountry("JP"), "en"); // país desconhecido → fallback
  assert.equal(localeForCountry(""), "en");
});

test("preview-i18n: todos os locales têm as mesmas chaves", () => {
  const keys = Object.keys(DICTS.en).sort();
  for (const l of Object.keys(DICTS) as (keyof typeof DICTS)[]) {
    assert.deepEqual(Object.keys(DICTS[l]).sort(), keys, `locale ${l} fora de paridade`);
  }
});

test("preview-i18n: todo mercado pesquisável tem dicionário completo (paridade)", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  for (const cc of SEARCHABLE_MARKETS) {
    const locale = localeForCountry(cc);
    const dict = DICTS[locale];
    assert.ok(dict, `mercado ${cc} → locale "${locale}" sem dicionário`);
    assert.deepEqual(
      Object.keys(dict).sort(),
      enKeys,
      `mercado ${cc} (locale ${locale}) com chaves faltando`,
    );
    // Um mercado novo sem tradução cairia em "en" silenciosamente: só GB/IE podem.
    if (locale === "en") {
      assert.ok(["GB", "IE"].includes(cc), `mercado ${cc} caiu no fallback "en" sem tradução`);
    }
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value === "string") {
        assert.ok(value.trim().length > 0, `${locale}.${key} vazio`);
      }
    }
  }
});

test("preview-i18n: funções interpoladas incluem os argumentos", () => {
  assert.ok(DICTS.sv.featureLocationBodyWithCity("Stockholm").includes("Stockholm"));
  const body = DICTS.en.visitBody({ name: "Joe", category: "café", city: "London" });
  assert.ok(body.includes("Joe") && body.includes("London"));

  for (const l of Object.keys(DICTS) as (keyof typeof DICTS)[]) {
    assert.ok(
      DICTS[l].featureLocationBodyWithCity("Madrid").includes("Madrid"),
      `${l}.featureLocationBodyWithCity não interpola a cidade`,
    );
    const b = DICTS[l].visitBody({ name: "Casa Nova", category: "café", city: "Madrid" });
    assert.ok(b.includes("Casa Nova") && b.includes("Madrid"), `${l}.visitBody não interpola`);
    const noCity = DICTS[l].visitBody({ name: "Casa Nova", category: null, city: null });
    assert.ok(noCity.includes("Casa Nova"), `${l}.visitBody sem cidade não interpola o nome`);
  }
});

test("preview-site: nenhuma string PT hardcoded permanece", () => {
  const src = readFileSync(new URL("../src/components/preview-site.tsx", import.meta.url), "utf8");
  assert.equal(src.match(/Venha|Tradição|Seg–Sáb/), null);
});
