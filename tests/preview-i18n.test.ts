import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DICTS, localeForCountry, localeForLead, type Locale } from "../src/lib/preview-i18n.ts";
import { SEARCHABLE_MARKETS } from "../convex/lib/domain.ts";
import { TEMPLATE_IDS } from "../convex/lib/site.ts";

const LOCALES = Object.keys(DICTS) as Locale[];

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
  assert.equal(localeForCountry("JP"), "en"); // país desconhecido: fallback
  assert.equal(localeForCountry(""), "en");
});

test("preview-i18n: a Suíça sai do alemão único e segue a região linguística", () => {
  // Romandia: francês. A forma LOCAL é a que chega pela descoberta (o select);
  // a inglesa é cobertura defensiva de criação manual, não a saída do Places.
  assert.equal(localeForLead("CH", "Geneva"), "fr");
  assert.equal(localeForLead("CH", "Genève"), "fr");
  assert.equal(localeForLead("CH", "Lausanne"), "fr");
  // Ticino: italiano.
  assert.equal(localeForLead("CH", "Lugano"), "it");
  assert.equal(localeForLead("CH", "Bellinzona"), "it");
  // Suíça alemã: alemão.
  assert.equal(localeForLead("CH", "Zurich"), "de");
  assert.equal(localeForLead("CH", "Zürich"), "de");
  assert.equal(localeForLead("CH", "Berne"), "de");
  // Fallback DELIBERADO: cidade ausente, vazia ou desconhecida vira alemão (~62%).
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

/**
 * Toda a copy de um locale, com as funções já materializadas: o que o prospect
 * realmente lê, no topo do dicionário e nos quatro modelos.
 */
function allCopy(locale: Locale): string[] {
  const d = DICTS[locale];
  const top = [
    ...Object.values(d).filter((v): v is string => typeof v === "string"),
    d.metaTitle({ name: "Casa Nova", city: "Madrid" }),
    d.metaDescription({ name: "Casa Nova", city: "Madrid" }),
    d.metaDescription({ name: "Casa Nova", city: null }),
  ];
  const nested = TEMPLATE_IDS.flatMap((t) => {
    const td = d.templates[t];
    return [
      ...Object.values(td).filter((v): v is string => typeof v === "string"),
      ...[...td.values, ...td.steps].flatMap((b) => [b.title, b.body]),
      td.inCity("Madrid"),
    ];
  });
  return [...top, ...nested];
}

/** Slogan, "sobre", valores e passos: o texto corrido que se apresenta como fala do negócio. */
function proseCopy(locale: Locale): string[] {
  return TEMPLATE_IDS.flatMap((t) => {
    const td = DICTS[locale].templates[t];
    return [td.tagline, td.about, ...[...td.values, ...td.steps].map((b) => b.body)];
  });
}

test("preview-i18n: nenhum dicionário afirma horário de funcionamento", () => {
  // Horário só existe como DADO (SiteContent.hours) e só aparece quando ela
  // preencheu. No dicionário há apenas o RÓTULO da seção (templates.*.hoursHeading);
  // no topo do PreviewDict não pode voltar chave de horário, e nenhuma copy pode
  // trazer um valor com cara de horário.
  const hoursWord =
    /hour|horári|horario|orari|horaire|öppettid|åpningstid|åbningstid|openingstijd|öffnungszeit/i;
  // "9:00-19:00", "9h00", "9am", "9-19 Uhr": valor com cara de horário.
  const hoursValue = /\d{1,2}\s*[:.h]\s*\d{2}|\b\d{1,2}\s*(am|pm)\b|\bUhr\b/i;
  for (const l of LOCALES) {
    for (const key of Object.keys(DICTS[l])) {
      assert.equal(hoursWord.test(key), false, `${l}: chave de horário no topo do dicionário (${key})`);
    }
    for (const s of allCopy(l)) {
      assert.equal(hoursValue.test(s), false, `${l}: copy afirma horário: ${JSON.stringify(s)}`);
    }
    for (const s of proseCopy(l)) {
      assert.equal(hoursWord.test(s), false, `${l}: slogan/sobre promete horário: ${JSON.stringify(s)}`);
    }
  }
});

test("preview-i18n: a copy não afirma localização que a base não tem", () => {
  // Do lead só se sabe a CIDADE. "Em pleno centro de X" / "no coração da cidade"
  // é endereço inventado: boa parte dos leads fica em bairro ou periferia.
  const centreClaim =
    /pleno centro|pieno centro|plein centre|centro de|centre of|centre de|centrum|zentrum|herzen der stadt|heart of|cœur de|cuore della|corazón de|coração|mitt i stan|mitt i centrala|midt i sentrum|midt i byen/i;
  for (const l of LOCALES) {
    for (const s of allCopy(l)) {
      assert.equal(centreClaim.test(s), false, `${l}: afirma centralidade: ${JSON.stringify(s)}`);
    }
  }
});

test("preview-i18n: todos os locales têm as mesmas chaves, inclusive templates.<id>.*", () => {
  const keys = Object.keys(DICTS.en).sort();
  const nestedKeys = Object.keys(DICTS.en.templates.mesa).sort();
  for (const l of LOCALES) {
    assert.deepEqual(Object.keys(DICTS[l]).sort(), keys, `locale ${l} fora de paridade`);
    for (const t of TEMPLATE_IDS) {
      assert.deepEqual(Object.keys(DICTS[l].templates[t]).sort(), nestedKeys, `${l}.templates.${t} fora de paridade`);
    }
  }
});

test("preview-i18n: as chaves do template único não voltam", () => {
  for (const key of ["heroSubtitle", "featureQualityTitle", "featureLocationBodyWithCity", "visitHeading", "visitBody"]) {
    assert.equal(key in DICTS.en, false, `${key} voltou ao topo do dicionário`);
  }
});

test("preview-i18n: todo mercado pesquisável tem dicionário completo (paridade)", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  for (const cc of SEARCHABLE_MARKETS) {
    const locale = localeForCountry(cc);
    const dict = DICTS[locale];
    assert.ok(dict, `mercado ${cc} sem dicionário para "${locale}"`);
    assert.deepEqual(Object.keys(dict).sort(), enKeys, `mercado ${cc} (locale ${locale}) com chaves faltando`);
    // Um mercado novo sem tradução cairia em "en" silenciosamente: só GB/IE podem.
    if (locale === "en") {
      assert.ok(["GB", "IE"].includes(cc), `mercado ${cc} caiu no fallback "en" sem tradução`);
    }
    for (const s of allCopy(locale)) assert.ok(s.trim().length > 0, `${locale}: copy vazia`);
  }
});

test("preview-i18n: os três idiomas da Suíça têm dicionário completo e não-vazio", () => {
  const enKeys = Object.keys(DICTS.en).sort();
  // Uma cidade por região: o que o lead suíço real abre precisa estar traduzido.
  for (const city of ["Geneva", "Lugano", "Zurich", undefined]) {
    const locale = localeForLead("CH", city);
    assert.notEqual(locale, "en", `CH/${city} caiu no fallback "en"`);
    assert.deepEqual(Object.keys(DICTS[locale]).sort(), enKeys, `CH/${city} (${locale}) com chaves faltando`);
    for (const s of allCopy(locale)) assert.ok(s.trim().length > 0, `${locale}: copy vazia`);
  }
});

test("preview-i18n: o dicionário francês está em francês, não em português", () => {
  // Guarda contra copiar/colar do dicionário pt: as duas línguas se parecem o
  // bastante para um erro passar despercebido em revisão.
  const body = allCopy("fr").join(" | ");
  assert.equal(body.match(/Ligar|Venha|Horário|Telefone|avaliações|Qualidade|Reservar mesa/), null, body);
  assert.ok(DICTS.fr.call === "Appeler" && DICTS.fr.phoneLabel === "Téléphone");
  assert.equal(DICTS.fr.templates.mesa.tagline, "Une table dressée avec soin");
});

test("preview-i18n: a copy francesa nunca usa espaço normal antes de ? ! : ;", () => {
  // Em francês essa pontuação leva espaço INSECÁVEL (U+00A0). Com espaço normal a
  // quebra de linha joga o sinal sozinho para o começo da linha. Vale também para
  // os quatro modelos.
  for (const s of allCopy("fr")) {
    assert.equal(s.match(/ [?!:;]/), null, `espaço normal antes da pontuação: ${JSON.stringify(s)}`);
  }
});

test("preview-i18n: funções interpoladas incluem os argumentos", () => {
  for (const l of LOCALES) {
    const t = DICTS[l].metaTitle({ name: "Casa Nova", city: "Madrid" });
    assert.ok(t.includes("Casa Nova") && t.includes("Madrid"), `${l}.metaTitle não interpola`);
    const d = DICTS[l].metaDescription({ name: "Casa Nova", city: "Madrid" });
    assert.ok(d.includes("Casa Nova") && d.includes("Madrid"), `${l}.metaDescription não interpola`);
    assert.ok(DICTS[l].metaDescription({ name: "Casa Nova", city: null }).includes("Casa Nova"));
    for (const id of TEMPLATE_IDS) {
      assert.ok(DICTS[l].templates[id].inCity("Madrid").includes("Madrid"), `${l}.${id}.inCity não interpola`);
    }
  }
});

/* ------------------------------------------------ guardas na fonte dos modelos */

const TEMPLATE_FILES = ["mesa", "estudio", "oficio", "vitrine"] as const;

/** Fonte sem comentários: o que é RENDERIZADO, não o que se explica sobre ele. */
function source(name: string): string {
  const src = readFileSync(new URL(`../src/components/site-templates/${name}.tsx`, import.meta.url), "utf8");
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("site-templates: nenhuma string PT hardcoded nos modelos", () => {
  for (const f of [...TEMPLATE_FILES, "shared"]) {
    assert.equal(source(f).match(/Venha|Tradição|Seg–Sáb|Reservar|Fechado/), null, `${f}.tsx com texto PT fixo`);
  }
});

test("site-templates: horário, preço e itens só saem de view.*, nunca de tr.*", () => {
  // Foi assim que um horário inventado entrou no template antigo: valor vindo do
  // dicionário num bloco que se apresenta como registro do negócio.
  for (const f of TEMPLATE_FILES) {
    const code = source(f);
    for (const m of code.match(/hours=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "hours={view.hours}", `${f}.tsx: ${m}`);
    }
    for (const m of code.match(/items=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "items={view.items}", `${f}.tsx: ${m}`);
    }
    for (const m of code.match(/urls=\{[^}]*\}/g) ?? []) {
      assert.equal(m, "urls={view.galleryUrls}", `${f}.tsx: ${m}`);
    }
  }
  for (const f of [...TEMPLATE_FILES, "shared"]) {
    const code = source(f);
    // Sem separador "." aqui: classe Tailwind (`tracking-[0.22em]`) daria falso positivo.
    assert.equal(
      code.match(/\b\d{1,2}\s*[:h]\s*\d{2}\b|\b\d{1,2}\s*(am|pm)\b|\d{1,2}[:h]\d{2}\s*[-]/i),
      null,
      `${f}.tsx com horário fixo`,
    );
    for (const dd of code.match(/<dd[^>]*>[\s\S]*?<\/dd>/g) ?? []) {
      assert.equal(dd.match(/\btr\./), null, `${f}.tsx: <dd> com valor do dicionário: ${dd}`);
    }
  }
});

test("site-templates: container queries, sem unidade de viewport nem sticky/fixed", () => {
  // A prévia ao vivo e as miniaturas mostram o modelo num div menor que a janela
  // (spec, Decisões): media query de viewport daria o layout errado.
  assert.match(source("shared"), /className="@container /, "a raiz perdeu o @container");
  for (const f of [...TEMPLATE_FILES, "shared", "index", "template-thumb"]) {
    const code = source(f);
    assert.equal(code.match(/\b(min-h|h|w|max-h|max-w)-(dvh|svh|lvh|vh|vw|screen)\b/), null, `${f}.tsx usa viewport`);
    assert.equal(code.match(/\b\d+(dvh|svh|lvh|vh|vw)\b/), null, `${f}.tsx usa unidade de viewport`);
    assert.equal(code.match(/\b(sticky|fixed)\b/), null, `${f}.tsx usa sticky/fixed`);
    // Variante de VIEWPORT (sm:, md:, lg:) fora das de contêiner (@sm:, @md:, @lg:).
    assert.equal(code.match(/[\s"`][a-z]*(?<!@)\b(sm|md|lg|xl|2xl):[a-z]/), null, `${f}.tsx usa variante de viewport`);
  }
});

test("site-templates: mapa só com endereço, lazy e com título localizado; valores e passos só do dicionário", () => {
  const shared = source("shared");
  // Cidade sozinha não vira mapa: seria a cidade inteira no lugar do negócio.
  assert.match(shared, /mapEmbedUrl\(view\.address, view\.city\)/, "MapEmbed não parte do endereço");
  assert.match(shared, /<iframe[\s\S]*?loading="lazy"[\s\S]*?\/>/, "iframe do mapa sem loading=lazy");
  assert.match(shared, /<iframe[\s\S]*?title=\{tr\.mapTitle\}[\s\S]*?\/>/, "iframe do mapa sem title localizado");
  for (const f of TEMPLATE_FILES) {
    const code = source(f);
    assert.match(code, /<BigFooter/, `${f}.tsx sem o rodapé completo`);
    assert.equal(code.match(/<Footer\b/), null, `${f}.tsx ainda usa o Footer mínimo`);
    for (const m of code.match(/values=\{[^}]*\}/g) ?? []) assert.equal(m, "values={tr.values}", `${f}.tsx: ${m}`);
    for (const m of code.match(/steps=\{[^}]*\}/g) ?? []) assert.equal(m, "steps={tr.steps}", `${f}.tsx: ${m}`);
    assert.match(code, /<RatingBand/, `${f}.tsx sem faixa de avaliação`);
    assert.match(code, /<MapEmbed/, `${f}.tsx sem mapa`);
  }
  // White-label: o site do prospect nunca cita a Osprano.
  for (const f of [...TEMPLATE_FILES, "shared"]) {
    assert.equal(source(f).match(/osprano/i), null, `${f}.tsx cita a Osprano`);
  }
});

test("site-templates: foto padrão nunca leva o nome do negócio no alt", () => {
  for (const f of TEMPLATE_FILES) {
    const code = source(f);
    for (const m of code.match(/src=\{photos\.g[12]\}[^/]*alt=\{?"?[^"}]*"?\}?/g) ?? []) {
      assert.match(m, /alt=""/, `${f}.tsx: decoração com alt não vazio: ${m}`);
    }
    assert.match(code, /alt=\{heroAlt\(view\)\}/, `${f}.tsx: hero sem heroAlt`);
  }
});
