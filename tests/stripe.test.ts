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

// --- stripeDelete ---
import { stripeDelete } from "../convex/lib/stripe.ts";

async function withFetch(status: number, fn: (calls: Array<[string, RequestInit]>) => Promise<void>) {
  const orig = globalThis.fetch;
  const calls: Array<[string, RequestInit]> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    return new Response("{}", { status });
  }) as typeof fetch;
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = orig;
  }
}

test("stripeDelete: 200 returns ok and sends DELETE with bearer", async () => {
  await withFetch(200, async (calls) => {
    assert.equal(await stripeDelete("sk_test", "subscriptions/sub_1"), "ok");
    assert.equal(calls[0][0], "https://api.stripe.com/v1/subscriptions/sub_1");
    assert.equal(calls[0][1].method, "DELETE");
    assert.deepEqual(calls[0][1].headers, { authorization: "Bearer sk_test" });
  });
});

test("stripeDelete: 404 returns gone", async () => {
  await withFetch(404, async () => {
    assert.equal(await stripeDelete("sk_test", "subscriptions/sub_1"), "gone");
  });
});

test("stripeDelete: 500 throws", async () => {
  await withFetch(500, async () => {
    await assert.rejects(stripeDelete("sk_test", "subscriptions/sub_1"), /Stripe respondeu 500/);
  });
});
