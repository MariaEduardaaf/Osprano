import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

/** Recorte de `export const name` até o próximo `\nexport `. */
function fn(src: string, name: string): string {
  const start = src.indexOf(`export const ${name}`);
  assert.notEqual(start, -1, `${name} não encontrado`);
  const next = src.indexOf("\nexport ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

/** Cada marcador aparece, e na ordem dada. */
function inOrder(b: string, marks: string[]) {
  let last = -1;
  for (const m of marks) {
    const i = b.indexOf(m);
    assert.ok(i > last, `${m} fora de ordem ou ausente`);
    last = i;
  }
}

const outreach = read("convex/outreach.ts");
const whatsapp = read("convex/whatsapp.ts");

test("prepareSend: portões na ordem", () => {
  const b = fn(outreach, "prepareSend");
  assert.ok(b.startsWith("export const prepareSend = mutation"));
  inOrder(b, ["requireSender(", "canContactByEmail(lead)", "isEmailSuppressed(", "composeOutgoingBody(", "ctx.db.patch("]);
  for (const s of ["senderFooterIdentity(sender)", "emailRowForLead(ctx, leadId)", "NAME_PLACEHOLDER", "draftLinkIssue("]) {
    assert.ok(b.includes(s), s);
  }
});

test("markSent exige mensagem preparada antes do patch", () => {
  inOrder(fn(outreach, "markSent"), ["hasUnsubscribeLink(", "ctx.db.patch(row._id"]);
});

test("upsertDraft tira rodapé; withOptOutFooter sumiu", () => {
  const b = fn(outreach, "upsertDraft");
  assert.ok(b.includes("stripOptOutFooter(") && !b.includes("optOutFooter("));
  assert.ok(!outreach.includes("withOptOut" + "Footer"));
});

test("draft e callScript: perfil antes da IA, assina com o perfil", () => {
  const d = fn(outreach, "draft");
  inOrder(d, ["requireSender(", "writeEmail("]);
  assert.ok(d.includes("callerName: sender.name") && d.includes("company: sender.company"));
  const c = fn(outreach, "callScript");
  inOrder(c, ["requireSender(", "writeCallScript("]);
  assert.ok(c.includes("callerName: sender.name"));
});

test("send: flag desligada antes do fetch; RESEND_FROM só em send", () => {
  inOrder(fn(outreach, "send"), ["CLIENT_SEND_VIA_RESEND", "fetch("]);
  assert.ok(outreach.includes("const CLIENT_SEND_VIA_RESEND = false;"));
  const without = outreach.replace(fn(outreach, "send"), "");
  assert.ok(!without.includes("process.env.RESEND_FROM"));
});

test("identidade da Duda fora do caminho de envio", () => {
  for (const n of ["caller" + "NameFrom", "requireSender" + "From"]) assert.ok(!outreach.includes(n), n);
});

test("whatsapp.sendFollowup: flag antes de qualquer chamada", () => {
  const b = fn(whatsapp, "sendFollowup");
  assert.ok(b.includes("const CLIENT_SEND_VIA_WHATSAPP = false;"));
  inOrder(b, ["CLIENT_SEND_VIA_WHATSAPP", "requireOrgId(", "fetch("]);
});

test("tela de WhatsApp usa wa.me, não a action", () => {
  const t = read("src/components/whatsapp-followup.tsx");
  assert.ok(!t.includes("whatsapp.sendFollowup") && t.includes("wa.me/"));
});
