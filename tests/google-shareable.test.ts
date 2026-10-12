import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isGoogleLead,
  leadLabel,
  shareableCategory,
  shareableFacts,
  shareableLead,
  shareableSignals,
} from "../convex/lib/googleData.ts";

const sig = { noSite: true, socialOnly: true, noHttps: true, notMobile: true, slow: true, sparseProfile: true };
const legacy = { source: "places" as const, name: " Casa ", phone: "1", address: "Rua", category: "italian_restaurant" };

test("isGoogleLead", () => {
  assert.equal(isGoogleLead({ source: "places" }), true);
  assert.equal(isGoogleLead({ source: "osm" }), false);
  assert.equal(isGoogleLead({}), false);
});

test("leadLabel", () => {
  assert.equal(leadLabel({ source: "places" }), "Negócio do Google");
  assert.equal(leadLabel({ source: "places", name: "  " }), "Negócio do Google");
  assert.equal(leadLabel({ source: "osm", name: "Padaria" }), "Padaria");
  assert.equal(leadLabel({ source: "manual" }), "Sem nome");
});

test("shareableFacts: places sem confirmação some, mesmo com legado gravado", () => {
  assert.deepEqual(shareableFacts(legacy), { name: null, phone: null, address: null });
});

test("shareableFacts: places confirmado e demais fontes devolvem trimado", () => {
  const c = { at: 1, via: "call" as const };
  assert.deepEqual(shareableFacts({ ...legacy, confirmation: c, phone: "" }), { name: "Casa", phone: null, address: "Rua" });
  assert.deepEqual(shareableFacts({ source: "osm", name: " X ", phone: "2" }), { name: "X", phone: "2", address: null });
  assert.deepEqual(shareableFacts({ name: "Y" }).name, "Y");
});

test("shareableCategory", () => {
  assert.equal(shareableCategory({ source: "places", category: "restaurant" }), "restaurant");
  assert.equal(shareableCategory({ source: "places", category: "italian_restaurant" }), null);
  assert.equal(shareableCategory({ source: "osm", category: "qualquer" }), "qualquer");
});

test("shareableSignals", () => {
  const a = shareableSignals({ source: "places", signals: sig })!;
  assert.deepEqual([a.noSite, a.socialOnly, a.sparseProfile, a.noHttps, a.notMobile, a.slow], [false, false, false, true, true, true]);
  const b = shareableSignals({ source: "places", signals: sig, confirmation: { at: 1, via: "call", noSite: true } })!;
  assert.deepEqual([b.noSite, b.socialOnly, b.sparseProfile], [true, true, false]);
  assert.equal(shareableSignals({ source: "osm", signals: sig }), sig);
  assert.equal(shareableSignals({ source: "osm" }), undefined);
});

test("shareableLead", () => {
  const l = shareableLead({ ...legacy, website: "w", rating: 4, reviewsCount: 3, signals: sig, countryCode: "GB", city: "X", email: "a@b.c" });
  assert.equal(l.name, undefined);
  assert.equal(l.phone, undefined);
  assert.equal(l.address, undefined);
  assert.equal(l.category, undefined);
  assert.equal(l.website, undefined);
  assert.equal(l.rating, undefined);
  assert.equal(l.reviewsCount, undefined);
  assert.equal(l.signals!.sparseProfile, false);
  assert.equal(l.countryCode, "GB");
  assert.equal(l.email, "a@b.c");
  const o = { source: "osm" as const, name: "N", phone: "1", website: "w", rating: 4, reviewsCount: 2, category: "c", signals: sig };
  assert.deepEqual({ ...shareableLead(o), address: undefined }, { ...o, address: undefined });
});
