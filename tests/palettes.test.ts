import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../convex/lib/contrast.ts";
import { PALETTE_IDS, TEMPLATE_IDS } from "../convex/lib/site.ts";
import { PALETTES, paletteFor, palettesOf } from "../src/components/site-templates/palettes.ts";

test("palettes: os ids em src batem com PALETTE_IDS do Convex, na mesma ordem", () => {
  for (const t of TEMPLATE_IDS) {
    assert.deepEqual(Object.keys(PALETTES[t]), [...PALETTE_IDS[t]], t);
    for (const id of PALETTE_IDS[t]) {
      assert.equal((PALETTES[t] as Record<string, { id: string }>)[id].id, id, `${t}.${id}`);
    }
  }
});

test("palettes: as 12 paletas passam 4,5:1 nos quatro pares da spec 1.2", () => {
  for (const t of TEMPLATE_IDS) {
    for (const p of palettesOf(t)) {
      const pairs: [string, string, string][] = [
        ["text/bg", p.text, p.bg],
        ["text/surface", p.text, p.surface],
        ["muted/bg", p.muted, p.bg],
        ["accentFg/accent", p.accentFg, p.accent],
      ];
      for (const [label, a, b] of pairs) {
        const ratio = contrastRatio(a, b);
        assert.ok(ratio >= 4.5, `${t}.${p.id} ${label}: ${ratio.toFixed(2)} < 4.5 (${a} sobre ${b})`);
      }
    }
  }
});

test("palettes: paletteFor cai na padrão quando o id é desconhecido ou de outro modelo", () => {
  assert.equal(paletteFor("mesa", "oliva").id, "oliva");
  assert.equal(paletteFor("mesa", "xyz").id, "terracota");
  assert.equal(paletteFor("mesa", "carvao").id, "terracota");
  assert.equal(paletteFor("estudio", "carvao").id, "carvao");
  assert.deepEqual(palettesOf("vitrine").map((p) => p.id), ["areia", "nevoa", "vinho"]);
});
