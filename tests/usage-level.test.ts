import { test } from "node:test";
import assert from "node:assert/strict";
import { usageAlert, usageItems, usageLevel, type UsageSnapshot } from "../src/lib/usage.ts";

const snap = (o: Partial<UsageSnapshot> = {}): UsageSnapshot => ({
  isTrial: true,
  trialSpent: false,
  leadsUsed: 0,
  detailsUsed: 0,
  aiUsed: 0,
  searchesToday: 0,
  limits: { leads: 25, details: 25, ai: 25, searchesPerDay: 20 },
  ...o,
});

test("usageLevel: 80% avisa, 100% enche, limite 0 é cheio", () => {
  assert.equal(usageLevel(0, 25), "ok");
  assert.equal(usageLevel(19, 25), "ok");
  assert.equal(usageLevel(20, 25), "warn");
  assert.equal(usageLevel(25, 25), "full");
  assert.equal(usageLevel(30, 25), "full");
  assert.equal(usageLevel(0, 0), "full");
  assert.equal(usageLevel(3, 0), "full");
});

test("usageItems: ordem, rótulos e sufixos", () => {
  const t = usageItems(snap());
  assert.deepEqual(t.map((i) => i.label), ["Leads", "IA", "Google", "Buscas hoje"]);
  assert.deepEqual(t.map((i) => i.suffix), ["no teste", "no teste", "no teste", "/dia"]);
  assert.deepEqual(usageItems(snap({ isTrial: false })).map((i) => i.suffix), ["/mês", "/mês", "/mês", "/dia"]);
});

test("usageAlert: teste usado, cheio, aviso e nada", () => {
  assert.equal(usageAlert(snap({ trialSpent: true })), "Seu teste grátis já foi usado. Veja os planos.");
  assert.equal(usageAlert(snap({ aiUsed: 25, leadsUsed: 22 })), "Limite de IA atingido.");
  assert.equal(usageAlert(snap({ leadsUsed: 22 })), "Você já usou 88% de Leads.");
  assert.equal(usageAlert(snap()), null);
});
