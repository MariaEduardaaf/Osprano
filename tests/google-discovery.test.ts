import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fakeCtx } from "./fake-ctx.ts";
import { placesDerived, insertPlacesLead } from "../convex/model/discovery.ts";

const places = readFileSync(new URL("../convex/places.ts", import.meta.url), "utf8");
const scoring = readFileSync(new URL("../convex/scoring.ts", import.meta.url), "utf8");

test("placesDerived: só rede social => socialOnly, perfil esparso sem telefone", () => {
  const d = placesDerived({ website: "https://instagram.com/x" }, "GB");
  assert.equal(d.signals.noSite, false);
  assert.equal(d.signals.socialOnly, true);
  assert.equal(d.signals.sparseProfile, true);
});

test("placesDerived: Ltd => incorporated, perfil completo, sem site", () => {
  const d = placesDerived({ name: "Acme Ltd", phone: "01", rating: 4.5, reviewsCount: 10 }, "GB");
  assert.equal(d.legalForm, "incorporated");
  assert.equal(d.signals.sparseProfile, false);
  assert.equal(d.signals.noSite, true);
});

const args = (derived = placesDerived({ name: "Acme Ltd" }, "GB")) => ({
  orgId: "org1", placeId: "p1", category: "plumber", city: "Leeds", countryCode: "GB", derived,
});

test("insertPlacesLead: grava só place_id, termo, cidade/país e derivados", async () => {
  const { ctx, tables } = fakeCtx({ leads: [] });
  const r = await insertPlacesLead(ctx as never, args(), 1000);
  assert.equal(r.created, true);
  const row = tables.get("leads")![0];
  for (const k of ["name", "address", "phone", "website", "rating", "reviewsCount", "lat", "lng"]) {
    assert.equal(k in row, false, k);
  }
  assert.equal(row.source, "places");
  assert.equal(row.placeId, "p1");
  assert.equal(row.category, "plumber");
  assert.equal(row.city, "Leeds");
  assert.equal(row.countryCode, "GB");
  assert.equal(row.stage, "base");
  assert.equal(row.saved, false);
  for (const k of ["signals", "score", "tier", "legalForm", "contactType", "emailable", "fetchedAt", "stageUpdatedAt", "scoredAt"]) {
    assert.ok(k in row, k);
  }
});

test("insertPlacesLead: lead existente não é reescrito", async () => {
  const existing = { _id: "leads:x", orgId: "org1", placeId: "p1", name: "Casa Nova", confirmation: { name: "Casa Nova" }, stage: "approached" };
  const { ctx, tables } = fakeCtx({ leads: [existing] });
  const r = await insertPlacesLead(ctx as never, args(), 1000);
  assert.deepEqual(r, { leadId: "leads:x", created: false });
  assert.deepEqual(tables.get("leads")![0], existing);
});

test("places.ts: sem gravação legada, sem log de conteúdo", () => {
  for (const s of ["insertDiscovered", "scoring.scoreLead", "console.log", "places.primaryType", "nationalPhoneNumber:", "displayName?.text ??"]) {
    assert.equal(places.includes(s), false, s);
  }
  assert.ok(places.includes("TEXT_SEARCH_FIELDS"));
  assert.ok(places.includes("internal.places.insertPlacesLead"));
});

test("scoring.ts pula lead do Google", () => {
  assert.ok(scoring.includes('lead.source === "places"'));
});
