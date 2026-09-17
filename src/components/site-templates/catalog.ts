// Puro (sem JSX) e com imports relativos `.ts`: tests/site-catalog.test.ts carrega
// este arquivo em `node --experimental-strip-types`. `index.tsx` o reexporta.
import type { TemplateId } from "../../../convex/lib/site.ts";
import { palettesOf, type Palette } from "./palettes.ts";

/** Chave do rótulo do CTA primário (spec 1.6): `callNow` mora no topo do PreviewDict, as outras em templates.<id>. */
export type CtaKey = "reserve" | "book" | "quote" | "callNow";

export interface TemplateMeta {
  id: TemplateId;
  name: string; // pt-BR: editor e página Sites
  description: string; // pt-BR: os segmentos, para ela reconhecer o modelo
  itemsLabel: string; // pt-BR: rótulo do bloco de itens no editor (spec 3.1)
  ctaKey: CtaKey;
  palettes: Palette[];
  photos: { hero: string; g1: string; g2: string }; // fotos padrão em /public (spec 1.3)
}

function photos(id: TemplateId): TemplateMeta["photos"] {
  return {
    hero: `/templates/${id}/hero.jpg`,
    g1: `/templates/${id}/g1.jpg`,
    g2: `/templates/${id}/g2.jpg`,
  };
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  mesa: {
    id: "mesa",
    name: "Mesa",
    description: "Restaurante, café, bar, pizzaria, padaria, confeitaria, sorveteria",
    itemsLabel: "Cardápio",
    ctaKey: "reserve",
    palettes: palettesOf("mesa"),
    photos: photos("mesa"),
  },
  estudio: {
    id: "estudio",
    name: "Estúdio",
    description: "Barbearia, salão, manicure, spa, tatuagem, academia, personal, yoga",
    itemsLabel: "Serviços",
    ctaKey: "book",
    palettes: palettesOf("estudio"),
    photos: photos("estudio"),
  },
  oficio: {
    id: "oficio",
    name: "Ofício",
    description: "Encanador, eletricista, chaveiro, mecânica, lava-rápido, autoescola, fotógrafo",
    itemsLabel: "Serviços",
    ctaKey: "quote",
    palettes: palettesOf("oficio"),
    photos: photos("oficio"),
  },
  vitrine: {
    id: "vitrine",
    name: "Vitrine",
    description: "Loja, clínica, dentista, imobiliária, advogado e qualquer outro segmento",
    itemsLabel: "Destaques",
    ctaKey: "callNow",
    palettes: palettesOf("vitrine"),
    photos: photos("vitrine"),
  },
};
