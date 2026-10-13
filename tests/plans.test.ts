import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLANS, PAID_PLANS, planOf, planLimit, dailyLimit, limitFor, dailyLimitFor, dayKey, monthKey,
} from "../convex/lib/domain.ts";

test("catálogo: quatro planos, preços e limites", () => {
  assert.deepEqual(Object.keys(PLANS), ["trial", "solo", "pro", "agency"]);
  const col = (f: keyof (typeof PLANS)["trial"]) => Object.values(PLANS).map((p) => p[f]);
  assert.deepEqual(col("price"), [0, 29, 59, 149]);
  assert.deepEqual(col("leadsPerMonth"), [25, 150, 500, 1500]);
  assert.deepEqual(col("aiPerMonth"), [25, 300, 1000, 3000]);
  assert.deepEqual(col("detailsPerMonth"), [25, 100, 300, 400]);
  assert.deepEqual(col("sitesPerMonth"), [2, 10, 40, 150]);
  assert.deepEqual(col("verificationsPerMonth"), [25, 150, 500, 1500]);
  assert.deepEqual(col("searchesPerDay"), [6, 15, 30, 60]);
  assert.deepEqual(col("verificationsPerDay"), [25, 30, 100, 300]);
  assert.deepEqual(PAID_PLANS.map((p) => p.id), ["solo", "pro", "agency"]);
});

test("free legado é lido como trial", () => {
  assert.equal(planOf("free"), "trial");
  assert.equal(planLimit("free", "leads"), 25);
  assert.equal(dailyLimit("pro", "searches"), 30);
});

test("teste já usado zera limites, só no trial", () => {
  assert.equal(limitFor({ plan: "trial", trialSpent: true }, "ai"), 0);
  assert.equal(limitFor({ plan: "solo", trialSpent: true }, "ai"), 300);
  assert.equal(dailyLimitFor({ plan: "free", trialSpent: true }, "searches"), 0);
});

test("dayKey e monthKey em UTC", () => {
  assert.equal(dayKey(Date.UTC(2026, 9, 13, 23, 59)), "2026-10-13");
  assert.equal(monthKey(Date.UTC(2026, 9, 13)), "2026-10");
});
