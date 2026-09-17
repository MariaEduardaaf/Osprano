import { test } from "node:test";
import assert from "node:assert/strict";
import { whatTheyHaveLink } from "../src/lib/lead-links.ts";

const BASE = {
  website: undefined as string | undefined,
  source: "osm" as const,
  placeId: undefined as string | undefined,
  name: "Padaria Central",
  address: "Rua A, 123",
  city: "Lisboa",
  countryCode: "PT",
};

function query(href: string): string {
  return decodeURIComponent(href.split("query=")[1]);
}

test("whatTheyHaveLink: site sem esquema ganha https://", () => {
  const r = whatTheyHaveLink({ ...BASE, website: "padaria.pt" });
  assert.equal(r.href, "https://padaria.pt");
  assert.equal(r.label, "Ver site");
});

test("whatTheyHaveLink: site já com esquema (http) fica intacto", () => {
  const r = whatTheyHaveLink({ ...BASE, website: "http://padaria.pt" });
  assert.equal(r.href, "http://padaria.pt");
  assert.equal(r.label, "Ver site");
});

test("whatTheyHaveLink: site já com https fica intacto", () => {
  const r = whatTheyHaveLink({ ...BASE, website: "https://padaria.pt/cardapio" });
  assert.equal(r.href, "https://padaria.pt/cardapio");
  assert.equal(r.label, "Ver site");
});

test("whatTheyHaveLink: site vence mesmo com placeId presente", () => {
  const r = whatTheyHaveLink({
    ...BASE,
    website: "padaria.pt",
    source: "places",
    placeId: "ChIJabc123",
  });
  assert.equal(r.label, "Ver site");
});

test("whatTheyHaveLink: places com placeId vai para a ficha do Google Maps", () => {
  const r = whatTheyHaveLink({ ...BASE, source: "places", placeId: "ChIJabc123" });
  assert.equal(r.href, "https://www.google.com/maps/place/?q=place_id:ChIJabc123");
  assert.equal(r.label, "Ver no Google");
});

test("whatTheyHaveLink: places sem placeId cai para busca", () => {
  const r = whatTheyHaveLink({ ...BASE, source: "places", placeId: undefined });
  assert.equal(r.label, "Buscar no Google");
});

test("whatTheyHaveLink: osm sem site busca por nome + endereço + país", () => {
  const r = whatTheyHaveLink({ ...BASE, source: "osm" });
  assert.equal(r.label, "Buscar no Google");
  assert.equal(query(r.href), "Padaria Central, Rua A, 123, Portugal");
});

test("whatTheyHaveLink: manual sem site também busca", () => {
  const r = whatTheyHaveLink({ ...BASE, source: "manual" });
  assert.equal(r.label, "Buscar no Google");
  assert.equal(query(r.href), "Padaria Central, Rua A, 123, Portugal");
});

test("whatTheyHaveLink: sem endereço cai para a cidade", () => {
  const r = whatTheyHaveLink({ ...BASE, address: undefined });
  assert.equal(query(r.href), "Padaria Central, Lisboa, Portugal");
});

test("whatTheyHaveLink: sem endereço e sem cidade cai para nome + país", () => {
  const r = whatTheyHaveLink({ ...BASE, address: undefined, city: undefined });
  assert.equal(query(r.href), "Padaria Central, , Portugal");
});

test("whatTheyHaveLink: país fora de MARKETS usa o próprio código", () => {
  const r = whatTheyHaveLink({ ...BASE, countryCode: "XX" });
  assert.equal(query(r.href), "Padaria Central, Rua A, 123, XX");
});
