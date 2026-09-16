import { test } from "node:test";
import assert from "node:assert/strict";
import { currencyForCountry, currencySymbol, formatMoney } from "../convex/lib/domain.ts";

/** Timestamps SEMPRE pelo construtor local (nunca string ISO com Z): o CI em UTC não pode mentir. */
const T = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();
void T;

// ---------------------------------------------------------------------------
// Moeda
// ---------------------------------------------------------------------------

test("currencyForCountry: GB/SE/NO/CH/DK têm moeda própria; qualquer outro é EUR", () => {
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("SE"), "SEK");
  assert.equal(currencyForCountry("NO"), "NOK");
  assert.equal(currencyForCountry("CH"), "CHF");
  assert.equal(currencyForCountry("DK"), "DKK");
  assert.equal(currencyForCountry("NL"), "EUR");
  assert.equal(currencyForCountry("XX"), "EUR");
  assert.equal(currencyForCountry("gb"), "GBP");
});

test("currencySymbol", () => {
  assert.equal(currencySymbol("EUR"), "€");
  assert.equal(currencySymbol("GBP"), "£");
  assert.equal(currencySymbol("SEK"), "kr");
  assert.equal(currencySymbol("NOK"), "kr");
  assert.equal(currencySymbol("DKK"), "kr");
  assert.equal(currencySymbol("CHF"), "CHF");
});

test("formatMoney: quatro formatos, sem centavos, milhar com ponto", () => {
  assert.equal(formatMoney(340, "EUR"), "€340");
  assert.equal(formatMoney(340, "GBP"), "£340");
  assert.equal(formatMoney(340, "SEK"), "340 kr");
  assert.equal(formatMoney(340, "NOK"), "340 kr");
  assert.equal(formatMoney(340, "DKK"), "340 kr");
  assert.equal(formatMoney(340, "CHF"), "CHF 340");
  assert.equal(formatMoney(1200, "EUR"), "€1.200");
  assert.equal(formatMoney(1234567, "GBP"), "£1.234.567");
  assert.equal(formatMoney(339.5, "EUR"), "€340");
  assert.equal(formatMoney(339.4, "EUR"), "€339");
  assert.equal(formatMoney(0, "EUR"), "€0");
});
