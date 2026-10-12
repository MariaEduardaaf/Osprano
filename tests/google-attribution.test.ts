import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

const read = (f: string) => readFileSync(f, "utf8");
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = `${dir}/${n}`;
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}
const files = walk("src");
const HOOK = "src/lib/use-google-places.ts";

test("GoogleAttribution: texto sem tradução, sem travessão", () => {
  const s = read("src/components/google/google-attribution.tsx");
  assert.match(s, /translate="no"/);
  assert.match(s, /Google Maps/);
  assert.doesNotMatch(s, /—/);
});

test("GoogleCard: atribuição dentro, sem copiar", () => {
  const s = read("src/components/google/google-card.tsx");
  assert.match(s, /<GoogleAttribution/);
  assert.doesNotMatch(s, /navigator\.clipboard|Copiar/);
  assert.doesNotMatch(s, /—/);
});

test("memória do Google: só JS, sem persistência", () => {
  const s = read(HOOK);
  const code = s.split("\n").filter((l) => !/^\s*(\/\*|\*|\/\/)/.test(l)).join("\n");
  assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|caches\./);
  assert.match(s, /useSyncExternalStore/);
  assert.match(s, /useAction\(api\.places\.details\)/);
  assert.match(s, /useAction\(api\.places\.detailsMany\)/);
});

test("nenhum useQuery de places em src/", () => {
  for (const f of files) assert.doesNotMatch(read(f), /useQuery\(api\.places/, f);
});

test("quem usa useGooglePlace( importa o GoogleCard", () => {
  for (const f of files) {
    if (f === HOOK) continue;
    const s = read(f);
    if (s.includes("useGooglePlace(")) assert.match(s, /@\/components\/google\/google-card/, f);
  }
});

test("GPLC-05: arquivo com Google não importa mapa nem modelo de site", () => {
  for (const f of files) {
    const s = read(f);
    if (!/google-card|use-google-places/.test(s)) continue;
    assert.doesNotMatch(s, /site-templates|MapEmbed/, f);
  }
});

test("BusinessData: confirmação digitada, sem preencher do Google", () => {
  const s = read("src/components/crm/business-data.tsx");
  assert.match(s, /Não salvamos dados do Google\./);
  assert.match(s, /api\.leads\.confirmInfo/);
  assert.doesNotMatch(s, /(value|defaultValue)=\{[^}]*place/);
  assert.doesNotMatch(s, /—/);
});

test("drawer: BusinessData presente, sem mapa nem corpo de modelo", () => {
  const d = read("src/components/crm/lead-detail.tsx");
  assert.match(d, /<BusinessData/);
  assert.doesNotMatch(d, /label="Endereço"/);
  for (const s of [d, read("src/components/crm/business-data.tsx")]) {
    assert.doesNotMatch(s, /MapEmbed|preview-site|renderTemplate\(|buildSiteView\(/);
  }
  const t = read("src/components/site-templates/template-thumb.tsx");
  assert.match(t, /renderHero\(/);
  assert.doesNotMatch(t, /renderTemplate\(|MapEmbed/);
});
