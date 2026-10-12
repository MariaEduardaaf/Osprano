import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (slug: string) => readFileSync(`src/app/legal/${slug}/page.tsx`, "utf8");

test("termos: clausulas obrigatorias", () => {
  const s = read("termos");
  assert.ok(s.includes("https://maps.google.com/help/terms_maps/"));
  assert.ok(s.includes("https://policies.google.com/privacy"));
  assert.match(s, /uso profissional/i);
  assert.match(s, /B2B/);
  assert.match(s, /responsável pelo contato/i);
  assert.ok(s.includes('<LegalDoc slug="termos"'));
});

test("privacidade: GDPR, LGPD, art. 27 e transferencia", () => {
  const s = read("privacidade");
  assert.match(s, /GDPR/);
  assert.match(s, /LGPD/);
  assert.match(s, /art\. 27/);
  assert.match(s, /transfer[êe]ncia/i);
  assert.ok(s.includes("[a confirmar]") || s.includes("[a definir com advogado]"));
  assert.ok(s.includes('<LegalDoc slug="privacidade"'));
});

test("dpa: art. 28, operadora e link de subprocessadores", () => {
  const s = read("dpa");
  assert.match(s, /art\. 28/);
  assert.match(s, /operadora/i);
  assert.ok(s.includes("subprocessadores"));
  assert.ok(s.includes('<LegalDoc slug="dpa"'));
});

test("proibicoes: sem LSSI/NIF/autonomo/travessao e marcadores de advogado", () => {
  for (const slug of ["termos", "privacidade", "dpa"]) {
    const s = read(slug);
    assert.doesNotMatch(s, /LSSI|\bNIF\b|autónom/, slug);
    assert.ok(!s.includes("—"), slug);
  }
  for (const slug of ["termos", "privacidade"]) {
    assert.match(read(slug), /\[a definir com advogado\]/, slug);
  }
});
