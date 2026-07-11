process.env.STRIPE_PRICE_PRO = "price_pro";
process.env.STRIPE_PRICE_AGENCY = "price_agency";

import { test } from "node:test";
import assert from "node:assert/strict";
import { planForPrice } from "../convex/lib/stripe.ts";

test("planForPrice: STRIPE_PRICE_PRO maps to pro", () => {
  assert.equal(planForPrice("price_pro"), "pro");
});

test("planForPrice: STRIPE_PRICE_AGENCY maps to agency", () => {
  assert.equal(planForPrice("price_agency"), "agency");
});

test("planForPrice: unknown price_id is undefined (fail-safe)", () => {
  assert.equal(planForPrice("price_desconhecido"), undefined);
});

test("planForPrice: undefined price_id is undefined", () => {
  assert.equal(planForPrice(undefined), undefined);
});

test("planForPrice: empty string price_id is undefined", () => {
  assert.equal(planForPrice(""), undefined);
});
