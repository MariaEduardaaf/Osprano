import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastRatio, relativeLuminance } from "../convex/lib/contrast.ts";

const close = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

test("contrast: luminância dos extremos e do cinza médio", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff"), 1);
  assert.ok(close(relativeLuminance("#808080"), 0.2159, 0.001));
});

test("contrast: valores conhecidos da WCAG", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  // Exemplo clássico: #777 sobre branco fica logo abaixo de AA (4,48).
  assert.ok(close(contrastRatio("#777777", "#ffffff"), 4.48));
  // Azul da marca (globals.css --brand) sobre branco.
  assert.ok(close(contrastRatio("#1a5ce6", "#ffffff"), 5.65));
});

test("contrast: simétrico, indiferente a maiúsculas e ao #", () => {
  assert.equal(contrastRatio("#1a5ce6", "#ffffff"), contrastRatio("#ffffff", "#1a5ce6"));
  assert.equal(contrastRatio("1A5CE6", "FFFFFF"), contrastRatio("#1a5ce6", "#ffffff"));
});

test("contrast: cor fora de #rrggbb lança", () => {
  assert.throws(() => contrastRatio("#fff", "#000000"), /Cor inválida/);
  assert.throws(() => contrastRatio("azul", "#000000"), /Cor inválida/);
});
