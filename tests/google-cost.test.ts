import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "../convex/lib/domain.ts";
import { DETAILS_FIELDS_FULL, DETAILS_PRICE_USD_PER_1000, skuForFields } from "../convex/lib/placesFields.ts";

const perQuery = DETAILS_PRICE_USD_PER_1000[skuForFields(DETAILS_FIELDS_FULL)] / 1000;
const worst = (p: keyof typeof PLANS) => PLANS[p].detailsPerMonth * perQuery;

test("solo, pro e agency: pior caso de Place Details <= 15% do preço", () => {
  for (const p of ["solo", "pro", "agency"] as const) assert.ok(worst(p) <= PLANS[p].price * 0.15, p);
});

test("trial: pior caso <= US$ 1", () => {
  assert.ok(worst("trial") <= 1);
});
