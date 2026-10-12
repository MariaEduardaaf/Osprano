import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmPatch } from "../convex/lib/googleData.ts";

const google = {
  source: "places" as const,
  countryCode: "GB",
  name: "Do Google",
  phone: "1",
  address: "Rua",
  website: "w",
  rating: 4,
  reviewsCount: 9,
};

test("primeira confirmação exige origem", () => {
  assert.throws(() => confirmPatch(google, { name: "X" }, 1), /Escolha onde você confirmou estes dados\./);
});

test("primeira confirmação exige nome", () => {
  assert.throws(() => confirmPatch(google, { via: "call", name: "  " }, 1), /Digite o nome do negócio\./);
  assert.throws(() => confirmPatch(google, { via: "call" }, 1), /Digite o nome do negócio\./);
});

test("primeira confirmação apaga resto do Google", () => {
  const p = confirmPatch(google, { name: "Casa Nova", via: "call" }, 5);
  assert.equal(p.name, "Casa Nova");
  for (const k of ["phone", "address", "website", "rating", "reviewsCount"] as const) {
    assert.ok(k in p && p[k] === undefined, k);
  }
  assert.deepEqual(p.confirmation, { at: 5, via: "call" });
  assert.equal("noSite" in p.confirmation!, false);
});

test("noSite na primeira confirmação", () => {
  assert.equal(confirmPatch(google, { name: "X", via: "visit", noSite: true }, 1).confirmation!.noSite, true);
});

test("já confirmado: sem via não regrava confirmação nem nome", () => {
  const c = { ...google, confirmation: { at: 1, via: "call" as const } };
  const p = confirmPatch(c, { phone: "+44 20 1234" }, 9);
  assert.deepEqual(p, { phone: "+44 20 1234" });
  assert.deepEqual(confirmPatch(c, { noSite: true }, 9).confirmation, { at: 1, via: "call", noSite: true });
});

test("não-Google não exige via", () => {
  const p = confirmPatch({ source: "osm", countryCode: "GB", name: "Velho" }, { name: "Nova" }, 1);
  assert.equal(p.name, "Nova");
  assert.equal(p.confirmation, undefined);
});

test("nome vazio lança em qualquer lead", () => {
  assert.throws(() => confirmPatch({ source: "osm", countryCode: "GB" }, { name: "" }, 1), /Digite o nome do negócio\./);
});

test("mudar o nome recalcula forma jurídica e e-mail", () => {
  const p = confirmPatch({ source: "osm", countryCode: "GB", name: "Velho", email: "info@acme.co.uk" }, { name: "Acme Ltd" }, 1);
  assert.equal(p.legalForm, "incorporated");
  assert.ok("contactType" in p && "emailable" in p);
});

test("telefone em branco limpa", () => {
  const p = confirmPatch({ source: "osm", countryCode: "GB", phone: "1" }, { phone: "  " }, 1);
  assert.ok("phone" in p && p.phone === undefined);
});
