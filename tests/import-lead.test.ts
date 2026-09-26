import { test } from "node:test";
import assert from "node:assert/strict";
import { buildImportedLead, importDedupeKey } from "../convex/lib/importLead.ts";

test("importDedupeKey: e-mail manda, sem caixa nem espaço", () => {
  assert.equal(importDedupeKey({ name: "X", email: "  Foo@Gmail.com " }), "email:foo@gmail.com");
});

test("importDedupeKey: sem e-mail usa nome + cidade normalizados", () => {
  assert.equal(
    importDedupeKey({ name: " Kings  of Nottingham ", city: "Nottingham" }),
    importDedupeKey({ name: "kings of nottingham", city: " nottingham" }),
  );
});

test("buildImportedLead: Ltd no Reino Unido com e-mail é emailable e entra no CRM", () => {
  const lead = buildImportedLead({
    name: "Drakes Plumbing Ltd",
    countryCode: "gb",
    email: "Drakesgas@gmail.com",
    facebook: "https://www.facebook.com/drakesphs/",
    incorporated: true,
    businessEmail: true,
    stage: "approached",
  });
  assert.equal(lead.countryCode, "GB");
  assert.equal(lead.email, "drakesgas@gmail.com");
  assert.equal(lead.legalForm, "incorporated");
  assert.equal(lead.emailable, true);
  assert.equal(lead.saved, true);
  assert.equal(lead.stage, "approached");
  assert.equal(lead.signals.noSite, true);
  assert.equal(lead.signals.socialOnly, true);
});

test("buildImportedLead: sem registro de empresa não vira emailable", () => {
  const lead = buildImportedLead({ name: "Joe", countryCode: "GB", email: "joe@x.com", incorporated: false, stage: "base" });
  assert.equal(lead.emailable, false);
});

test("buildImportedLead: mercado opt-in nunca é emailable, mesmo Ltd", () => {
  const lead = buildImportedLead({ name: "Taller SL", countryCode: "ES", email: "info@t.es", incorporated: true, stage: "base" });
  assert.equal(lead.emailable, false);
});

test("buildImportedLead: sem businessEmail, caixa curta de marca cai na heurística (named)", () => {
  const lead = buildImportedLead({ name: "Drakes Ltd", countryCode: "GB", email: "drakesgas@gmail.com", incorporated: true, stage: "base" });
  assert.equal(lead.contactType, "named");
  assert.equal(lead.emailable, false);
});

test("buildImportedLead: businessEmail não destrava mercado opt-in", () => {
  const lead = buildImportedLead({ name: "Taller SL", countryCode: "ES", email: "taller@gmail.com", incorporated: true, businessEmail: true, stage: "base" });
  assert.equal(lead.emailable, false);
});
