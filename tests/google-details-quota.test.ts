import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { reserveUsage, refundUsage, ensureFresh } from "../convex/model/workspace.ts";
import { planLimit, PLANS } from "../convex/lib/domain.ts";
import { LEGAL_VERSION } from "../convex/lib/legal.ts";

const ws = (extra: Record<string, unknown> = {}) => ({
  _id: "w1",
  orgId: "A",
  plan: "free",
  leadsUsed: 0,
  sitesUsed: 0,
  periodStart: Date.now(),
  termsVersion: LEGAL_VERSION,
  professionalUse: true,
  ...extra,
});
const setup = (extra?: Record<string, unknown>) => {
  const f = fakeCtx({ workspaces: [ws(extra)] });
  return { ctx: f.ctx as never, row: () => f.tables.get("workspaces")![0] };
};

test("limites por plano", () => {
  assert.equal(planLimit("free", "details"), 25);
  assert.equal(planLimit("pro", "details"), 300);
  assert.equal(planLimit("agency", "details"), 400);
  assert.equal(planLimit("solo", "details"), 100);
  assert.equal(PLANS.pro.detailsPerMonth, 300);
});

test("free reserva 25 e o 26o falha", async () => {
  const { ctx, row } = setup();
  await reserveUsage(ctx, "A", "details", 25);
  assert.equal(row().detailsUsed, 25);
  await assert.rejects(() => reserveUsage(ctx, "A", "details", 1), /25 consultas ao Google/);
});

test("refund nunca fica negativo", async () => {
  const { ctx, row } = setup({ detailsUsed: 3 });
  await refundUsage(ctx, "A", "details", 10);
  assert.equal(row().detailsUsed, 0);
});

test("virada do mês zera tudo", async () => {
  const { ctx, row } = setup({ plan: "solo", leadsUsed: 5, sitesUsed: 1, detailsUsed: 9, aiUsed: 4, periodStart: Date.now() - 31 * 864e5 });
  await ensureFresh(ctx, "A");
  assert.equal(row().detailsUsed, 0);
  assert.equal(row().leadsUsed, 0);
  assert.equal(row().sitesUsed, 0);
  assert.equal(row().aiUsed, 0);
});

test("count 0 lança", async () => {
  await assert.rejects(() => reserveUsage(setup().ctx, "A", "details", 0));
});

test("sem aceite lança", async () => {
  await assert.rejects(() => reserveUsage(setup({ termsVersion: undefined }).ctx, "A", "details", 1), /Aceite/);
});

test("regressão leads e sites", async () => {
  const { ctx, row } = setup();
  await reserveUsage(ctx, "A", "leads", 25);
  await reserveUsage(ctx, "A", "sites", 2);
  assert.equal(row().leadsUsed, 25);
  assert.equal(row().sitesUsed, 2);
  await assert.rejects(() => reserveUsage(ctx, "A", "leads", 1), /25 leads/);
  await assert.rejects(() => reserveUsage(ctx, "A", "sites", 1), /2 sites/);
});
