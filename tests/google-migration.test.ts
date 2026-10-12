import { test } from "node:test";
import assert from "node:assert/strict";
import { scrubLeadPatch, scrubPreviewContent, type LeadFacts } from "../convex/lib/googleData.ts";

const full: LeadFacts = {
  source: "places", name: "Casa Nova", address: "Rua 1", phone: "123", website: "w",
  rating: 4.5, reviewsCount: 10, category: "italian_restaurant",
};
const apply = (l: LeadFacts, p: Record<string, undefined>) => {
  const o: Record<string, unknown> = { ...l };
  for (const k of Object.keys(p)) delete o[k];
  return o as LeadFacts;
};

test("scrubLeadPatch: Google sem confirmação limpa 7 campos", () => {
  const p = scrubLeadPatch(full);
  assert.deepEqual(Object.keys(p).sort(), ["address", "category", "name", "phone", "rating", "reviewsCount", "website"]);
  assert.ok(Object.values(p).every((v) => v === undefined));
});

test("scrubLeadPatch: categoria conhecida fica", () => {
  assert.equal("category" in scrubLeadPatch({ ...full, category: "cafe" }), false);
});

test("scrubLeadPatch: idempotente", () => {
  assert.deepEqual(scrubLeadPatch(apply(full, scrubLeadPatch(full))), {});
});

test("scrubLeadPatch: confirmado só mexe em category; OSM e manual nunca", () => {
  const c = { ...full, confirmation: { at: 1, via: "call" as const } };
  assert.deepEqual(Object.keys(scrubLeadPatch(c)), ["category"]);
  assert.deepEqual(scrubLeadPatch({ ...full, source: "osm" }), {});
  assert.deepEqual(scrubLeadPatch({ ...full, source: "manual" }), {});
});

const content = { name: "Casa Nova", phone: "123", address: "Rua 1", category: "italian_restaurant", rating: 4.5 as number | null, reviewsCount: 10 as number | null };

test("scrubPreviewContent: cópia do Google é limpa", () => {
  const r = scrubPreviewContent(content, full, false);
  assert.equal(r.changed, true);
  assert.equal(r.keptPublishedName, false);
  assert.equal(r.content.name, "");
  assert.equal("phone" in r.content, false);
  assert.equal("address" in r.content, false);
  assert.deepEqual([r.content.rating, r.content.reviewsCount, r.content.category], [null, null, null]);
});

test("scrubPreviewContent: publicado mantém o nome", () => {
  const r = scrubPreviewContent(content, full, true);
  assert.equal(r.content.name, "Casa Nova");
  assert.equal(r.keptPublishedName, true);
  assert.equal(r.changed, true);
});

test("scrubPreviewContent: editado pela cliente fica", () => {
  const r = scrubPreviewContent({ ...content, name: "Casa Nova Bistrô", phone: "999" }, full, false);
  assert.equal(r.content.name, "Casa Nova Bistrô");
  assert.equal(r.content.phone, "999");
});

test("scrubPreviewContent: segunda passada e OSM não mudam nada", () => {
  const first = scrubPreviewContent(content, full, false);
  assert.equal(scrubPreviewContent(first.content, apply(full, scrubLeadPatch(full)), false).changed, false);
  const o = scrubPreviewContent(content, { ...full, source: "osm" }, false);
  assert.equal(o.changed, false);
  assert.equal(o.content, content);
});
