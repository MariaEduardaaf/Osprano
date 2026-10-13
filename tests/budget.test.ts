import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { chargeBudget, budgetStatusFor } from "../convex/model/budget.ts";
import { COST_USD } from "../convex/lib/budget.ts";
import { DETAILS_FIELDS_FULL, DETAILS_FIELDS_LIST, DETAILS_PRICE_USD_PER_1000, skuForFields } from "../convex/lib/placesFields.ts";

const NOW = Date.UTC(2026, 9, 13);
const setup = (usd?: number, extra: Record<string, unknown> = {}) => {
  const f = fakeCtx(usd === undefined ? {} : { spend: [{ _id: "s1", month: "2026-10", usd, ...extra }] });
  return { ctx: f.ctx as never, rows: () => f.tables.get("spend") ?? [] };
};

test("COST_USD", () => {
  assert.equal(COST_USD.textSearch, 0.035);
  assert.equal(COST_USD.detailsFull, DETAILS_PRICE_USD_PER_1000[skuForFields(DETAILS_FIELDS_FULL)] / 1000);
  assert.equal(COST_USD.detailsList, DETAILS_PRICE_USD_PER_1000[skuForFields(DETAILS_FIELDS_LIST)] / 1000);
  assert.equal(COST_USD.ai, 0.01);
});

test("cria a linha do mês e soma nas seguintes", async () => {
  const { ctx, rows } = setup();
  await chargeBudget(ctx, 1, NOW);
  assert.deepEqual(rows().map((r) => [r.month, r.usd]), [["2026-10", 1]]);
  await chargeBudget(ctx, 2, NOW);
  assert.equal(rows().length, 1);
  assert.equal(rows()[0].usd, 3);
});

test("cruzar 80% grava warnedAt uma vez", async () => {
  const { ctx, rows } = setup(23.9);
  const err = console.error;
  console.error = () => {};
  try {
    await chargeBudget(ctx, 0.2, NOW);
    assert.equal(rows()[0].warnedAt, NOW);
    await chargeBudget(ctx, 0.2, NOW + 1000);
    assert.equal(rows()[0].warnedAt, NOW);
  } finally {
    console.error = err;
  }
});

test("estourar o teto recusa e não grava", async () => {
  const { ctx, rows } = setup(29.99);
  const err = console.error;
  console.error = () => {};
  try {
    await assert.rejects(() => chargeBudget(ctx, 0.035, NOW), /Pausamos as buscas no Google e a IA por segurança/);
  } finally {
    console.error = err;
  }
  assert.equal(rows()[0].usd, 29.99);
});

test("outro mês não herda gasto", async () => {
  const { ctx, rows } = setup(29.99);
  await chargeBudget(ctx, 1, Date.UTC(2026, 10, 1));
  assert.equal(rows().length, 2);
  assert.equal(rows()[1].usd, 1);
});

test("usd 0 ou negativo é no-op", async () => {
  const { ctx, rows } = setup();
  await chargeBudget(ctx, 0, NOW);
  await chargeBudget(ctx, -1, NOW);
  assert.equal(rows().length, 0);
});

test("budgetStatusFor", async () => {
  assert.deepEqual(await budgetStatusFor(setup().ctx, NOW), {
    month: "2026-10", usdSpent: 0, budgetUsd: 30, percent: 0, warnedAt: null,
  });
  const s = await budgetStatusFor(setup(15.4, { warnedAt: 5 }).ctx, NOW);
  assert.equal(s.percent, 51);
  assert.equal(s.warnedAt, 5);
});
