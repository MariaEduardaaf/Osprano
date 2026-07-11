import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, localeForCountry } from "../src/lib/preview-i18n.ts";

test("preview-i18n: countryCode mapeia para o locale correto", () => {
  assert.equal(localeForCountry("GB"), "en");
  assert.equal(localeForCountry("IE"), "en");
  assert.equal(localeForCountry("NL"), "nl");
  assert.equal(localeForCountry("SE"), "sv");
  assert.equal(localeForCountry("NO"), "no");
  assert.equal(localeForCountry("DE"), "en"); // fallback
  assert.equal(localeForCountry("gb"), "en"); // case-insensitive
});

test("preview-i18n: todos os locales têm as mesmas chaves", () => {
  const keys = Object.keys(DICTS.en).sort();
  for (const l of ["nl", "sv", "no"] as const) {
    assert.deepEqual(Object.keys(DICTS[l]).sort(), keys);
  }
});

test("preview-i18n: funções interpoladas incluem os argumentos", () => {
  assert.ok(DICTS.sv.featureLocationBodyWithCity("Stockholm").includes("Stockholm"));
  const body = DICTS.en.visitBody({ name: "Joe", category: "café", city: "London" });
  assert.ok(body.includes("Joe") && body.includes("London"));
});
