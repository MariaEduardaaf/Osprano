import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(new URL(`../convex/${f}`, import.meta.url), "utf8");

/** Trecho entre `export const name =` e o próximo `export const` (ou fim do arquivo). */
function body(src: string, name: string): string {
  const start = src.indexOf(`export const ${name} =`);
  assert.notEqual(start, -1, `${name} não encontrado`);
  const next = src.indexOf("\nexport const ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

const leads = read("leads.ts");

test("leads: funções do SCAL-01 sem .collect()", () => {
  for (const n of ["listForDiscovery", "listCrm", "stats", "analytics"]) {
    assert.ok(!body(leads, n).includes(".collect()"), n);
  }
});

test("listForDiscovery pagina por índice", () => {
  const b = body(leads, "listForDiscovery");
  assert.ok(b.includes(".paginate(paginationOpts)"));
  assert.ok(b.includes("by_org_country"));
});

test("listCrm lê saved true + legado com teto", () => {
  const b = body(leads, "listCrm");
  for (const s of ["by_org_saved", 'eq("saved", true)', 'eq("saved", undefined)', "take(CRM_LIMIT)"]) {
    assert.ok(b.includes(s), s);
  }
});

test("stats e analytics limitados e sinalizam truncamento", () => {
  for (const n of ["stats", "analytics"]) {
    const b = body(leads, n);
    assert.ok(b.includes("take(STATS_LIMIT)") && b.includes("truncated"), n);
  }
});

test("insertDiscovered não aceita source places", () => {
  const b = body(leads, "insertDiscovered");
  assert.ok(!b.slice(0, b.indexOf("handler:")).includes('v.literal("places")'));
});

test("listSites, outbox e isEmailSuppressed sem .collect()", () => {
  const sites = body(read("previews.ts"), "listSites");
  assert.ok(!sites.includes(".collect()") && sites.includes("by_org_open") && sites.includes(".take(SITES_LIMIT)"));
  const out = body(read("outreach.ts"), "outbox");
  assert.ok(!out.includes(".collect()") && out.includes("by_org_channel") && out.includes(".take(OUTBOX_LIMIT)"));
  const sup = read("suppressions.ts");
  const i = sup.indexOf("export async function isEmailSuppressed");
  const fn = sup.slice(i, sup.indexOf("\nexport", i + 1));
  assert.ok(!fn.includes(".collect()"));
  assert.equal(fn.split(".first()").length - 1, 2);
});
