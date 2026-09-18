// Import relativo com extensão de propósito: tests/site-editor.test.ts carrega
// este arquivo em `node --experimental-strip-types`, que não lê os `paths` do
// tsconfig. Puro: nada de React aqui. O estado do editor é um SiteContent
// inteiro (spec 3.1) e todas as transições passam por estas funções, que
// devolvem sempre um objeto novo (o React Compiler exige imutabilidade) e
// mantêm o JSON canônico: campo vazio SOME (o modelo usa o padrão; o servidor
// trata "" como não preenchido), lista vazia some, `undefined` nunca fica.
import {
  LIMITS,
  defaultPalette,
  isPaletteOf,
  type SiteContent,
  type SiteHours,
  type SiteItem,
  type TemplateId,
  type Weekday,
} from "../../convex/lib/site.ts";
import type { Id } from "../../convex/_generated/dataModel";

/** Chaves opcionais de texto do conteúdo. `name` fica fora: é obrigatório e nunca some. */
export type TextKey = "tagline" | "about" | "address" | "phone" | "whatsapp" | "instagram" | "email";

/** Define um campo de texto opcional; "" remove a chave. */
export function setText(c: SiteContent, key: TextKey, value: string): SiteContent {
  const next = { ...c };
  if (value === "") delete next[key];
  else next[key] = value;
  return next;
}

/**
 * JSON canônico: chaves em ordem alfabética em todo objeto, `undefined` fora.
 * "Alterado" = JSON diferente do salvo (spec 3.1); sem canonizar, a ordem de
 * inserção das chaves faria `{...c, tagline}` parecer diferente de `{tagline, ...c}`.
 */
export function canonical(c: SiteContent): string {
  return JSON.stringify(c, (_key, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  });
}

export function isDirty(draft: SiteContent, saved: SiteContent): boolean {
  return canonical(draft) !== canonical(saved);
}

/** Troca o modelo mantendo TODOS os campos (spec 3.1); a paleta cai na padrão do novo modelo quando não é dele. */
export function withTemplate(c: SiteContent, template: TemplateId): SiteContent {
  if (template === c.template) return c;
  return { ...c, template, palette: isPaletteOf(template, c.palette) ? c.palette : defaultPalette(template) };
}

/* ------------------------------------------------------------------ itens */

function withItems(c: SiteContent, items: SiteItem[]): SiteContent {
  const next = { ...c };
  if (items.length === 0) delete next.items;
  else next.items = items;
  return next;
}

/** Acrescenta um item vazio; no limite (12) devolve o mesmo objeto. */
export function addItem(c: SiteContent): SiteContent {
  const items = c.items ?? [];
  if (items.length >= LIMITS.items) return c;
  return withItems(c, [...items, { name: "" }]);
}

/** Altera nome, preço ou nota de um item; preço/nota vazios somem. */
export function setItem(c: SiteContent, index: number, patch: Partial<SiteItem>): SiteContent {
  const items = c.items ?? [];
  if (index < 0 || index >= items.length) return c;
  const merged: SiteItem = { ...items[index], ...patch };
  const item: SiteItem = { name: merged.name };
  if (merged.price) item.price = merged.price;
  if (merged.note) item.note = merged.note;
  return withItems(c, items.map((it, i) => (i === index ? item : it)));
}

export function removeItem(c: SiteContent, index: number): SiteContent {
  const items = c.items ?? [];
  if (index < 0 || index >= items.length) return c;
  return withItems(c, items.filter((_, i) => i !== index));
}

/* ---------------------------------------------------------------- horário */

/** Segunda a domingo, como o modelo renderiza (`DAY_ORDER` em shared.tsx). Índice 0 = domingo. */
export const WEEKDAY_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];
/** Rótulos pt-BR do editor (o site usa Intl no idioma do lead; aqui quem lê é a Duda). */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};
/** Faixa sugerida ao abrir um dia: ela vê os dois valores e ajusta; nada disso sai sem o Salvar dela. */
export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "18:00";

export interface HoursRow {
  day: Weekday;
  label: string;
  closed: boolean;
  open: string;
  close: string;
}

