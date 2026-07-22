import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DICTS, localeForCountry, localeForLead } from "../src/lib/preview-i18n.ts";
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

test("preview-i18n: a Suíça sai do alemão único e segue a região linguística", () => {
  // Romandia → francês. A forma LOCAL é a que chega pela descoberta (o select);
  // a inglesa é cobertura defensiva de criação manual, não a saída do Places.
  assert.equal(localeForLead("CH", "Geneva"), "fr");
  assert.equal(localeForLead("CH", "Genève"), "fr");
  assert.equal(localeForLead("CH", "Lausanne"), "fr");
  // Ticino → italiano.
  assert.equal(localeForLead("CH", "Lugano"), "it");
  assert.equal(localeForLead("CH", "Bellinzona"), "it");
  // Suíça alemã → alemão.
  assert.equal(localeForLead("CH", "Zurich"), "de");
  assert.equal(localeForLead("CH", "Zürich"), "de");
  assert.equal(localeForLead("CH", "Berne"), "de");
  // Fallback DELIBERADO: cidade ausente, vazia ou desconhecida → alemão (~62%).
  assert.equal(localeForLead("CH", undefined), "de");
  assert.equal(localeForLead("CH", null), "de");
  assert.equal(localeForLead("CH", ""), "de");
  assert.equal(localeForLead("CH", "Cidade Que Não Existe"), "de");
  assert.equal(localeForLead("ch", "Geneva"), "fr"); // case-insensitive no país
});

test("preview-i18n: fora da Suíça a cidade é ignorada", () => {
  // "Geneva" não pode arrastar um lead alemão/italiano/inglês para o francês.
  assert.equal(localeForLead("DE", "Geneva"), "de");
  assert.equal(localeForLead("IT", "Geneva"), "it");
  assert.equal(localeForLead("GB", "Lugano"), "en");
  assert.equal(localeForLead("PT", "Zurich"), "pt");
  // Sem cidade, localeForLead é idêntico a localeForCountry em todo mercado.
  for (const cc of SEARCHABLE_MARKETS) {
    assert.equal(localeForLead(cc), localeForCountry(cc), `${cc} divergiu sem cidade`);
  }
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

test("preview-i18n: os três idiomas da Suíça têm dicionário completo e não-vazio", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  // Uma cidade por região: o que o lead suíço real abre precisa estar traduzido.
  for (const city of ["Geneva", "Lugano", "Zurich", undefined]) {
    const locale = localeForLead("CH", city);
    const dict = DICTS[locale];
    assert.ok(dict, `CH/${city} → locale "${locale}" sem dicionário`);
    assert.notEqual(locale, "en", `CH/${city} caiu no fallback "en"`);
    assert.deepEqual(Object.keys(dict).sort(), enKeys, `CH/${city} (${locale}) com chaves faltando`);
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value === "string") {
        assert.ok(value.trim().length > 0, `${locale}.${key} vazio`);
      }
    }
  }
});

test("preview-i18n: o dicionário francês está em francês, não em português", () => {
  // Guarda contra copiar/colar do dicionário pt: as duas línguas se parecem o
  // bastante para um erro passar despercebido em revisão.
  const strings = Object.values(DICTS.fr).filter((v): v is string => typeof v === "string");
  const body = [
    ...strings,
    DICTS.fr.featureLocationBodyWithCity("Genève"),
    DICTS.fr.visitBody({ name: "Chez Marc", category: "boulangerie", city: "Genève" }),
    DICTS.fr.metaDescription({ name: "Chez Marc", city: "Genève" }),
  ].join(" | ");
  assert.equal(body.match(/Ligar|Venha|Horário|Telefone|avaliações|Qualidade/), null, body);
  assert.ok(DICTS.fr.call === "Appeler" && DICTS.fr.phoneLabel === "Téléphone");
});

test("preview-i18n: a copy francesa nunca usa espaço normal antes de ? ! : ;", () => {
  // Em francês essa pontuação leva espaço INSECÁVEL (U+00A0). Com espaço normal a
  // quebra de linha joga o sinal sozinho para o começo da linha — um leitor romando
  // nota na hora. Hoje nenhuma linha FR usa essa pontuação: o teste é a guarda de
  // quem escrever a próxima.
  const strings = Object.values(DICTS.fr).filter((v): v is string => typeof v === "string");
  const fr = [
    ...strings,
    DICTS.fr.featureLocationBodyWithCity("Genève"),
    DICTS.fr.visitBody({ name: "Chez Marc", category: "boulangerie", city: "Genève" }),
    DICTS.fr.visitBody({ name: "Chez Marc", category: null, city: null }),
    DICTS.fr.metaTitle({ name: "Chez Marc", city: "Genève" }),
    DICTS.fr.metaDescription({ name: "Chez Marc", city: "Genève" }),
  ];
  for (const s of fr) {
    assert.equal(s.match(/ [?!:;]/), null, `espaço normal antes da pontuação: ${JSON.stringify(s)}`);
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
