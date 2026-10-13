import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const src = (f: string) => readFileSync(new URL(`../convex/${f}`, import.meta.url), "utf8");

test("places: busca reserva searches antes do fetch e depois dos leads", () => {
  const s = src("places.ts");
  const b = s.slice(s.indexOf("export async function runPlacesSearch"));
  const leads = b.indexOf('kind: "leads"');
  const searches = b.indexOf('kind: "searches"');
  const fetchAt = b.indexOf("places:searchText");
  assert.ok(leads >= 0 && leads < searches && searches < fetchAt);
  assert.ok(s.includes("COST_USD.textSearch"));
  assert.ok(s.includes("COST_USD.detailsFull"));
  assert.ok(s.includes("COST_USD.detailsList"));
  assert.ok(s.split('kind: "searches"').length - 1 >= 2, "reserva e devolução de páginas");
});

test("leads.create reserva 1 lead antes do insert", () => {
  const s = src("leads.ts");
  const b = s.slice(s.indexOf("export const create"));
  const r = b.indexOf('reserveUsage(ctx, orgId, "leads", 1)');
  assert.ok(r >= 0 && r < b.indexOf('ctx.db.insert("leads"'));
});
