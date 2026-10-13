import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { purgeOrgBatch } from "../convex/model/purge.ts";

function seed() {
  const s: Record<string, Array<Record<string, unknown>>> = {
    leads: [], previews: [], uploads: [], events: [], outreach: [], suppressions: [], users: [], workspaces: [],
  };
  const storage: string[] = [];
  const addLead = (org: string, id: string, full: boolean) => {
    s.leads.push({ _id: id, orgId: org });
    s.previews.push({ orgId: org, leadId: id });
    storage.push(`st_${id}`);
    s.uploads.push({ orgId: org, leadId: id, storageId: `st_${id}` });
    if (full) {
      s.events.push({ orgId: org, leadId: id });
      s.outreach.push({ orgId: org, leadId: id });
    }
  };
  for (let i = 0; i < 25; i++) addLead("A", `la${i}`, true);
  addLead("B", "lb0", false);
  addLead("B", "lb1", false);
  s.events.push({ orgId: "A" });
  storage.push("st_orphan");
  s.uploads.push({ orgId: "A", leadId: "gone", storageId: "st_orphan" });
  s.suppressions.push({ orgId: "A", email: "a@x.com" }, { email: "g@x.com" }, { orgId: "B", email: "b@x.com" }, { orgId: "A", email: "g@x.com" });
  s.users.push({ clerkId: "A" });
  s.workspaces.push({ orgId: "A" }, { orgId: "B" });
  let n = 0;
  for (const rows of Object.values(s)) for (const r of rows) r._id ??= `row${++n}`;
  return { s, storage };
}

test("purgeOrgBatch: first call is partial, loop wipes org A only", async () => {
  const { s, storage } = seed();
  const { ctx, tables, storage: live } = fakeCtx(s, storage);
  const c = ctx as never;
  const before = tables.get("leads")!.length;
  assert.deepEqual(await purgeOrgBatch(c, "A"), { done: false });
  assert.ok(before - tables.get("leads")!.length <= 20);

  let done = false;
  for (let i = 0; i < 50 && !done; i++) done = (await purgeOrgBatch(c, "A")).done;
  assert.ok(done);

  for (const t of ["leads", "previews", "events", "outreach", "uploads", "suppressions", "workspaces"])
    assert.equal(tables.get(t)!.filter((r) => r.orgId === "A").length, 0, t);
  assert.equal(tables.get("users")!.length, 0);
  assert.deepEqual([...live].filter((id) => id.startsWith("st_la") || id === "st_orphan"), []);

  const globals = tables.get("suppressions")!.filter((r) => r.orgId === undefined);
  assert.deepEqual(globals.map((r) => r.email).sort(), ["a@x.com", "g@x.com"]);
  assert.equal(tables.get("leads")!.filter((r) => r.orgId === "B").length, 2);
  assert.equal(tables.get("previews")!.filter((r) => r.orgId === "B").length, 2);
  assert.equal(tables.get("suppressions")!.filter((r) => r.orgId === "B").length, 1);
  assert.equal(tables.get("workspaces")!.filter((r) => r.orgId === "B").length, 1);
  assert.ok(live.has("st_lb0") && live.has("st_lb1"));
});

test("purgeOrgBatch: empty org is done immediately", async () => {
  const { ctx } = fakeCtx();
  assert.deepEqual(await purgeOrgBatch(ctx as never, "Z"), { done: true });
});
