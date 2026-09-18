import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_OPTIONS } from "../convex/lib/domain.ts";
import {
  TEMPLATE_IDS,
  PALETTE_IDS,
  TEMPLATE_BY_CATEGORY,
  suggestTemplate,
  defaultPalette,
  ctaOptions,
  primaryCta,
  mapEmbedUrl,
  parseSiteContent,
  validateSiteContent,
  defaultContentForLead,
  imageIds,
  removedImageIds,
  type SiteContent,
} from "../convex/lib/site.ts";
import type { Id } from "../convex/_generated/dataModel";

const base = (): SiteContent => ({
  version: 2,
  template: "mesa",
  palette: "terracota",
  name: "Casa Nova",
  city: "Madrid",
  countryCode: "ES",
  category: "restaurant",
  rating: 4.5,
  reviewsCount: 12,
});

test("site: toda categoria do select cai num dos 4 modelos, pela tabela", () => {
  for (const { value } of CATEGORY_OPTIONS) {
    const id = suggestTemplate(value);
    assert.ok((TEMPLATE_IDS as readonly string[]).includes(id), `${value} deu ${id}`);
    assert.equal(id, TEMPLATE_BY_CATEGORY[value] ?? "vitrine", `${value}: tabela e sugestão divergem`);
  }
});

test("site: a tabela cobre exatamente os segmentos da spec 1.1", () => {
  const by = (t: string) =>
    Object.entries(TEMPLATE_BY_CATEGORY)
      .filter(([, id]) => id === t)
      .map(([k]) => k)
      .sort();
  assert.deepEqual(by("mesa"), [
    "bakery", "bar", "cafe", "ice cream shop", "pastry shop", "pizza restaurant", "pub", "restaurant",
  ]);
  assert.deepEqual(by("estudio"), [
    "barber shop", "beauty salon", "gym", "hair salon", "nail salon", "personal trainer", "spa",
    "tattoo studio", "yoga studio",
  ]);
  assert.deepEqual(by("oficio"), [
    "car repair", "car wash", "driving school", "electrician", "locksmith", "photographer", "plumber",
  ]);
  // Vitrine é o resto: nunca entra na tabela.
  assert.deepEqual(by("vitrine"), []);
  for (const k of Object.keys(TEMPLATE_BY_CATEGORY)) {
    assert.ok(CATEGORY_OPTIONS.some((o) => o.value === k), `${k} não está em CATEGORY_OPTIONS`);
  }
});

test("site: categoria desconhecida, nula ou vazia vira vitrine", () => {
  for (const c of [null, undefined, "", "   ", "dentist", "lawyer", "pet store", "pharmacy", "xyz"]) {
    assert.equal(suggestTemplate(c), "vitrine", `${JSON.stringify(c)}`);
  }
});

test("site: formas vindas do Places e do seed também acertam o modelo", () => {
  assert.equal(suggestTemplate("barber_shop"), "estudio");
  assert.equal(suggestTemplate("hair_salon"), "estudio");
  assert.equal(suggestTemplate("barber"), "estudio");
  assert.equal(suggestTemplate("Hairdresser"), "estudio");
  assert.equal(suggestTemplate("italian_restaurant"), "mesa");
  assert.equal(suggestTemplate("Coffee shop"), "mesa");
  assert.equal(suggestTemplate("spanish restaurant"), "mesa");
  assert.equal(suggestTemplate("car_repair"), "oficio");
  assert.equal(suggestTemplate("Electrician "), "oficio");
});

test("site: cada modelo tem 3 paletas com ids únicos e a padrão é a primeira", () => {
  for (const t of TEMPLATE_IDS) {
    assert.equal(PALETTE_IDS[t].length, 3, t);
    assert.equal(new Set(PALETTE_IDS[t]).size, 3, t);
    assert.equal(defaultPalette(t), PALETTE_IDS[t][0], t);
  }
});

test("site: CTA segue a ordem whatsapp, telefone, e-mail e é null sem canal", () => {
  const all = ctaOptions({ whatsapp: "447700900123", phone: "+44 20 7946 0000", email: "hi@x.co" });
  assert.deepEqual(all, [
    { kind: "whatsapp", href: "https://wa.me/447700900123" },
    { kind: "phone", href: "tel:+442079460000" },
    { kind: "email", href: "mailto:hi@x.co" },
  ]);
  assert.deepEqual(primaryCta({ phone: "+44 20 7946 0000", email: "hi@x.co" }), {
    kind: "phone",
    href: "tel:+442079460000",
  });
  assert.deepEqual(primaryCta({ email: " hi@x.co " }), { kind: "email", href: "mailto:hi@x.co" });
  // WhatsApp NUNCA é derivado do telefone: sem o campo, não existe o canal.
  assert.equal(primaryCta({ phone: "+44 20 7946 0000" })?.kind, "phone");
  assert.equal(primaryCta({}), null);
  assert.equal(primaryCta({ whatsapp: "", phone: "  ", email: "" }), null);
});

