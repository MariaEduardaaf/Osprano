/**
 * Contraste WCAG 2.x entre duas cores hex (#rrggbb). Puro e sem dependências:
 * o teste das 12 paletas (tests/palettes.test.ts) importa daqui e de
 * src/components/site-templates/palettes.ts (spec 1.2). Não existia helper de
 * contraste no repo; este é o único.
 */
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (0 = preto, 1 = branco). Aceita "#rrggbb" ou "rrggbb". */
export function relativeLuminance(hex: string): number {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Cor inválida: ${hex}`);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste (1 a 21), simétrica. AA para texto normal: >= 4,5. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
