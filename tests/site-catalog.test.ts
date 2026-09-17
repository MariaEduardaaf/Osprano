import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { PALETTE_IDS, TEMPLATE_IDS } from "../convex/lib/site.ts";
import { TEMPLATES } from "../src/components/site-templates/catalog.ts";

const publicDir = new URL("../public", import.meta.url);

test("catalog: o CTA de cada modelo é o da spec 1.6", () => {
  assert.equal(TEMPLATES.mesa.ctaKey, "reserve");
  assert.equal(TEMPLATES.estudio.ctaKey, "book");
  assert.equal(TEMPLATES.oficio.ctaKey, "quote");
  assert.equal(TEMPLATES.vitrine.ctaKey, "callNow");
});

test("catalog: as paletas do catálogo são as do Convex, na ordem", () => {
  for (const t of TEMPLATE_IDS) {
    assert.equal(TEMPLATES[t].id, t);
    assert.deepEqual(TEMPLATES[t].palettes.map((p) => p.id), [...PALETTE_IDS[t]]);
    assert.ok(TEMPLATES[t].name.length > 0 && TEMPLATES[t].itemsLabel.length > 0, t);
  }
});

test("catalog: as 12 fotos padrão existem, são JPEG, cabem em 250 KB e estão no LICENSES.md", () => {
  const licenses = readFileSync(new URL("templates/LICENSES.md", publicDir + "/"), "utf8");
  for (const t of TEMPLATE_IDS) {
    for (const [slot, path] of Object.entries(TEMPLATES[t].photos)) {
      assert.equal(path, `/templates/${t}/${slot}.jpg`);
      const file = new URL(`.${path}`, publicDir + "/");
      const size = statSync(file).size;
      assert.ok(size > 0 && size <= 256000, `${path}: ${size} bytes`);
      const head = readFileSync(file).subarray(0, 2);
      assert.deepEqual([...head], [0xff, 0xd8], `${path} não é JPEG`);
      assert.ok(licenses.includes(`${t}/${slot}.jpg`), `${path} sem linha em LICENSES.md`);
    }
  }
});