test("site: mapEmbedUrl só existe com endereço e busca endereço mais cidade, codificados", () => {
  // Sem chave de API: só a busca do Google Maps em modo embed. A cidade sozinha
  // não vira mapa (seria um mapa da cidade inteira no lugar do negócio).
  assert.equal(
    mapEmbedUrl("Rua das Flores 12", "Lisboa"),
    "https://www.google.com/maps?q=Rua%20das%20Flores%2012%2C%20Lisboa&output=embed",
  );
  assert.equal(mapEmbedUrl("Calle Mayor 8", null), "https://www.google.com/maps?q=Calle%20Mayor%208&output=embed");
  assert.equal(mapEmbedUrl(" 1 High St ", " Leeds "), "https://www.google.com/maps?q=1%20High%20St%2C%20Leeds&output=embed");
  assert.equal(mapEmbedUrl("Rue de l'Église 3 & 5", "Genève"), `https://www.google.com/maps?q=${encodeURIComponent("Rue de l'Église 3 & 5, Genève")}&output=embed`);
  assert.equal(mapEmbedUrl(undefined, "Lisboa"), null);
  assert.equal(mapEmbedUrl("", "Lisboa"), null);
  assert.equal(mapEmbedUrl("   ", null), null);
});

test("site: o formato antigo (sem version) vira v2 com modelo sugerido e paleta padrão", () => {
  const legacy = {
    name: "Sharp Cuts",
    category: "barber shop",
    city: "London",
    phone: "+44 1",
    rating: 4.2,
    reviewsCount: 30,
    countryCode: "GB",
  };
  const c = parseSiteContent(legacy);
  assert.equal(c.version, 2);
  assert.equal(c.template, "estudio");
  assert.equal(c.palette, "carvao");
  assert.equal(c.name, "Sharp Cuts");
  assert.equal(c.phone, "+44 1");
  assert.equal(c.city, "London");
  assert.equal(c.rating, 4.2);
  assert.equal(c.reviewsCount, 30);
  assert.equal(c.countryCode, "GB");
  for (const k of ["whatsapp", "instagram", "email", "items", "hours", "tagline", "about"]) {
    assert.equal(k in c, false, `${k} deveria estar ausente`);
  }
  // `phone: null` no formato antigo vira campo ausente, não "null".
  assert.equal("phone" in parseSiteContent({ ...legacy, phone: null }), false);
});

test("site: conteúdo nulo ou corrompido vira o mínimo em vez de lançar", () => {
  for (const raw of [null, undefined, "x", 12, [], {}, { name: 5 }, { version: 2 }]) {
    const c = parseSiteContent(raw);
    assert.equal(c.version, 2, JSON.stringify(raw));
    assert.equal(c.template, "vitrine");
    assert.equal(c.palette, "areia");
    assert.equal(c.name, "");
    assert.equal(c.city, null);
  }
});

test("site: v2 passa inteiro; modelo, paleta e listas inválidos caem no padrão", () => {
  const full: SiteContent = {
    ...base(),
    tagline: "t",
    about: "a",
    items: [{ name: "Café", price: "2" }],
    hours: [{ day: 1, open: "09:00", close: "18:00" }],
    address: "Rua 1",
    whatsapp: "34600000000",
    instagram: "casanova",
    email: "x@y.z",
  };
  assert.deepEqual(parseSiteContent(full), full);

  const bad = parseSiteContent({ ...full, template: "banana", palette: "xyz" });
  assert.equal(bad.template, "mesa"); // pela categoria "restaurant"
  assert.equal(bad.palette, "terracota");
  // "carvao" existe, mas é do estudio: paleta de outro modelo cai na padrão.
  assert.equal(parseSiteContent({ ...full, palette: "carvao" }).palette, "terracota");

  const junk = parseSiteContent({
    ...full,
    items: [{ name: "ok" }, { price: "1" }, "x"],
    hours: [{ day: 9, open: "1", close: "2" }],
  });
  assert.deepEqual(junk.items, [{ name: "ok" }]);
  assert.deepEqual(junk.hours, []);
});

