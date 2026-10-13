import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import {
  addSuppression,
  globalizeOrgSuppression,
  isEmailSuppressed,
  suppressByToken,
} from "../convex/model/suppressions.ts";

type Seed = Record<string, Array<Record<string, unknown>>>;
const withIds = (s: Seed) => {
  let n = 0;
  for (const rows of Object.values(s)) for (const r of rows) r._id ??= `row${++n}`;
  return s;
};
const sup = (rows: Array<Record<string, unknown>>) => fakeCtx(withIds({ suppressions: rows }));

test("isEmailSuppressed: global vale para qualquer org", async () => {
  const { ctx } = sup([{ email: "x@y.com" }]);
  assert.equal(await isEmailSuppressed(ctx as never, { email: "x@y.com", orgId: "B" }), true);
});

test("isEmailSuppressed: manual de uma org não vaza para outra", async () => {
  const { ctx } = sup([{ orgId: "A", email: "x@y.com", source: "manual" }]);
  assert.equal(await isEmailSuppressed(ctx as never, { email: "x@y.com", orgId: "A" }), true);
  assert.equal(await isEmailSuppressed(ctx as never, { email: "x@y.com", orgId: "B" }), false);
});

test("isEmailSuppressed: descadastro legado por org vale para todos", async () => {
  const { ctx } = sup([{ orgId: "A", email: "x@y.com", source: "unsubscribe_link" }]);
  assert.equal(await isEmailSuppressed(ctx as never, { email: "x@y.com", orgId: "B" }), true);
});

test("isEmailSuppressed: sem linha = false", async () => {
  const { ctx } = sup([]);
  assert.equal(await isEmailSuppressed(ctx as never, { email: "x@y.com", orgId: "A" }), false);
});

test("suppressByToken: grava 1 global, idempotente", async () => {
  const { ctx, tables } = fakeCtx(
    withIds({
      outreach: [{ unsubscribeToken: "t1", leadId: "l1", orgId: "A" }],
      leads: [{ _id: "l1", email: " X@Y.com " }],
    }),
  );
  await suppressByToken(ctx as never, "t1");
  await suppressByToken(ctx as never, "t1");
  const rows = tables.get("suppressions")!;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "x@y.com");
  assert.equal(rows[0].orgId, undefined);
  assert.equal(rows[0].source, "unsubscribe_link");
});

test("suppressByToken: token desconhecido ou lead sem e-mail não cria nada", async () => {
  const { ctx, tables } = fakeCtx(
    withIds({
      outreach: [{ unsubscribeToken: "t2", leadId: "l2", orgId: "A" }],
      leads: [{ _id: "l2" }],
    }),
  );
  await suppressByToken(ctx as never, "nope");
  await suppressByToken(ctx as never, "t2");
  assert.equal((tables.get("suppressions") ?? []).length, 0);
});

test("addSuppression: idempotente global e por org", async () => {
  const { ctx, tables } = fakeCtx();
  await addSuppression(ctx as never, { email: "a@x.com", source: "manual" });
  await addSuppression(ctx as never, { email: "a@x.com", source: "manual" });
  await addSuppression(ctx as never, { email: "a@x.com", orgId: "A", source: "manual" });
  await addSuppression(ctx as never, { email: "a@x.com", orgId: "A", source: "manual" });
  assert.equal(tables.get("suppressions")!.length, 2);
});

test("globalizeOrgSuppression: vira global ou some se a global já existe", async () => {
  const { ctx, tables } = sup([
    { orgId: "A", email: "a@x.com", leadId: "l1" },
    { orgId: "A", email: "g@x.com" },
    { email: "g@x.com" },
  ]);
  const rows = tables.get("suppressions")!;
  await globalizeOrgSuppression(ctx as never, rows[0] as never);
  await globalizeOrgSuppression(ctx as never, rows[1] as never);
  const now = tables.get("suppressions")!;
  assert.equal(now.length, 2);
  assert.ok(now.every((r) => r.orgId === undefined && r.leadId === undefined));
  assert.deepEqual(now.map((r) => r.email).sort(), ["a@x.com", "g@x.com"]);
});
