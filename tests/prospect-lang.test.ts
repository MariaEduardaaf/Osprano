import { test } from "node:test";
import assert from "node:assert/strict";
import { LANG, PT_PT, fallbackSubject, langForLead } from "../convex/lib/outreachAi.ts";
import { unsubscribePageHtml, optOutFooter } from "../convex/lib/compliance.ts";
import { SEARCHABLE_MARKETS } from "../convex/lib/domain.ts";

/** Idioma que garantidamente não existe nos mapas → devolve a copy de fallback (inglês). */
const UNKNOWN = "__idioma_inexistente__";

test("fallbackSubject: idioma desconhecido cai no inglês", () => {
  assert.equal(fallbackSubject(UNKNOWN, "Bar do Zé"), fallbackSubject("English", "Bar do Zé"));
  assert.ok(fallbackSubject(UNKNOWN, "Bar do Zé").includes("Bar do Zé"));
});

test("paridade LANG ↔ assunto de fallback: nenhum mercado recebe assunto em inglês", () => {
  for (const cc of SEARCHABLE_MARKETS) {
    const lang = LANG[cc];
    const subject = fallbackSubject(lang, "Acme");
    assert.ok(subject.includes("Acme"), `assunto de fallback de ${cc} sem o nome do negócio`);
    if (lang === "English") {
      assert.equal(subject, fallbackSubject(UNKNOWN, "Acme"), `${cc} é anglófono`);
    } else {
      assert.notEqual(
        subject,
        fallbackSubject(UNKNOWN, "Acme"),
        `sem assunto de fallback em "${lang}" (${cc}) — o assunto está saindo em inglês`,
      );
    }
  }
});

test("paridade LANG ↔ página de unsubscribe: nenhum mercado aterrissa em inglês", () => {
  const fallbackPage = unsubscribePageHtml(UNKNOWN);
  assert.equal(fallbackPage, unsubscribePageHtml("English"), "o fallback da página é o inglês");
  for (const cc of SEARCHABLE_MARKETS) {
    const lang = LANG[cc];
    const page = unsubscribePageHtml(lang);
    assert.ok(page.startsWith("<!doctype html><html lang="), `HTML malformado para ${cc}`);
    if (lang === "English") {
      assert.equal(page, fallbackPage, `${cc} é anglófono e deveria ver a página em inglês`);
    } else {
      assert.notEqual(
        page,
        fallbackPage,
        `sem página de unsubscribe em "${lang}" (${cc}) — o prospect aterrissa em inglês`,
      );
      assert.ok(!page.includes(`<html lang="en">`), `${cc} servindo <html lang="en">`);
    }
  }
});

test("PT é português EUROPEU em todo o caminho do prospect", () => {
  assert.equal(LANG.PT, PT_PT);
  assert.ok(PT_PT.includes("pt-PT"), "o valor do LANG precisa qualificar pt-PT dentro do prompt");
  assert.ok(!/brazil/i.test(PT_PT), "o idioma do prospect nunca é pt-BR");

  const footer = optOutFooter(LANG.PT, "https://x/u/tok", "Ana");
  assert.ok(footer.includes("subscrição"), "rodapé PT deve ser pt-PT ('subscrição')");
  assert.ok(!footer.includes("nossos emails"), "rodapé PT ainda em pt-BR");

  const page = unsubscribePageHtml(LANG.PT);
  assert.ok(page.includes(`<html lang="pt-PT">`), "a página PT precisa declarar lang=pt-PT");
});

test("o alias 'Portuguese' não cai no inglês (recebe a copy pt-PT)", () => {
  const url = "https://x/u/tok";
  assert.equal(optOutFooter("Portuguese", url, "Ana"), optOutFooter(LANG.PT, url, "Ana"));
  assert.equal(unsubscribePageHtml("Portuguese"), unsubscribePageHtml(LANG.PT));
});

// ---------------------------------------------------------------------------
// Suíça: o idioma é REGIONAL (o país é o único mercado multilíngue da base)
// ---------------------------------------------------------------------------

