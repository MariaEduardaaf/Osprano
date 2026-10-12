import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fakeCtx } from "./fake-ctx.ts";
import { emptyReport, mergeReports, migrateLeads } from "../convex/model/googleMigration.ts";

const legacy = (name: string, phone: string) => ({
  name, phone, address: "1 Fixture St", category: "italian_restaurant",
  rating: 4.6, reviewsCount: 31, city: "London", countryCode: "GB",
});

function seed() {
  const base = { orgId: "A", countryCode: "GB", stage: "base", stageUpdatedAt: 1 };
  const g = (id: string, name: string) => ({
    ...base, _id: id, source: "places", name, phone: "+44 20 0000 0001", address: "1 Fixture St",
    website: "https://fixture.test", rating: 4.6, reviewsCount: 31, category: "italian_restaurant",
  });
  return {
    leads: [
      { ...g("g1", "Fixture Google Um"), email: "info@fixture.test", stage: "approached", instagram: "fixture1", callScript: "texto" },
      g("g2", "Fixture Google Dois"),
      g("g3", "Fixture Google Tres"),
      { ...base, _id: "g4", source: "places", name: "Typed Name", category: "cafe", confirmation: { at: 1, via: "call" } },
      { ...base, _id: "o1", source: "osm", name: "Osm One", phone: "+44 1", rating: 4 },
      { ...base, _id: "m1", source: "manual", name: "Manual One" },
    ],
    previews: [
      { _id: "p1", orgId: "A", leadId: "g1", token: "t1", openCount: 0, content: legacy("Fixture Google Um", "+44 20 0000 0001") },
      { _id: "p2", orgId: "A", leadId: "g2", token: "t2", openCount: 0, published: true, slug: "fixture-abc123", content: legacy("Fixture Google Dois", "+44 20 0000 0001") },
      { _id: "p3", orgId: "A", leadId: "g3", token: "t3", openCount: 0, content: legacy("Fixture Editado", "+44 99") },
    ],
    outreach: [{ _id: "ou1", orgId: "A", leadId: "g1", channel: "email", status: "sent" }],
  };
}

test("dryRun writes nothing and reports counts only", async () => {
  const { ctx, tables } = fakeCtx(seed());
  const before = structuredClone([...tables.entries()]);
  const r = await migrateLeads(ctx as never, tables.get("leads") as never, true);
  assert.deepEqual([...tables.entries()], before);
  assert.equal(r.placesLeads, 4);
  assert.equal(r.confirmedLeads, 1);
  assert.equal(r.leadsCleaned, 3);
  assert.equal(r.leadsWithoutNameAfter, 3);
  assert.equal(r.previewsCleaned, 3);
  assert.equal(r.publishedNameKept, 1);
  assert.deepEqual(r.publishedNameKeptLeadIds, ["g2"]);
  assert.equal(r.previewsChangedWithSentOutreach, 1);
  assert.equal(r.leadsWithOutreachHistory, 1);
  assert.equal(r.leadsWithCallScript, 1);
  const s = JSON.stringify(r);
  for (const pii of ["Fixture Google", "+44", "Fixture St", "info@"]) assert.ok(!s.includes(pii), pii);
});

test("real run cleans Google data and keeps CRM data", async () => {
  const { ctx, tables } = fakeCtx(seed());
  const untouched = structuredClone(["g4", "o1", "m1"].map((id) => tables.get("leads")!.find((l) => l._id === id)));
  await migrateLeads(ctx as never, tables.get("leads") as never, false);
  const L = (id: string) => tables.get("leads")!.find((l) => l._id === id)!;
  const P = (id: string) => tables.get("previews")!.find((p) => p._id === id)!;
  const g1 = L("g1");
  for (const k of ["name", "phone", "address", "website", "rating", "reviewsCount", "category"]) assert.equal(g1[k], undefined, k);
  assert.equal(g1.email, "info@fixture.test");
  assert.equal(g1.instagram, "fixture1");
  assert.equal(g1.stage, "approached");
  assert.equal(g1.callScript, "texto");
  const c1 = P("p1").content as Record<string, unknown>;
  assert.equal(c1.name, "");
  assert.equal(c1.phone, undefined);
  assert.equal((P("p2").content as { name: string }).name, "Fixture Google Dois");
  assert.equal((P("p3").content as { name: string }).name, "Fixture Editado");
  assert.deepEqual(["g4", "o1", "m1"].map(L), untouched);
});

test("second real run is a no-op", async () => {
  const { ctx, tables } = fakeCtx(seed());
  await migrateLeads(ctx as never, tables.get("leads") as never, false);
  const r = await migrateLeads(ctx as never, tables.get("leads") as never, false);
  assert.equal(r.leadsCleaned, 0);
  assert.equal(r.previewsCleaned, 0);
});

test("mergeReports sums and concatenates ids", () => {
  const a = { ...emptyReport(), leadsScanned: 2, publishedNameKeptLeadIds: ["x"] };
  const b = { ...emptyReport(), leadsScanned: 3, publishedNameKeptLeadIds: ["y"] };
  const m = mergeReports(a, b);
  assert.equal(m.leadsScanned, 5);
  assert.deepEqual(m.publishedNameKeptLeadIds, ["x", "y"]);
});

test("googleCompliance.ts: dev guard first, loop via migrateBatch, no console", () => {
  const src = readFileSync(new URL("../convex/googleCompliance.ts", import.meta.url), "utf8");
  assert.match(src, /seedDevFixtures = internalMutation\(\{[^]*?handler: async \(ctx, \{ orgId \}\) => \{\s*\n\s*if \(!isDevEnv\(\)\) throw/);
  assert.ok(src.includes("internal.googleCompliance.migrateBatch"));
  assert.ok(!src.includes("console."));
});
