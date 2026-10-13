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

test("IA: toda chamada passa por withAiQuota, depois da chave", () => {
  const o = src("outreach.ts");
  assert.equal(o.split("withAiQuota(ctx, orgId, () => write").length - 1, 2);
  for (const name of ["export const draft", "export const callScript"]) {
    const b = o.slice(o.indexOf(name));
    assert.ok(b.indexOf("process.env.ANTHROPIC_API_KEY") < b.indexOf("withAiQuota("), name);
  }
  const q = src("model/aiQuota.ts");
  assert.ok(q.includes('kind: "ai", count: 1, usd: COST_USD.ai'));
  assert.ok(q.includes('internal.workspaces.refund, { orgId, kind: "ai"'));
});

test("nenhum outro arquivo chama a Anthropic sem reserva", () => {
  const files = (readdirSync(new URL("../convex", import.meta.url), { recursive: true }) as string[])
    .filter((f) => f.endsWith(".ts") && !f.startsWith("_generated") && f !== "lib/outreachAi.ts");
  for (const f of files) {
    const s = src(f);
    assert.ok(!s.includes("api.anthropic.com"), `${f} chama a Anthropic`);
    for (const line of s.split("\n")) {
      if (/^\s*import /.test(line)) continue;
      for (const m of line.matchAll(/(writeEmail|writeCallScript)\(/g)) {
        assert.ok(line.slice(0, m.index).endsWith("() => "), `${f}: ${line.trim()}`);
      }
    }
  }
});
