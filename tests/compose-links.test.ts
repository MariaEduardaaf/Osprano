import { test } from "node:test";
import assert from "node:assert/strict";
import { composeLinks } from "../src/lib/compose-links.ts";

const m = {
  to: "info@casa.no",
  subject: "Olá & bem-vindo?",
  body: "Linha 1\nLinha 2 + mais\n\nhttps://x/unsubscribe?token=a&b",
};

test("gmail e outlook devolvem os valores originais", () => {
  const l = composeLinks(m);
  assert.ok(l.gmail!.startsWith("https://mail.google.com/mail/?view=cm&fs=1&"));
  const g = new URL(l.gmail!).searchParams;
  assert.equal(g.get("to"), m.to);
  assert.equal(g.get("su"), m.subject);
  assert.equal(g.get("body"), m.body);
  assert.ok(l.outlook!.startsWith("https://outlook.office.com/mail/deeplink/compose?"));
  const o = new URL(l.outlook!).searchParams;
  assert.equal(o.get("to"), m.to);
  assert.equal(o.get("subject"), m.subject);
  assert.equal(o.get("body"), m.body);
});

test("mailto: @ literal, CRLF, sem + no lugar de espaço", () => {
  const l = composeLinks(m);
  assert.ok(l.mailto!.startsWith("mailto:info@casa.no?"));
  assert.ok(l.mailto!.includes("subject=Ol%C3%A1%20%26%20bem-vindo%3F"));
  assert.ok(l.mailto!.includes("%0D%0A"));
  assert.ok(!/(?<!%0D)%0A/.test(l.mailto!));
  for (const u of Object.values(l)) assert.ok(!u!.includes("+"));
});

test("limite de tamanho", () => {
  const ok = composeLinks({ ...m, body: "a".repeat(3000) });
  assert.ok(ok.gmail && ok.outlook && ok.mailto);
  const big = composeLinks({ ...m, body: "a".repeat(7000) });
  assert.deepEqual(big, { gmail: null, outlook: null, mailto: null });
});
