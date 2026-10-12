import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PLANS } from "../convex/lib/domain.ts";

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
  for (const p of Object.values(PLANS)) {
    assert.ok(p.features.includes(`${p.leadsPerMonth.toLocaleString("pt-BR")} leads/mês`), `${p.id} leads`);
    assert.ok(p.features.includes(`${p.sitesPerMonth.toLocaleString("pt-BR")} sites/mês`), `${p.id} sites`);
  }
});

test("sites page: no white-label promise", () => {
  const src = readFileSync("src/app/(app)/sites/page.tsx", "utf8");
  assert.doesNotMatch(src, /white[- ]label/i);
  assert.doesNotMatch(src, /URL própria/);
});
