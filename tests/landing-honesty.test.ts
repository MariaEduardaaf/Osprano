import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PAID_PLANS, PLANS } from "../convex/lib/domain.ts";

const FORBIDDEN: RegExp[] = [
  /TESTIMONIALS/,
  /Whitfield|Bakker|O'Brien/,
  /white[- ]label/i,
  /domínio próprio/i,
  /notificad/i,
  /na sua marca/i,
  /−30%/,
  /sem risco/i,
  /não te processa/i,
  /GDPR[- ](compliant|safe)/i,
  /n: 48\b/,
  /mercados opt-out da UE/,
];

const landingFiles = [
  "src/app/page.tsx",
  ...readdirSync("src/components/landing")
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `src/components/landing/${f}`),
];

for (const file of landingFiles) {
  test(`landing honesty: ${file} has no forbidden claims`, () => {
    const src = readFileSync(file, "utf8");
    for (const re of FORBIDDEN) assert.doesNotMatch(src, re, `${file} matches ${re}`);
  });
}

test("pricing: no annual toggle or client state", () => {
  const src = readFileSync("src/components/landing/pricing.tsx", "utf8");
  assert.doesNotMatch(src, /annual|Anual|useState|use client/);
});

test("PLANS: features do not promise missing things", () => {
  const all = Object.values(PLANS).flatMap((p) => p.features).join("\n");
  for (const re of [/Export CSV/i, /white[- ]label/i, /domínio próprio/i, /5 categorias/, /Prioridade/]) {
    assert.doesNotMatch(all, re);
  }
});

test("PLANS: features cite the real limits", () => {
  const t = PLANS.trial;
  assert.ok(t.features.includes(`${t.leadsPerMonth} leads no teste`), "trial leads");
  assert.ok(t.features.includes(`${t.aiPerMonth} gerações por IA no teste`), "trial ai");
  for (const p of PAID_PLANS) {
    const n = (x: number) => x.toLocaleString("pt-BR");
    assert.ok(p.features.includes(`${n(p.leadsPerMonth)} leads/mês`), `${p.id} leads`);
    assert.ok(p.features.includes(`${n(p.aiPerMonth)} gerações por IA/mês`), `${p.id} ai`);
    assert.ok(p.features.includes(`${n(p.sitesPerMonth)} sites/mês`), `${p.id} sites`);
  }
});

test("pricing: só planos pagos e o teste vem de PLANS.trial", () => {
  const src = readFileSync("src/components/landing/pricing.tsx", "utf8");
  assert.match(src, /PAID_PLANS/);
  assert.match(src, /PLANS\.trial/);
  assert.doesNotMatch(src, /price === 0/);
});

test("plans page: sem checkout no beta", () => {
  assert.doesNotMatch(readFileSync("src/app/(app)/plans/page.tsx", "utf8"), /createCheckout/);
});

test("sites page: no white-label promise", () => {
  const src = readFileSync("src/app/(app)/sites/page.tsx", "utf8");
  assert.doesNotMatch(src, /white[- ]label/i);
  assert.doesNotMatch(src, /URL própria/);
});
