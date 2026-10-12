import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultContentForLead } from "../convex/lib/site.ts";
import { ensurePreview, readContent } from "../convex/model/previews.ts";
import { CONFIRM_NAME_MESSAGE } from "../convex/lib/googleData.ts";
import { fakeCtx } from "./fake-ctx.ts";

const src = (f: string) => readFileSync(new URL(`../convex/${f}`, import.meta.url), "utf8");
const base = { countryCode: "GB", name: "Casa Nova", phone: "+44 1", address: "Rua 1", rating: 4.8, reviewsCount: 90 };
const google = { ...base, source: "places" as const, category: "italian_restaurant" };

test("defaultContentForLead: Google sem confirmação não leva nada do Google", () => {
  const c = defaultContentForLead(google);
  assert.equal(c.name, "");
  assert.equal(c.phone, undefined);
  assert.equal(c.address, undefined);
  assert.equal(c.rating, null);
  assert.equal(c.reviewsCount, null);
  assert.equal(c.category, null);
});

test("defaultContentForLead: Google confirmado leva só o confirmado", () => {
  const c = defaultContentForLead({ ...google, confirmation: { at: 1, via: "call" } });
  assert.equal(c.name, "Casa Nova");
  assert.equal(c.phone, "+44 1");
  assert.equal(c.rating, null);
  assert.equal(c.reviewsCount, null);
});

test("defaultContentForLead: OSM preserva tudo", () => {
  const c = defaultContentForLead({ ...base, source: "osm" });
  assert.equal(c.name, "Casa Nova");
  assert.equal(c.phone, "+44 1");
  assert.equal(c.rating, 4.8);
});

const lead = (o: object) => ({ _id: "leads:1", orgId: "o1", ...google, ...o });

test("ensurePreview recusa Google sem confirmação e não cria", async () => {
  const f = fakeCtx({ leads: [lead({})] });
  await assert.rejects(ensurePreview(f.ctx as never, lead({}) as never), new RegExp(CONFIRM_NAME_MESSAGE));
  assert.equal((await f.ctx.db.query("previews").collect()).length, 0);
});

test("ensurePreview devolve preview existente sem lançar", async () => {
  const f = fakeCtx({ leads: [lead({})], previews: [{ _id: "previews:9", leadId: "leads:1", token: "t" }] });
  const p = await ensurePreview(f.ctx as never, lead({}) as never);
  assert.equal(p._id, "previews:9");
});

test("ensurePreview cria com nome confirmado", async () => {
  const l = lead({ confirmation: { at: 1, via: "call" } });
  const f = fakeCtx({ leads: [l] });
  const p = await ensurePreview(f.ctx as never, l as never);
  assert.equal((p.content as { name: string }).name, "Casa Nova");
});

test("readContent: nome vazio não cai para o nome do Google", async () => {
  const f = fakeCtx({ leads: [lead({ name: "Google Name" })] });
  const c = await readContent(f.ctx as never, { leadId: "leads:1", content: { name: "" } } as never);
  assert.equal(c.name, "");
});

test("readContent: nome vazio cai para o nome do lead OSM", async () => {
  const f = fakeCtx({ leads: [lead({ source: "osm", name: "Padaria" })] });
  const c = await readContent(f.ctx as never, { leadId: "leads:1", content: { name: "" } } as never);
  assert.equal(c.name, "Padaria");
});

test("publish exige nome antes de reservar cota", () => {
  const s = src("previews.ts");
  const block = s.slice(s.indexOf("export const publish"));
  const a = block.indexOf("Dê um nome ao site antes de publicar.");
  assert.ok(a > 0 && a < block.indexOf("reserveUsage("));
});

test("outreach: IA só recebe dado compartilhável", () => {
  const s = src("outreach.ts");
  assert.ok(s.includes("shareableLead(lead)"));
  assert.ok(s.includes("writeEmail(key, safe") && s.includes("writeCallScript(key, safe"));
  assert.ok(!s.includes("writeEmail(key, lead") && !s.includes("writeCallScript(key, lead"));
  assert.ok(s.split("CONFIRM_NAME_MESSAGE").length - 1 >= 2);
  assert.ok(!s.includes("if (!lead.phone)"));
});

test("whatsapp usa só telefone compartilhável", () => {
  const s = src("whatsapp.ts");
  assert.ok(s.includes("shareableFacts(lead).phone"));
  assert.ok(!s.includes("lead.phone.replace"));
});

test("leads.confirmInfo aplica confirmPatch", () => {
  const s = src("leads.ts");
  assert.ok(s.includes("export const confirmInfo"));
  assert.ok(s.includes("confirmPatch(lead, args, Date.now())"));
});
