import { test } from "node:test";
import assert from "node:assert/strict";
import { dmMessage, type DmLead } from "../src/lib/dm-template.ts";
import { localeForLead, type Locale } from "../src/lib/preview-i18n.ts";

const MAN_CAVE: DmLead = {
  name: "Man cave barber",
  category: "barber_shop",
  city: "Bolton",
  rating: 4.9,
  reviewsCount: 242,
  countryCode: "GB",
};

test("dmMessage: EN com avaliações bate exatamente com o texto de referência da spec", () => {
  const msg = dmMessage(MAN_CAVE, { signature: "Duda" });
  assert.equal(
    msg,
    "Hi Man cave barber! I'm Duda, a web developer. I saw your reviews (4.9 with 242 of them, impressive) and I noticed you don't have a website yet. Most people search on Google before choosing a barber, and a simple site helps them find you, see what you offer and know where you are.\n\n" +
      "I've already started putting one together for you, because I think it fits the shop really well. Would you like to see it? If you're interested, I'll send you the preview, and if you like it I finish it with your photos and details in a few days.\n\n" +
      "Duda",
  );
});

test("dmMessage: EN sem avaliações não tem parênteses de avaliação nem dígito", () => {
  const msg = dmMessage({ ...MAN_CAVE, rating: undefined, reviewsCount: undefined }, { signature: "Duda" });
  assert.ok(!msg.includes("reviews ("), msg);
  assert.ok(msg.startsWith("Hi Man cave barber! I'm Duda, a web developer. I noticed you don't have a website yet."), msg);
  assert.equal(/\d/.test(msg), false, msg);
});

test("dmMessage: só com rating (sem reviewsCount) não mostra a linha de avaliações", () => {
  const msg = dmMessage({ ...MAN_CAVE, reviewsCount: undefined }, { signature: "Duda" });
  assert.ok(!msg.includes("reviews ("), msg);
});

test("dmMessage: só com reviewsCount (sem rating) não mostra a linha de avaliações", () => {
  const msg = dmMessage({ ...MAN_CAVE, rating: undefined }, { signature: "Duda" });
  assert.ok(!msg.includes("reviews ("), msg);
});

test("dmMessage: reviewsCount zero conta como 'sem avaliação' (nada para exibir com orgulho)", () => {
  const msg = dmMessage({ ...MAN_CAVE, reviewsCount: 0 }, { signature: "Duda" });
  assert.ok(!msg.includes("reviews ("), msg);
});

test("dmMessage: PT-PT usa o idioma certo, saudação e assinatura no fim", () => {
  const msg = dmMessage(
    { name: "Padaria Central", category: "bakery", city: "Lisboa", rating: 4.5, reviewsCount: 30, countryCode: "PT" },
    { signature: "Duda" },
  );
  assert.ok(msg.startsWith("Olá, Padaria Central! Sou Duda, programador(a) de sites."), msg);
  assert.ok(msg.includes("uma padaria"), msg);
  assert.ok(msg.includes("4,5"), msg); // vírgula, não ponto
  assert.ok(msg.includes("30"), msg);
  assert.ok(msg.endsWith("\n\nDuda"), msg);
});

test("dmMessage: ES usa o idioma certo e o substantivo da categoria", () => {
  const msg = dmMessage(
    { name: "Peluquería Ana", category: "hair salon", city: "Madrid", rating: undefined, reviewsCount: undefined, countryCode: "ES" },
    { signature: "Duda" },
  );
  assert.ok(msg.startsWith("¡Hola, Peluquería Ana! Soy Duda, desarrollador(a) web."), msg);
  assert.ok(msg.includes("una peluquería"), msg);
  assert.equal(/\d/.test(msg), false, msg);
});

// ---------------------------------------------------------------------------
// Todos os 10 idiomas: sem "undefined"/"NaN", e sem dígito fora do que vem de
// rating/reviewsCount. O francês só é alcançável via cidade suíça francófona
// (localeForLead), por isso entra com countryCode "CH" + city "Genève".
// ---------------------------------------------------------------------------

const LEAD_BY_LOCALE: Record<Locale, { countryCode: string; city: string }> = {
  en: { countryCode: "GB", city: "London" },
  nl: { countryCode: "NL", city: "Amsterdam" },
  sv: { countryCode: "SE", city: "Stockholm" },
  no: { countryCode: "NO", city: "Oslo" },
  es: { countryCode: "ES", city: "Madrid" },
  it: { countryCode: "IT", city: "Roma" },
  pt: { countryCode: "PT", city: "Lisboa" },
  de: { countryCode: "DE", city: "Berlin" },
  da: { countryCode: "DK", city: "København" },
  fr: { countryCode: "CH", city: "Genève" },
};

const LOCALES = Object.keys(LEAD_BY_LOCALE) as Locale[];

test("dmMessage: os 10 idiomas renderizam sem 'undefined'/'NaN', com e sem avaliação, categoria conhecida ou não", () => {
  for (const l of LOCALES) {
    const { countryCode, city } = LEAD_BY_LOCALE[l];
    // paridade com localeForLead: confirma que o par (país, cidade) escolhido acima
    // realmente resolve para o idioma esperado antes de testar o texto.
    assert.equal(localeForLead(countryCode, city), l, `LEAD_BY_LOCALE[${l}] não resolve para ${l}`);
    for (const category of ["restaurant", "law firm", undefined, null] as const) {
      for (const reviews of [
        { rating: 4.8, reviewsCount: 120 },
        { rating: undefined, reviewsCount: undefined },
      ] as const) {
        const msg = dmMessage(
          { name: "Teste Lead", category, city, countryCode, ...reviews },
          { signature: "Duda" },
        );
        assert.ok(!/undefined/i.test(msg), `${l}/${category}: ${msg}`);
        // Sem \b/case-sensitive aqui: "NaN" case-insensitive casa com "nan" dentro de
        // palavras normais (sueco "innan" = "antes") e vira falso positivo.
        assert.ok(!/\bNaN\b/.test(msg), `${l}/${category}: ${msg}`);
        assert.ok(msg.endsWith("\n\nDuda"), `${l}/${category}: assinatura no fim`);
        if (!reviews.rating) assert.equal(/\d/.test(msg), false, `${l}/${category} sem avaliação tem dígito: ${msg}`);
      }
    }
  }
});

test("dmMessage: categoria em formatos diferentes (snake_case, com espaço, nome livre) reconhece o mesmo conceito", () => {
  const base = { name: "X", city: "London", countryCode: "GB", rating: undefined, reviewsCount: undefined } as const;
  const a = dmMessage({ ...base, category: "barber_shop" }, { signature: "Duda" });
  const b = dmMessage({ ...base, category: "barber shop" }, { signature: "Duda" });
  const c = dmMessage({ ...base, category: "Barbershop" }, { signature: "Duda" });
  assert.ok(a.includes(" a barber,"), a);
  assert.equal(a, b);
  assert.equal(a, c);
});

test("dmMessage: categoria desconhecida cai no fallback genérico, sem quebrar", () => {
  const msg = dmMessage(
    { name: "X", category: "law firm", city: "London", countryCode: "GB", rating: undefined, reviewsCount: undefined },
    { signature: "Duda" },
  );
  assert.ok(msg.includes(" a business,"), msg);
});