test("langForLead: a Suíça deriva o idioma da cidade, não do país", () => {
  // Nomes LOCAIS (o que a usuária escolhe no select da UI).
  assert.equal(langForLead({ countryCode: "CH", city: "Genève" }), "French");
  assert.equal(langForLead({ countryCode: "CH", city: "Lugano" }), "Italian");
  assert.equal(langForLead({ countryCode: "CH", city: "Zürich" }), "German");
  // Nomes em INGLÊS — cobertura defensiva de criação manual/colagem. NÃO é como o
  // lead de descoberta chega: places.ts grava `city: args.city` (a forma local do
  // select), e o `languageCode:"en"` só afeta displayName/formattedAddress.
  assert.equal(langForLead({ countryCode: "CH", city: "Geneva" }), "French");
  assert.equal(langForLead({ countryCode: "CH", city: "Zurich" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "Berne" }), "German");
});

test("langForLead: cidade suíça desconhecida/ausente cai no alemão (fallback deliberado)", () => {
  assert.equal(langForLead({ countryCode: "CH", city: "Vila Que Não Existe" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: null }), "German");
  assert.equal(langForLead({ countryCode: "CH" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "Lugano" }), LANG.IT);
  assert.equal(LANG.CH, "German", "LANG.CH continua sendo o padrão germanófono/fallback");
});

test("langForLead: fora da Suíça o idioma continua vindo só do país", () => {
  // Cidade francófona em país não-suíço não muda nada — a França NÃO virou mercado.
  assert.equal(langForLead({ countryCode: "DE", city: "Genève" }), "German");
  assert.equal(langForLead({ countryCode: "GB", city: "Lugano" }), "English");
  assert.equal(langForLead({ countryCode: "PT", city: "Porto" }), PT_PT);
  assert.equal(langForLead({ countryCode: "XX", city: "Nowhere" }), "English");
  assert.equal(langForLead({ countryCode: "" }), "English");
});

test("o prospect suíço francófono não cai no inglês em NENHUM ponto do caminho", () => {
  const url = "https://x/u/tok";
  const lang = langForLead({ countryCode: "CH", city: "Geneva" });
  assert.equal(lang, "French");

  // 1. assunto de fallback (corpo em francês + assunto em inglês = automação denunciada)
  assert.notEqual(
    fallbackSubject(lang, "Acme"),
    fallbackSubject(UNKNOWN, "Acme"),
    'sem assunto de fallback em "French" — o assunto sairia em inglês',
  );
  assert.ok(fallbackSubject(lang, "Acme").includes("Acme"));

  // 2. rodapé de opt-out
  const footer = optOutFooter(lang, url, "Ana");
  assert.notEqual(
    footer,
    optOutFooter(UNKNOWN, url, "Ana"),
    'FOOTER_COPY não tem entrada própria para "French" — o rodapé cairia no inglês',
  );
  assert.notEqual(footer, optOutFooter("German", url, "Ana"), "o rodapé francês está saindo alemão");
  assert.ok(footer.includes(url), "rodapé francês sem link de opt-out");

  // 3. página de confirmação do unsubscribe
  const page = unsubscribePageHtml(lang);
  assert.notEqual(
    page,
    unsubscribePageHtml(UNKNOWN),
    'sem página de unsubscribe em "French" — o prospect aterrissa em inglês',
  );
  assert.ok(page.includes(`<html lang="fr">`), "a página francesa precisa declarar lang=fr");
});

test("as três regiões suíças têm copy própria e distinta entre si", () => {
  const url = "https://x/u/tok";
  const langs = ["Geneva", "Lugano", "Zurich", "Cidade Desconhecida"].map((city) =>
    langForLead({ countryCode: "CH", city }),
  );
  assert.deepEqual(langs, ["French", "Italian", "German", "German"]);

  const pages = new Set(langs.map(unsubscribePageHtml));
  assert.equal(pages.size, 3, "as três regiões precisam de páginas distintas (fr/it/de)");
  for (const lang of langs) {
    assert.notEqual(unsubscribePageHtml(lang), unsubscribePageHtml(UNKNOWN), `${lang} em inglês`);
    assert.notEqual(optOutFooter(lang, url, "Ana"), optOutFooter(UNKNOWN, url, "Ana"), lang);
  }
});
