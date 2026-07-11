import { test } from "node:test";
import assert from "node:assert/strict";
import { isDemoEnabled } from "../convex/model/tenant.ts";

test("isDemoEnabled: true only with DEMO_MODE=1 and CONVEX_ENV=development", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: "1", CONVEX_ENV: "development" }), true);
});

test("isDemoEnabled: default-deny — CONVEX_ENV unset means off even with DEMO_MODE=1", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: "1", CONVEX_ENV: undefined }), false);
});

test("isDemoEnabled: off when CONVEX_ENV=production", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: "1", CONVEX_ENV: "production" }), false);
});

test("isDemoEnabled: off when DEMO_MODE unset, even in development", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: undefined, CONVEX_ENV: "development" }), false);
});

test("isDemoEnabled: off when DEMO_MODE=0", () => {
  assert.equal(isDemoEnabled({ DEMO_MODE: "0", CONVEX_ENV: "development" }), false);
});