test("site: validateSiteContent aplica os limites da spec 2.1", () => {
  assert.doesNotThrow(() => validateSiteContent(base()));
  const item = (i: number) => ({ name: `Item ${i}` });
  assert.doesNotThrow(() =>
    validateSiteContent({ ...base(), items: Array.from({ length: 12 }, (_, i) => item(i)) }),
  );
  assert.throws(
    () => validateSiteContent({ ...base(), items: Array.from({ length: 13 }, (_, i) => item(i)) }),
    /Itens: no máximo 12/,
  );
  assert.throws(() => validateSiteContent({ ...base(), name: "  " }), /Nome/);
  assert.throws(() => validateSiteContent({ ...base(), name: "x".repeat(81) }), /Nome/);
  assert.throws(() => validateSiteContent({ ...base(), tagline: "x".repeat(121) }), /Slogan/);
  assert.throws(() => validateSiteContent({ ...base(), about: "x".repeat(1201) }), /Sobre/);
  assert.throws(() => validateSiteContent({ ...base(), items: [{ name: "x".repeat(61) }] }), /Item: nome/);
  assert.throws(
    () => validateSiteContent({ ...base(), items: [{ name: "ok", price: "x".repeat(21) }] }),
    /preço/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), items: [{ name: "ok", note: "x".repeat(81) }] }),
    /nota/,
  );
  assert.throws(
    () =>
      validateSiteContent({
        ...base(),
        hours: [
          { day: 1, open: "09:00", close: "18:00" },
          { day: 1, open: "09:00", close: "12:00" },
        ],
      }),
    /uma linha por dia/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), hours: [{ day: 1, open: "9h", close: "18:00" }] }),
    /HH:MM/,
  );
  assert.throws(
    () => validateSiteContent({ ...base(), hours: [{ day: 1, open: "09:00", close: "24:00" }] }),
    /HH:MM/,
  );
  const gallery = Array(7).fill("kg2abc") as unknown as SiteContent["gallery"];
  assert.throws(() => validateSiteContent({ ...base(), gallery }), /Galeria/);
  assert.throws(() => validateSiteContent({ ...base(), instagram: "@casa" }), /Instagram/);
  assert.throws(() => validateSiteContent({ ...base(), instagram: "instagram.com/casa" }), /Instagram/);
  assert.throws(() => validateSiteContent({ ...base(), whatsapp: "+34 600" }), /WhatsApp/);
  assert.throws(() => validateSiteContent({ ...base(), whatsapp: "1234567" }), /WhatsApp/);
  assert.throws(() => validateSiteContent({ ...base(), email: "semarroba" }), /E-mail/);
  assert.throws(() => validateSiteContent({ ...base(), palette: "carvao" }), /Paleta/);
  // Campo vazio é "não preenchido", não erro: o editor manda "" para o que ela limpou.
  assert.doesNotThrow(() =>
    validateSiteContent({
      ...base(),
      tagline: "",
      about: "",
      whatsapp: "",
      instagram: "",
      email: "",
      items: [],
      hours: [],
    }),
  );
});

test("site: defaultContentForLead só alimenta o que o lead tem e deixa os canais vazios", () => {
  const c = defaultContentForLead({
    name: "  QuickFix Plumbing ",
    category: "plumber",
    city: "Leeds",
    countryCode: "GB",
    phone: "+44 113 000",
    address: "1 High St",
    rating: 4.8,
    reviewsCount: 51,
  });
  assert.equal(c.version, 2);
  assert.equal(c.template, "oficio");
  assert.equal(c.palette, "laranja");
  assert.equal(c.name, "QuickFix Plumbing");
  assert.equal(c.phone, "+44 113 000");
  assert.equal(c.address, "1 High St");
  assert.equal(c.city, "Leeds");
  assert.equal(c.countryCode, "GB");
  assert.equal(c.rating, 4.8);
  assert.equal(c.reviewsCount, 51);
  assert.equal(c.category, "plumber");
  for (const k of ["whatsapp", "instagram", "email", "tagline", "about", "items", "hours", "heroImage", "gallery"]) {
    assert.equal(k in c, false, `${k} deveria estar ausente`);
  }
  assert.doesNotThrow(() => validateSiteContent(c));

  const bare = defaultContentForLead({ name: "X", countryCode: "NL" });
  assert.equal(bare.template, "vitrine");
  assert.equal(bare.palette, "areia");
  assert.equal(bare.city, null);
  assert.equal(bare.category, null);
  assert.equal(bare.rating, null);
  assert.equal("phone" in bare, false);
  assert.equal("address" in bare, false);
});

// Ids de storage são strings opacas: os testes usam literais com o tipo do Convex.
const sid = (s: string) => s as Id<"_storage">;

test("site: imageIds junta hero e galeria, sem repetir e sem nulos", () => {
  assert.deepEqual(imageIds({}), []);
  assert.deepEqual(imageIds({ heroImage: sid("a") }), ["a"]);
  assert.deepEqual(imageIds({ gallery: [sid("b"), sid("c")] }), ["b", "c"]);
  assert.deepEqual(imageIds({ heroImage: sid("a"), gallery: [sid("b"), sid("a")] }), ["a", "b"]);
});

test("site: removedImageIds é o que saiu do conteúdo; trocar de slot não conta", () => {
  const before = { heroImage: sid("a"), gallery: [sid("b"), sid("c")] };
  assert.deepEqual(removedImageIds(before, before), []);
  assert.deepEqual(removedImageIds(before, { heroImage: sid("a"), gallery: [sid("c")] }), ["b"]);
  assert.deepEqual(removedImageIds(before, {}), ["a", "b", "c"]);
  // hero virou galeria e a galeria virou hero: nada saiu
  assert.deepEqual(removedImageIds(before, { heroImage: sid("b"), gallery: [sid("a"), sid("c")] }), []);
  // conteúdo antigo sem imagem: nada a apagar, mesmo que o novo tenha
  assert.deepEqual(removedImageIds({}, { heroImage: sid("z") }), []);
});
