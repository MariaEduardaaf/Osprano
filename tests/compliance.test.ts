import { test } from "node:test";
import assert from "node:assert/strict";
import { optOutFooter, senderIdentityFrom } from "../convex/lib/compliance.ts";

const URL = "https://x.convex.site/unsubscribe?token=abc";

test("optOutFooter: English includes url + sender and starts with the separator", () => {
  const footer = optOutFooter("English", URL, "Ana");
  assert.ok(footer.includes("abc"));
  assert.ok(footer.includes("Ana"));
  assert.ok(footer.startsWith("\n\n—\n"));
});

test("optOutFooter: Dutch includes url and its own copy", () => {
  const footer = optOutFooter("Dutch", URL, "Ana");
  assert.ok(footer.includes(URL));
  assert.ok(footer.includes("Afmelden"));
});

test("optOutFooter: Swedish copy", () => {
  const footer = optOutFooter("Swedish", URL, "Ana");
  assert.ok(footer.includes("Avregistrera"));
});

test("optOutFooter: Norwegian copy", () => {
  const footer = optOutFooter("Norwegian", URL, "Ana");
  assert.ok(footer.includes("Meld deg av"));
});

test("optOutFooter: Spanish copy", () => {
  const footer = optOutFooter("Spanish", URL, "Ana");
  assert.ok(footer.includes(URL));
  assert.ok(footer.includes("baja"));
  assert.ok(footer.startsWith("\n\n—\n"));
});

test("optOutFooter: Italian copy", () => {
  const footer = optOutFooter("Italian", URL, "Ana");
  assert.ok(footer.includes("Annulla"));
});

test("optOutFooter: Portuguese copy", () => {
  const footer = optOutFooter("Portuguese", URL, "Ana");
  assert.ok(footer.includes("Cancelar"));
});

test("optOutFooter: German copy", () => {
  const footer = optOutFooter("German", URL, "Ana");
  assert.ok(footer.includes("Abmelden"));
});

test("optOutFooter: Danish copy", () => {
  const footer = optOutFooter("Danish", URL, "Ana");
  assert.ok(footer.includes("Afmeld"));
});

test("optOutFooter: unknown language falls back to English", () => {
  const footer = optOutFooter("Klingon", URL, "Ana");
  assert.ok(footer.includes(URL));
});

test("senderIdentityFrom: extracts the display name", () => {
  assert.equal(senderIdentityFrom("Ana <ana@osprano.com>"), "Ana");
});

test("senderIdentityFrom: bare email passes through", () => {
  assert.equal(senderIdentityFrom("ana@osprano.com"), "ana@osprano.com");
});

test("senderIdentityFrom: trims surrounding whitespace", () => {
  assert.equal(senderIdentityFrom("  Team Osprano  <hi@osprano.com> "), "Team Osprano");
});
