import { test } from "node:test";
import assert from "node:assert/strict";
import { LANG, PT_PT, fallbackSubject } from "../convex/lib/outreachAi.ts";
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
