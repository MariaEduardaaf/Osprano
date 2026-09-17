import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, type Locale, type TemplateDict } from "../src/lib/preview-i18n.ts";
import { TEMPLATE_IDS } from "../convex/lib/site.ts";

const LOCALES = Object.keys(DICTS) as Locale[];

/** Toda a copy de um modelo num idioma, com a função de cidade materializada. */
function templateCopy(d: TemplateDict): string[] {
  return [...Object.values(d).filter((v): v is string => typeof v === "string"), d.inCity("Madrid")];
}

test("templates-i18n: os 10 idiomas têm os 4 modelos com as mesmas chaves", () => {
  const keys = Object.keys(DICTS.en.templates.mesa).sort();
  assert.ok(keys.length >= 16, `TemplateDict com poucas chaves: ${keys.join(", ")}`);
  for (const l of LOCALES) {
    assert.deepEqual(Object.keys(DICTS[l].templates).sort(), [...TEMPLATE_IDS].sort(), `${l}: modelos faltando`);
    for (const t of TEMPLATE_IDS) {
      assert.deepEqual(Object.keys(DICTS[l].templates[t]).sort(), keys, `${l}.templates.${t} fora de paridade`);
      for (const [k, v] of Object.entries(DICTS[l].templates[t])) {
        if (typeof v === "string") assert.ok(v.trim().length > 0, `${l}.templates.${t}.${k} vazio`);
      }
    }
  }
});

test("templates-i18n: nenhum texto padrão contém dígito (sem horário, preço ou ano inventado)", () => {
  // O preview é público e leva o nome do negócio real. Um "desde 1998", um
  // "9h às 19h" ou um "a partir de 30" no texto padrão seria fato inventado
  // sobre o negócio de terceiro. Dados assim só entram pelo SiteContent salvo.
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      for (const s of templateCopy(DICTS[l].templates[t])) {
        assert.equal(/\d/.test(s), false, `${l}.templates.${t}: ${JSON.stringify(s)}`);
      }
    }
  }
});

test("templates-i18n: nenhum texto padrão afirma superlativo, antiguidade ou cobertura de região", () => {
  const claim =
    /\b(best|beste|bäst|bästa|bedste|melhor|mejor|migliore|meilleur|meilleure|since|desde|seit|sedan|siden|depuis|sinds|region|região|región|regione|regio|Umgebung)\b/i;
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      for (const s of templateCopy(DICTS[l].templates[t])) {
        assert.equal(claim.test(s), false, `${l}.templates.${t}: ${JSON.stringify(s)}`);
      }
    }
  }
});

test("templates-i18n: inCity só nomeia a cidade", () => {
  for (const l of LOCALES) {
    for (const t of TEMPLATE_IDS) {
      const s = DICTS[l].templates[t].inCity("Lugano");
      assert.ok(s.includes("Lugano"), `${l}.${t}.inCity não interpola`);
      assert.ok(s.length <= "Lugano".length + 6, `${l}.${t}.inCity diz mais que a cidade: ${s}`);
    }
  }
});

test("templates-i18n: o francês dos modelos é francês, não português nem inglês", () => {
  for (const t of TEMPLATE_IDS) {
    const body = templateCopy(DICTS.fr.templates[t]).join(" | ");
    assert.equal(body.match(/Venha|Horário|Reservar|Fechado|Closed|Book a|Gallery/), null, body);
    assert.equal(body.match(/ [?!:;]/), null, `espaço normal antes da pontuação: ${body}`);
  }
  assert.equal(DICTS.fr.templates.mesa.reserve, "Réserver une table");
  assert.equal(DICTS.fr.templates.estudio.closed, "Fermé");
});

test("templates-i18n: o rótulo dos itens muda por modelo e o resto é coerente", () => {
  const en = DICTS.en.templates;
  assert.equal(en.mesa.itemsHeading, "From the menu");
  assert.equal(en.estudio.itemsHeading, "Services");
  assert.equal(en.oficio.itemsHeading, "Services");
  assert.equal(en.vitrine.itemsHeading, "Highlights");
  assert.equal(en.oficio.galleryHeading, "Our work");
  // Cada modelo diz o próprio slogan: quatro textos, não um copiado.
  for (const l of LOCALES) {
    const taglines = TEMPLATE_IDS.map((t) => DICTS[l].templates[t].tagline);
    assert.equal(new Set(taglines).size, 4, `${l}: slogans repetidos`);
  }
});
