import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { LEGAL_DOCS } from "../convex/lib/legal.ts";

const page = (slug: string) => readFileSync(`src/app/legal/${slug}/page.tsx`, "utf8");

for (const { slug } of LEGAL_DOCS) {
  test(`/legal/${slug}: página existe e usa LegalDoc`, () => {
    const file = `src/app/legal/${slug}/page.tsx`;
    assert.ok(existsSync(file), `${file} não existe`);
    const src = page(slug);
    assert.ok(src.includes(`<LegalDoc slug="${slug}"`));
    assert.ok(src.includes("export const metadata"));
    assert.ok(!src.includes("—"), "travessão proibido");
  });
}

test("empresa: lê LEGAL_IDENTITY e não cita LSSI/NIF/Espanha", () => {
  const src = page("empresa");
  assert.ok(src.includes("LEGAL_IDENTITY") && src.includes("displayValue"));
  assert.doesNotMatch(src, /LSSI|\bNIF\b|Espanha/);
});

test("cookies: lista o que existe", () => {
  const src = page("cookies");
  for (const s of ["Clerk", "theme", "osprano.dmSignature"]) assert.ok(src.includes(s), s);
  assert.match(src, /analytics/i);
});

test("subprocessadores: lista os serviços reais", () => {
  const src = page("subprocessadores");
  for (const s of ["Convex", "Clerk", "Vercel", "Stripe", "Anthropic", "Resend", "Google", "Foursquare", "OpenStreetMap", "WhatsApp"])
    assert.ok(src.includes(s), s);
});

test("aviso-prospect: art. 14 e art. 21", () => {
  const src = page("aviso-prospect");
  assert.ok(src.includes("art. 14") && src.includes("art. 21"));
  assert.ok(src.includes('legalHref("privacidade")') || src.includes("/legal/privacidade"));
});

test("rodapé da landing usa LegalLinks", () => {
  const src = readFileSync("src/app/page.tsx", "utf8");
  assert.ok(src.includes("<LegalLinks") && src.includes("md:grid-cols-[1.3fr_1fr_1fr_1fr]"));
});

test("proxy não protege /legal", () => {
  assert.ok(!readFileSync("src/proxy.ts", "utf8").includes("legal"));
});

test("não existe src/app/legal/page.tsx", () => {
  assert.ok(!existsSync("src/app/legal/page.tsx"));
});
