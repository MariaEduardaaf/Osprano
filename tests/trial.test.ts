import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { purgeOrgBatch } from "../convex/model/purge.ts";
import { normalizeEmail } from "../convex/lib/domain.ts";
import {
  claimTrial,
  grantPlanFor,
  migrateFreeBatch,
  orgIdForEmail,
  trialEmail,
  trialKey,
} from "../convex/model/plans.ts";

const ws = (orgId: string, extra: Record<string, unknown> = {}) => ({
  _id: `ws_${orgId}`,
  _creationTime: 100,
  orgId,
  plan: "trial",
  leadsUsed: 5,
  sitesUsed: 5,
  detailsUsed: 5,
  periodStart: 1,
  ...extra,
});
const setup = (rows: Array<Record<string, unknown>>, claims: Array<Record<string, unknown>> = []) => {
  const f = fakeCtx({ workspaces: rows, trialClaims: claims });
  return { ...f, c: f.ctx as never };
};

test("trialKey: same person, same key, hashed", async () => {
  const a = await trialKey({ email: " Ana@X.com ", subject: "u1" });
  const b = await trialKey({ email: "ana@x.com", subject: "u2" });
  assert.equal(a.key, b.key);
  assert.equal(a.via, "email");
  assert.match(a.key, /^[0-9a-f]{64}$/);
  assert.ok(!a.key.includes("ana"));
  assert.equal((await trialKey({ email: "ana+1@x.com", subject: "" })).key, (await trialKey({ email: "ana@x.com", subject: "" })).key);
  const s = await trialKey({ subject: "u1" });
  assert.equal(s.via, "subject");
  assert.notEqual(s.key, a.key);
});

test("trialEmail: gmail dots and +tag; other domains keep dots", () => {
  assert.equal(trialEmail("Ana.Maria+promo@GMAIL.com"), "anamaria@gmail.com");
  assert.equal(trialEmail("a.na@googlemail.com"), "ana@gmail.com");
  assert.equal(trialEmail("jo.ao+x@empresa.pt"), "jo.ao@empresa.pt");
  assert.equal(normalizeEmail("a.b+c@gmail.com"), "a.b+c@gmail.com");
});

test("claimTrial: first claim inserts, repeat is idempotent, other org is marked spent", async () => {
  const { c, tables } = setup([ws("A"), ws("B"), ws("C", { plan: "solo" }), ws("F", { plan: "free" })]);
  const claim = { key: "k1", via: "email" as const };
  await claimTrial(c, "A", claim, 1000);
  assert.deepEqual(tables.get("trialClaims")!.map((r) => [r.orgId, r.claimedAt]), [["A", 1000]]);
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "A")!.trialSpent, undefined);
  await claimTrial(c, "A", claim, 2000);
  assert.equal(tables.get("trialClaims")!.length, 1);
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "A")!.trialSpent, undefined);

  await claimTrial(c, "B", claim);
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "B")!.trialSpent, true);
  await claimTrial(c, "C", claim);
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "C")!.trialSpent, undefined);
  await claimTrial(c, "F", claim);
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "F")!.trialSpent, true);
  assert.equal(tables.get("trialClaims")!.length, 1);
});

test("claimTrial: recreated workspace with same orgId is spent; normal re-accept is not", async () => {
  const claims = [{ key: "k", orgId: "A", via: "email", claimedAt: 500 }];
  const recreated = setup([ws("A", { _creationTime: 900 })], claims);
  await claimTrial(recreated.c, "A", { key: "k", via: "email" });
  assert.equal(recreated.tables.get("workspaces")![0].trialSpent, true);

  const normal = setup([ws("A", { _creationTime: 400 })], claims);
  await claimTrial(normal.c, "A", { key: "k", via: "email" });
  assert.equal(normal.tables.get("workspaces")![0].trialSpent, undefined);
});

test("claimTrial: workspace created after frozen now keeps claimedAt = creation, re-claim not spent", async () => {
  const { c, tables } = setup([ws("A", { _creationTime: 5000 })]);
  const claim = { key: "k", via: "email" as const };
  await claimTrial(c, "A", claim, 4000);
  assert.equal(tables.get("trialClaims")![0].claimedAt, 5000);
  await claimTrial(c, "A", claim, 6000);
  assert.equal(tables.get("workspaces")![0].trialSpent, undefined);
});

test("purge keeps trialClaims", async () => {
  const { c, tables } = setup([ws("A")], [{ key: "k", orgId: "A", via: "email", claimedAt: 1 }]);
  tables.set("leads", [{ _id: "l1", orgId: "A" }]);
  let done = false;
  for (let i = 0; i < 50 && !done; i++) done = (await purgeOrgBatch(c, "A")).done;
  assert.ok(done);
  assert.equal(tables.get("workspaces")!.length, 0);
  assert.equal(tables.get("trialClaims")!.length, 1);
});

test("orgIdForEmail", async () => {
  const { key } = await trialKey({ email: "ana@x.com", subject: "" });
  const { c } = setup([], [{ key, orgId: "A", via: "email", claimedAt: 1 }]);
  assert.equal(await orgIdForEmail(c, "ANA@x.com"), "A");
  assert.equal(await orgIdForEmail(c, "outra@x.com"), null);
});

test("grantPlanFor resets usage, creates missing workspace", async () => {
  const { c, tables } = setup([ws("B", { trialSpent: true, aiUsed: 9, verificationsUsed: 9 })]);
  await grantPlanFor(c, "B", "agency", 7777);
  const b = tables.get("workspaces")!.find((w) => w.orgId === "B")!;
  assert.deepEqual(
    [b.plan, b.trialSpent, b.leadsUsed, b.sitesUsed, b.detailsUsed, b.aiUsed, b.verificationsUsed, b.periodStart],
    ["agency", false, 0, 0, 0, 0, 0, 7777],
  );
  await grantPlanFor(c, "N", "solo");
  assert.equal(tables.get("workspaces")!.find((w) => w.orgId === "N")!.plan, "solo");
});

test("migrateFreeBatch dry run and real", async () => {
  const { c, tables } = setup([ws("A", { plan: "free" }), ws("B", { plan: "free" }), ws("C", { plan: "pro" })]);
  assert.deepEqual(await migrateFreeBatch(c, true), { found: 2, migrated: 0 });
  assert.equal(tables.get("workspaces")!.filter((w) => w.plan === "free").length, 2);
  assert.deepEqual(await migrateFreeBatch(c, false), { found: 2, migrated: 2 });
  assert.deepEqual(tables.get("workspaces")!.map((w) => w.plan), ["trial", "trial", "pro"]);
});
