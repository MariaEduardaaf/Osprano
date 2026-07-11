import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  isEmailable,
  inferLegalForm,
  inferContactType,
  clampDiscoveryCount,
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

test("computeScore: noSite is the heaviest single signal", () => {
  assert.equal(computeScore({ ...NONE, noSite: true }), 55);
  // no-site + a secondary signal reaches the "hot" tier
  assert.equal(tierFromScore(computeScore({ ...NONE, noSite: true, sparseProfile: true })), "hot");
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

test("isEmailable: needs positive evidence (incorporated or role inbox)", () => {
  // bare launch market, no evidence → not defensible
  assert.equal(isEmailable({ countryCode: "GB" }), false);
  assert.equal(isEmailable({ countryCode: "NL" }), false);
  // positive evidence unlocks it
  assert.equal(isEmailable({ countryCode: "GB", legalForm: "incorporated" }), true);
  assert.equal(isEmailable({ countryCode: "NL", contactType: "role" }), true);
});

test("isEmailable: opt-in market always blocked", () => {
  assert.equal(isEmailable({ countryCode: "DE", legalForm: "incorporated" }), false);
  assert.equal(isEmailable({ countryCode: "CH", contactType: "role" }), false);
});

test("isEmailable: sole-trader trap", () => {
  assert.equal(isEmailable({ countryCode: "GB", legalForm: "sole_trader" }), false);
  assert.equal(isEmailable({ countryCode: "GB", contactType: "named" }), false);
  // named individual beats incorporation (a person = opt-in)
  assert.equal(
    isEmailable({ countryCode: "GB", legalForm: "incorporated", contactType: "named" }),
    false,
  );
  assert.equal(
    isEmailable({ countryCode: "GB", legalForm: "incorporated", contactType: "role" }),
    true,
  );
});

test("inferLegalForm: name suffix", () => {
  assert.equal(inferLegalForm("Smith & Sons Ltd", "GB"), "incorporated");
  assert.equal(inferLegalForm("Jansen B.V.", "NL"), "incorporated");
  assert.equal(inferLegalForm("Nordic Bygg AS", "NO"), "incorporated");
  assert.equal(inferLegalForm("The Corner Café", "GB"), "unknown");
  assert.equal(inferLegalForm("Padaria X", "PT"), "unknown"); // non-launch market
});

test("inferContactType: role vs named", () => {
  assert.equal(inferContactType("info@x.co.uk"), "role");
  assert.equal(inferContactType("bookings2024@x.com"), "role");
  assert.equal(inferContactType("john.smith@x.com"), "named");
  assert.equal(inferContactType("maria@x.com"), "named");
  assert.equal(inferContactType(undefined), "unknown");
  assert.equal(inferContactType("x1y2z3@x.com"), "unknown");
});

test("clampDiscoveryCount: default when undefined", () => {
  assert.equal(clampDiscoveryCount(undefined), 20);
});

test("clampDiscoveryCount: floor at 1 for negative/zero", () => {
  assert.equal(clampDiscoveryCount(-5), 1);
  assert.equal(clampDiscoveryCount(0), 1);
});

test("clampDiscoveryCount: non-finite falls back to default", () => {
  assert.equal(clampDiscoveryCount(Number.NaN), 20);
});

test("clampDiscoveryCount: rounds decimals", () => {
  assert.equal(clampDiscoveryCount(3.6), 4);
});

test("clampDiscoveryCount: ceiling at 50", () => {
  assert.equal(clampDiscoveryCount(999), 50);
});

test("clampDiscoveryCount: exact boundaries", () => {
  assert.equal(clampDiscoveryCount(1), 1);
  assert.equal(clampDiscoveryCount(50), 50);
});
