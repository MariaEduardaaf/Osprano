import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSiteContent, type SiteContent } from "../convex/lib/site.ts";
import type { Id } from "../convex/_generated/dataModel";
import {
  addGalleryImage,
  addItem,
  canonical,
  hoursRows,
  imageUrlMap,
  isDirty,
  removeGalleryImage,
  removeItem,
  replaceGalleryImage,
  setDay,
  setHero,
  setItem,
  setText,
  viewImages,
  withTemplate,
  WEEKDAY_ORDER,
} from "../src/lib/site-editor.ts";

const sid = (s: string) => s as Id<"_storage">;

const base = (): SiteContent => ({
  version: 2,
  template: "mesa",
  palette: "terracota",
  name: "Casa Aurora",
  city: "Lisboa",
  countryCode: "PT",
  phone: "+351 21 000 0000",
  category: "restaurant",
  rating: 4.7,
  reviewsCount: 128,
});

test("site-editor: setText grava e, com vazio, remove a chave (JSON canônico)", () => {
  const c = setText(base(), "tagline", "Sabores de casa");
  assert.equal(c.tagline, "Sabores de casa");
  const back = setText(c, "tagline", "");
  assert.equal("tagline" in back, false);
  assert.equal(isDirty(back, base()), false);
  // o original não muda (imutabilidade)
  assert.equal("tagline" in base(), false);
});

test("site-editor: isDirty ignora ordem de chaves e undefined", () => {
  const a = base();
  const b = { ...a, tagline: undefined } as SiteContent;
  assert.equal(isDirty(a, b), false);
  const reordered = JSON.parse(canonical(a)) as SiteContent;
  assert.equal(canonical({ ...reordered, name: reordered.name }), canonical(a));
  assert.equal(isDirty({ ...a, name: "Outro" }, a), true);
  assert.equal(isDirty({ ...a, items: [{ name: "x" }] }, a), true);
});

test("site-editor: withTemplate mantém os campos e só troca a paleta quando ela não é do modelo", () => {
  const c = { ...base(), tagline: "t", items: [{ name: "Bacalhau", price: "18" }] };
  const e = withTemplate(c, "estudio");
  assert.equal(e.template, "estudio");
  assert.equal(e.palette, "carvao");
  assert.equal(e.tagline, "t");
  assert.deepEqual(e.items, c.items);
  assert.equal(withTemplate(c, "mesa"), c);
  // voltar para mesa depois de ir a estúdio: a paleta é a padrão de mesa (a dela se perdeu na ida)
  assert.equal(withTemplate(e, "mesa").palette, "terracota");
  assert.doesNotThrow(() => validateSiteContent(e));
});

test("site-editor: itens até 12, preço/nota vazios somem, lista vazia some", () => {
  let c = addItem(base());
  assert.deepEqual(c.items, [{ name: "" }]);
  c = setItem(c, 0, { name: "Bacalhau à Brás", price: "18,50", note: "" });
  assert.deepEqual(c.items, [{ name: "Bacalhau à Brás", price: "18,50" }]);
  c = setItem(c, 0, { price: "" });
  assert.deepEqual(c.items, [{ name: "Bacalhau à Brás" }]);
  assert.equal(setItem(c, 5, { name: "x" }), c);
  for (let i = 0; i < 20; i++) c = addItem(c);
  assert.equal(c.items?.length, 12);
  c = removeItem(c, 0);
  assert.equal(c.items?.length, 11);
  let empty = base();
  empty = addItem(empty);
  empty = removeItem(empty, 0);
  assert.equal("items" in empty, false);
  assert.equal(removeItem(empty, 0), empty);
});

test("site-editor: horário tem 7 linhas seg a dom; setDay guarda ordenado e vazio some", () => {
  const rows = hoursRows(base());
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map((r) => r.day), [...WEEKDAY_ORDER]);
  assert.deepEqual(rows.map((r) => r.label), ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
  assert.ok(rows.every((r) => r.closed));

  let c = setDay(base(), 6, { open: "10:00", close: "14:00" });
  c = setDay(c, 1, { open: "09:00", close: "18:00" });
  assert.deepEqual(c.hours, [
    { day: 1, open: "09:00", close: "18:00" },
    { day: 6, open: "10:00", close: "14:00" },
  ]);
  const r = hoursRows(c);
  assert.deepEqual(r[0], { day: 1, label: "Seg", closed: false, open: "09:00", close: "18:00" });
  assert.equal(r[6].closed, true);
  c = setDay(c, 1, { open: "08:00", close: "18:00" });
  assert.equal(c.hours?.[0].open, "08:00");
  assert.equal(c.hours?.length, 2);
  c = setDay(c, 1, null);
  c = setDay(c, 6, null);
  assert.equal("hours" in c, false);
  assert.doesNotThrow(() => validateSiteContent(setDay(base(), 0, { open: "09:00", close: "18:00" })));
});

test("site-editor: hero e galeria (até 6), chave some quando vazia", () => {
  let c = setHero(base(), sid("h1"));
  assert.equal(c.heroImage, "h1");
  c = setHero(c, undefined);
  assert.equal("heroImage" in c, false);
  for (let i = 0; i < 8; i++) c = addGalleryImage(c, sid(`g${i}`));
  assert.deepEqual(c.gallery, ["g0", "g1", "g2", "g3", "g4", "g5"]);
  c = removeGalleryImage(c, 1);
  assert.deepEqual(c.gallery, ["g0", "g2", "g3", "g4", "g5"]);
  c = replaceGalleryImage(c, 0, sid("novo"));
  assert.deepEqual(c.gallery, ["novo", "g2", "g3", "g4", "g5"]);
  assert.equal(replaceGalleryImage(c, 7, sid("x")), c);
  assert.equal(removeGalleryImage(c, 9), c);
  let one = addGalleryImage(base(), sid("x"));
  one = removeGalleryImage(one, 0);
  assert.equal("gallery" in one, false);
});

test("site-editor: imageUrlMap casa hero e galeria por posição; tamanhos diferentes não casam a galeria", () => {
  const c = { ...base(), heroImage: sid("h"), gallery: [sid("a"), sid("b")] };
  assert.deepEqual(imageUrlMap(c, { heroUrl: "H", galleryUrls: ["A", "B"] }), { h: "H", a: "A", b: "B" });
  assert.deepEqual(imageUrlMap(c, { galleryUrls: ["A", "B"] }), { a: "A", b: "B" });
  assert.deepEqual(imageUrlMap(c, { heroUrl: "H", galleryUrls: ["A"] }), { h: "H" });
  assert.deepEqual(imageUrlMap(base(), { galleryUrls: [] }), {});
});

test("site-editor: viewImages resolve pelo mapa e pula id sem URL", () => {
  const c = { ...base(), heroImage: sid("h"), gallery: [sid("a"), sid("b")] };
  assert.deepEqual(viewImages(c, { h: "H", a: "A", b: "B" }), { heroUrl: "H", galleryUrls: ["A", "B"] });
  assert.deepEqual(viewImages(c, { a: "A" }), { galleryUrls: ["A"] });
  assert.deepEqual(viewImages(base(), {}), { galleryUrls: [] });
});
