import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { LEGAL_VERSION } from "../convex/lib/legal.ts";
import { acceptTermsFor, assertAccepted, reserveUsage } from "../convex/model/workspace.ts";

const wsRows = (t: ReturnType<typeof fakeCtx>["tables"]) => t.get("workspaces") ?? [];

test("acceptTermsFor recusa versão diferente e não cria workspace", async () => {
  const { ctx, tables } = fakeCtx();
  await assert.rejects(acceptTermsFor(ctx as never, "A", "versao-velha"), /desatualizada/);
  assert.equal(wsRows(tables).length, 0);
});

test("acceptTermsFor grava versão, data e uso profissional; idempotente", async () => {
  const { ctx, tables } = fakeCtx();
  await acceptTermsFor(ctx as never, "A", LEGAL_VERSION);
  await acceptTermsFor(ctx as never, "A", LEGAL_VERSION);
  const rows = wsRows(tables);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].termsVersion, LEGAL_VERSION);
  assert.equal(rows[0].professionalUse, true);
  assert.equal(typeof rows[0].termsAcceptedAt, "number");
});

test("reserveUsage sem aceite recusa e não gasta cota", async () => {
  const { ctx, tables } = fakeCtx();
  await assert.rejects(reserveUsage(ctx as never, "B", "leads", 1), /Aceite os Termos/);
  assert.equal(wsRows(tables)[0].leadsUsed, 0);
});

test("reserveUsage passa depois do aceite", async () => {
  const { ctx, tables } = fakeCtx();
  await acceptTermsFor(ctx as never, "B", LEGAL_VERSION);
  await reserveUsage(ctx as never, "B", "leads", 1);
  assert.equal(wsRows(tables)[0].leadsUsed, 1);
});

test("reserveUsage recusa versão antiga", async () => {
  const { ctx } = fakeCtx({
    workspaces: [
      { orgId: "C", plan: "free", leadsUsed: 0, sitesUsed: 0, periodStart: Date.now(), termsVersion: "antiga", professionalUse: true },
    ],
  });
  await assert.rejects(reserveUsage(ctx as never, "C", "leads", 1), /Aceite os Termos/);
});

test("modo demo passa sem aceite", async () => {
  const prev = { d: process.env.DEMO_MODE, c: process.env.CONVEX_ENV };
  process.env.DEMO_MODE = "1";
  process.env.CONVEX_ENV = "development";
  try {
    const { ctx } = fakeCtx();
    await reserveUsage(ctx as never, "demo", "leads", 1);
  } finally {
    if (prev.d === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = prev.d;
    if (prev.c === undefined) delete process.env.CONVEX_ENV; else process.env.CONVEX_ENV = prev.c;
  }
});

test("assertAccepted", () => {
  assert.throws(() => assertAccepted(null, "A"));
  assert.doesNotThrow(() => assertAccepted({ termsVersion: LEGAL_VERSION, professionalUse: true }, "A"));
});