/** As 7 linhas do bloco Horário (seg a dom): dia sem linha em `hours` = fechado. */
export function hoursRows(c: SiteContent): HoursRow[] {
  const byDay = new Map((c.hours ?? []).map((h) => [h.day, h]));
  return WEEKDAY_ORDER.map((day) => {
    const h = byDay.get(day);
    return h
      ? { day, label: WEEKDAY_LABELS[day], closed: false, open: h.open, close: h.close }
      : { day, label: WEEKDAY_LABELS[day], closed: true, open: "", close: "" };
  });
}

/** Define a faixa de um dia (`null` = fechado). Guarda `hours` ordenado por dia; vazio some. */
export function setDay(c: SiteContent, day: Weekday, range: { open: string; close: string } | null): SiteContent {
  const rest = (c.hours ?? []).filter((h) => h.day !== day);
  const hours: SiteHours[] = range ? [...rest, { day, open: range.open, close: range.close }] : rest;
  hours.sort((a, b) => a.day - b.day);
  const next = { ...c };
  if (hours.length === 0) delete next.hours;
  else next.hours = hours;
  return next;
}

/* ------------------------------------------------------------------ fotos */

/** Foto principal: `undefined` = "Usar padrão" (a chave some). */
export function setHero(c: SiteContent, id: Id<"_storage"> | undefined): SiteContent {
  const next = { ...c };
  if (id) next.heroImage = id;
  else delete next.heroImage;
  return next;
}

function withGallery(c: SiteContent, gallery: Id<"_storage">[]): SiteContent {
  const next = { ...c };
  if (gallery.length === 0) delete next.gallery;
  else next.gallery = gallery;
  return next;
}

/** Acrescenta à galeria; no limite (6) devolve o mesmo objeto. */
export function addGalleryImage(c: SiteContent, id: Id<"_storage">): SiteContent {
  const gallery = c.gallery ?? [];
  if (gallery.length >= LIMITS.gallery) return c;
  return withGallery(c, [...gallery, id]);
}

/** Troca a foto de um slot da galeria (o "Enviar foto" de um slot ocupado). */
export function replaceGalleryImage(c: SiteContent, index: number, id: Id<"_storage">): SiteContent {
  const gallery = c.gallery ?? [];
  if (index < 0 || index >= gallery.length) return c;
  return withGallery(c, gallery.map((g, i) => (i === index ? id : g)));
}

export function removeGalleryImage(c: SiteContent, index: number): SiteContent {
  const gallery = c.gallery ?? [];
  if (index < 0 || index >= gallery.length) return c;
  return withGallery(c, gallery.filter((_, i) => i !== index));
}

export interface ResolvedImages {
  heroUrl?: string;
  galleryUrls: string[];
}

/**
 * Mapa id → URL a partir do que `getForLead` devolveu (`images`), para o editor
 * resolver a prévia por id (ela pode trocar o hero por uma foto da galeria sem
 * salvar). `resolveImages` tira da lista os ids sem arquivo, então a galeria só
 * é casada quando os tamanhos batem; senão fica sem URL (a prévia mostra o
 * slot vazio) em vez de casar a foto errada.
 */
export function imageUrlMap(c: SiteContent, images: ResolvedImages): Record<string, string> {
  const map: Record<string, string> = {};
  if (c.heroImage && images.heroUrl) map[c.heroImage] = images.heroUrl;
  const gallery = c.gallery ?? [];
  if (gallery.length === images.galleryUrls.length) {
    gallery.forEach((id, i) => {
      map[id] = images.galleryUrls[i];
    });
  }
  return map;
}

/** As `images` da prévia ao vivo a partir do rascunho e do mapa (upload sem URL cai na foto padrão via buildSiteView). */
export function viewImages(c: SiteContent, urls: Record<string, string>): ResolvedImages {
  const heroUrl = c.heroImage ? urls[c.heroImage] : undefined;
  const galleryUrls = (c.gallery ?? []).map((id) => urls[id]).filter((u): u is string => typeof u === "string");
  return heroUrl ? { heroUrl, galleryUrls } : { galleryUrls };
}
