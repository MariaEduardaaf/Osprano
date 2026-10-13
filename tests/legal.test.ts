import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEGAL_DOCS,
  LEGAL_IDENTITY,
  LEGAL_VERSION,
  displayValue,
  formatLegalDate,
  isAccepted,
  legalHref,
  legalPlaceholders,
  PLACEHOLDER,
} from "../convex/lib/legal.ts";

test("placeholders listam o que falta", () => {
  const pending = ["legalName", "taxId", "address", "supportEmail", "privacyEmail", "euRepresentative"];
  const partial = Object.fromEntries(
    Object.entries(LEGAL_IDENTITY).map(([k, v]) => [k, pending.includes(k) ? PLACEHOLDER : v]),
  ) as typeof LEGAL_IDENTITY;
  const p = legalPlaceholders(partial);
  for (const k of pending) {
    assert.ok(p.includes(k as never), k);
  }
  for (const k of ["brand", "taxIdLabel", "country"]) assert.ok(!p.includes(k as never), k);
});

test("identidade preenchida não tem placeholder", () => {
  const full = Object.fromEntries(Object.keys(LEGAL_IDENTITY).map((k) => [k, "x"])) as typeof LEGAL_IDENTITY;
  assert.deepEqual(legalPlaceholders(full), []);
});

test("euRepresentative vazio (não aplicável) não é placeholder", () => {
  assert.ok(!legalPlaceholders({ ...LEGAL_IDENTITY, euRepresentative: "" }).includes("euRepresentative"));
});

test("displayValue", () => {
  assert.equal(displayValue(PLACEHOLDER), "[a preencher]");
  assert.equal(displayValue("x@y.com"), "x@y.com");
});

test("formatLegalDate", () => {
  assert.equal(formatLegalDate("2026-10-12"), "12/10/2026");
});

test("isAccepted: sem workspace ou vazio", () => {
  assert.equal(isAccepted(null), false);
  assert.equal(isAccepted(undefined), false);
  assert.equal(isAccepted({}), false);
});

test("isAccepted: versão antiga", () => {
  assert.equal(isAccepted({ termsVersion: "2000-01-01", professionalUse: true }), false);
});

test("isAccepted: sem uso profissional", () => {
  assert.equal(isAccepted({ termsVersion: LEGAL_VERSION }), false);
});

test("isAccepted: versão atual + uso profissional", () => {
  assert.equal(isAccepted({ termsVersion: LEGAL_VERSION, professionalUse: true }), true);
  assert.equal(isAccepted({ termsVersion: "v2", professionalUse: true }, "v2"), true);
});

test("LEGAL_DOCS", () => {
  assert.deepEqual(
    LEGAL_DOCS.map((d) => d.slug),
    ["empresa", "termos", "privacidade", "dpa", "subprocessadores", "cookies", "aviso-prospect"],
  );
  assert.ok(LEGAL_DOCS.every((d) => !d.title.includes("—")));
  assert.equal(legalHref("termos"), "/legal/termos");
});
