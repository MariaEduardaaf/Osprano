import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";

type Db = {
  query: (t: string) => {
    withIndex: (n: string, f: (q: { eq: (a: string, b: unknown) => unknown }) => unknown) => {
      collect: () => Promise<unknown[]>;
    };
  };
  get: (id: string) => Promise<unknown>;
  insert: (t: string, d: object) => Promise<string>;
  patch: (id: string, d: object) => Promise<void>;
  delete: (id: string) => Promise<void>;
  system: { get: (t: string, id: string) => Promise<unknown> };
};
type Ctx = { db: Db; storage: { delete: (id: string) => Promise<void> } };

test("query/withIndex/eq filtra por org", async () => {
  const { ctx } = fakeCtx({ leads: [{ _id: "l1", orgId: "A" }, { _id: "l2", orgId: "B" }, { _id: "l3" }] });
  const rows = await (ctx as Ctx).db.query("leads").withIndex("by_org", (q) => q.eq("orgId", "A")).collect();
  assert.deepEqual(rows.map((r) => (r as { _id: string })._id), ["l1"]);
});

test("insert, get, patch, delete", async () => {
  const { ctx } = fakeCtx();
  const { db } = ctx as Ctx;
  const id = await db.insert("workspaces", { orgId: "A" });
  await db.patch(id, { plan: "pro" });
  assert.deepEqual(await db.get(id), { orgId: "A", plan: "pro", _id: id });
  await db.delete(id);
  assert.equal(await db.get(id), null);
});

test("system.get _storage reflete storage.delete", async () => {
  const { ctx, storage } = fakeCtx({}, ["s1"]);
  const c = ctx as Ctx;
  assert.ok(await c.db.system.get("_storage", "s1"));
  await c.storage.delete("s1");
  assert.equal(await c.db.system.get("_storage", "s1"), null);
  assert.equal(storage.size, 0);
});
