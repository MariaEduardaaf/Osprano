import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  isEmailable,
  type Signals,
} from "../convex/lib/domain.ts";

const NONE: Signals = {
  noSite: false,
  socialOnly: false,
  noHttps: false,
  notMobile: false,
  slow: false,
  sparseProfile: false,
};

test("classifyWebsite: real site", () => {
  const r = classifyWebsite("https://www.padaria-central.co.uk");
  assert.equal(r.hasRealSite, true);
  assert.equal(r.socialOnly, false);
  assert.equal(r.host, "padaria-central.co.uk");
});

test("classifyWebsite: Instagram = social-only", () => {
  const r = classifyWebsite("https://instagram.com/barbeariax");
  assert.equal(r.hasRealSite, false);
  assert.equal(r.socialOnly, true);
});

test("classifyWebsite: Linktree = social-only", () => {
  assert.equal(classifyWebsite("https://linktr.ee/x").socialOnly, true);
});

test("classifyWebsite: delivery link = social-only", () => {
  assert.equal(classifyWebsite("https://lieferando.de/restaurant-x").socialOnly, true);
});

test("classifyWebsite: empty = no site, not social", () => {
  const r = classifyWebsite("");
  assert.equal(r.hasRealSite, false);
  assert.equal(r.socialOnly, false);
});

test("computeScore: no signals = 0", () => {
  assert.equal(computeScore(NONE), 0);
});

test("computeScore: noSite weighs 45", () => {
  assert.equal(computeScore({ ...NONE, noSite: true }), 45);
});

test("computeScore: caps at 100", () => {
  const all: Signals = {
    noSite: true,
    socialOnly: true,
    noHttps: true,
    notMobile: true,
    slow: true,
    sparseProfile: true,
  };
  assert.equal(computeScore(all), 100);
});

test("tierFromScore thresholds", () => {
  assert.equal(tierFromScore(80), "hot");
  assert.equal(tierFromScore(70), "hot");
  assert.equal(tierFromScore(50), "warm");
  assert.equal(tierFromScore(40), "warm");
  assert.equal(tierFromScore(10), "cold");
});

test("isEmailable: opt-out market OK", () => {
  assert.equal(isEmailable({ countryCode: "GB" }), true);
  assert.equal(isEmailable({ countryCode: "NL" }), true);
});

test("isEmailable: opt-in market blocked", () => {
  assert.equal(isEmailable({ countryCode: "DE" }), false);
  assert.equal(isEmailable({ countryCode: "CH" }), false);
});

test("isEmailable: sole-trader trap", () => {
  assert.equal(isEmailable({ countryCode: "GB", legalForm: "sole_trader" }), false);
  assert.equal(isEmailable({ countryCode: "GB", contactType: "named" }), false);
  assert.equal(
    isEmailable({ countryCode: "GB", legalForm: "incorporated", contactType: "role" }),
    true,
  );
});
