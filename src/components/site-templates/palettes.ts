// Import relativo com extensão de propósito: tests/palettes.test.ts carrega este
// arquivo em `node --experimental-strip-types`, que não lê os `paths` do tsconfig.
import { PALETTE_IDS, type PaletteId, type TemplateId } from "../../../convex/lib/site.ts";
import { relativeLuminance } from "../../../convex/lib/contrast.ts";

/**
 * Uma paleta = 6 cores (spec 1.2). Contraste mínimo 4,5:1 nos pares
 * text/bg, text/surface, muted/bg e accentFg/accent, garantido por
 * tests/palettes.test.ts com `contrastRatio` de convex/lib/contrast.ts. Mudou um
 * hex, rode o teste antes de olhar o resultado.
 *
 * `accent` é cor de FUNDO (botão, faixa) e de ícone/sublinhado, não de texto
 * corrido sobre `bg`: o par accent/bg não é testado e em `terracota` dá 4,3.
 * Texto pequeno em cima do fundo usa `text` ou `muted`.
 */
export interface Palette {
  id: string;
  name: string; // rótulo pt-BR para o editor
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
}

export const PALETTES: { [T in TemplateId]: Record<PaletteId<T>, Palette> } = {
  mesa: {
    terracota: {
      id: "terracota",
      name: "Terracota",
      bg: "#f6f1e7",
      surface: "#fbf8f2",
      text: "#2a221c",
      muted: "#6b5f55",
      accent: "#b8532e",
      accentFg: "#fff8f0",
    },
    oliva: {
      id: "oliva",
      name: "Oliva",
      bg: "#f4f3ee",
      surface: "#fbfaf6",
      text: "#1f2a1e",
      muted: "#5d6653",
      accent: "#4c6a3f",
      accentFg: "#f6f8f2",
    },
    noite: {
      id: "noite",
      name: "Noite",
      bg: "#1b1917",
      surface: "#262320",
      text: "#f3ede4",
      muted: "#b5aa9c",
      accent: "#e0a54a",
      accentFg: "#1b1917",
    },
  },
  estudio: {
    carvao: {
      id: "carvao",
      name: "Carvão",
      bg: "#0f0f0f",
      surface: "#1a1a1a",
      text: "#f5f2ea",
      muted: "#b3ada3",
      accent: "#c9a24a",
      accentFg: "#0f0f0f",
    },
    rosa: {
      id: "rosa",
      name: "Rosa",
      bg: "#faf5f2",
      surface: "#ffffff",
      text: "#2b1f1c",
      muted: "#6f5c56",
      accent: "#a64f41",
      accentFg: "#fff7f4",
    },
    marinho: {
      id: "marinho",
      name: "Marinho",
      bg: "#0f1c2e",
      surface: "#182741",
      text: "#f1ede4",
      muted: "#b7b1a4",
      accent: "#e2cfa8",
      accentFg: "#0f1c2e",
    },
  },
  oficio: {
    laranja: {
      id: "laranja",
      name: "Laranja",
      bg: "#ffffff",
      surface: "#f6f6f4",
      text: "#1c1c1c",
      muted: "#5f5f5f",
      accent: "#c2410c",
      accentFg: "#ffffff",
    },
    azul: {
      id: "azul",
      name: "Azul",
      bg: "#ffffff",
      surface: "#f4f6fa",
      text: "#16202e",
      muted: "#5a6472",
      accent: "#1d4ed8",
      accentFg: "#ffffff",
    },
    verde: {
      id: "verde",
      name: "Verde",
      bg: "#ffffff",
      surface: "#f3f6f3",
      text: "#182019",
      muted: "#56645a",
      accent: "#1f6b3a",
      accentFg: "#ffffff",
    },
  },
  vitrine: {
    areia: {
      id: "areia",
      name: "Areia",
      bg: "#ece6da",
      surface: "#f6f2ea",
      text: "#161412",
      muted: "#5e574d",
      accent: "#161412",
      accentFg: "#f6f2ea",
    },
    nevoa: {
      id: "nevoa",
      name: "Névoa",
      bg: "#e6ebf0",
      surface: "#f3f6f9",
      text: "#17202b",
      muted: "#56616e",
      accent: "#2b5aa6",
      accentFg: "#ffffff",
    },
    vinho: {
      id: "vinho",
      name: "Vinho",
      bg: "#f7f2ea",
      surface: "#fdfaf5",
      text: "#2a1a1e",
      muted: "#6d5a5e",
      accent: "#7a1f33",
      accentFg: "#fbf3f3",
    },
  },
};

/** Paleta pelo id; id desconhecido (ou de outro modelo) cai na padrão do modelo. */
export function paletteFor(template: TemplateId, id: string): Palette {
  const set = PALETTES[template] as Record<string, Palette>;
  return set[id] ?? set[PALETTE_IDS[template][0]];
}

/** As 3 paletas do modelo, na ordem da spec (a primeira é a padrão). */
export function palettesOf(template: TemplateId): Palette[] {
  const set = PALETTES[template] as Record<string, Palette>;
  return PALETTE_IDS[template].map((id) => set[id]);
}

/** Site de fundo escuro (noite, carvão, marinho): o rodapé não inverte, sobe para `surface`. */
export function isDarkPalette(p: Palette): boolean {
  return relativeLuminance(p.bg) < 0.5;
}

/** Mistura linear de dois hex em sRGB; `t` é o peso de `b`. Só para derivar o `muted` do rodapé. */
function blendHex(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const mix = (i: number) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t);
  return `#${[0, 1, 2].map((i) => mix(i).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Paleta do rodapé (adendo 2026-09-18): faixa escura e substancial no fim do
 * site. Em site claro inverte bg/text (o mesmo par que o teste de contraste já
 * garante) e deriva um `muted` claro; em site escuro só sobe para `surface`.
 * `accent`/`accentFg` ficam: o botão do rodapé usa esse par, testado.
 * tests/palettes.test.ts confere os pares text/bg e muted/bg das 12 derivadas.
 */
export function footerPalette(p: Palette): Palette {
  if (isDarkPalette(p)) return { ...p, bg: p.surface, surface: p.bg };
  return { ...p, bg: p.text, surface: p.text, text: p.bg, muted: blendHex(p.bg, p.text, 0.28) };
}
