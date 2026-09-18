/**
 * Conteúdo do site/prévia de um lead (spec 2.1) e as regras puras em volta:
 * modelo sugerido pela categoria, paletas válidas, CTA primário, conversão do
 * formato antigo e limites de validação.
 *
 * Puro de propósito: só `convex/values` (validador) e `./errors.ts`. É importado
 * de `src/` (alias `@convex/lib/site`) e dos testes, que rodam em
 * `node --experimental-strip-types` e exigem import relativo com extensão. `Id`
 * entra só como tipo, como em convex/model/tenant.ts: `import type` some na
 * execução. Convex nunca importa de `src/`: os hex das paletas ficam lá, os ids
 * ficam aqui.
 */
import { v, type Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { userError } from "./errors.ts";

export const TEMPLATE_IDS = ["mesa", "estudio", "oficio", "vitrine"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(x: unknown): x is TemplateId {
  return typeof x === "string" && (TEMPLATE_IDS as readonly string[]).includes(x);
}

/** Ids das 3 paletas de cada modelo (spec 1.2). A primeira é a padrão. */
export const PALETTE_IDS = {
  mesa: ["terracota", "oliva", "noite"],
  estudio: ["carvao", "rosa", "marinho"],
  oficio: ["laranja", "azul", "verde"],
  vitrine: ["areia", "nevoa", "vinho"],
} as const satisfies Record<TemplateId, readonly string[]>;

export type PaletteId<T extends TemplateId = TemplateId> = (typeof PALETTE_IDS)[T][number];

export function defaultPalette(template: TemplateId): PaletteId {
  return PALETTE_IDS[template][0];
}

export function isPaletteOf(template: TemplateId, id: unknown): id is PaletteId {
  return typeof id === "string" && (PALETTE_IDS[template] as readonly string[]).includes(id);
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Preço como texto ("12,50", "a partir de 30"): moeda e formato são dela. */
export interface SiteItem {
  name: string;
  price?: string;
  note?: string;
}

/** "09:00". Dia sem linha = fechado ou não informado. */
export interface SiteHours {
  day: Weekday;
  open: string;
  close: string;
}

export interface SiteContent {
  version: 2;
  template: TemplateId;
  palette: string;
  name: string;
  tagline?: string; // vazio: padrão do modelo no idioma
  about?: string; // vazio: padrão do modelo
  items?: SiteItem[]; // máx. 12
  hours?: SiteHours[];
  address?: string;
  city: string | null;
  countryCode: string;
  phone?: string;
  whatsapp?: string; // só dígitos com DDI ("447700900123"); vazio por padrão
  instagram?: string; // handle sem @
  email?: string;
  heroImage?: Id<"_storage">; // ausente: foto padrão do modelo
  gallery?: Id<"_storage">[]; // máx. 6
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
}

const weekday = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);

export const siteContentValidator = v.object({
  version: v.literal(2),
  template: v.union(v.literal("mesa"), v.literal("estudio"), v.literal("oficio"), v.literal("vitrine")),
  palette: v.string(),
  name: v.string(),
  tagline: v.optional(v.string()),
  about: v.optional(v.string()),
  items: v.optional(
    v.array(v.object({ name: v.string(), price: v.optional(v.string()), note: v.optional(v.string()) })),
  ),
  hours: v.optional(v.array(v.object({ day: weekday, open: v.string(), close: v.string() }))),
  address: v.optional(v.string()),
  city: v.union(v.string(), v.null()),
  countryCode: v.string(),
  phone: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  instagram: v.optional(v.string()),
  email: v.optional(v.string()),
  heroImage: v.optional(v.id("_storage")),
  gallery: v.optional(v.array(v.id("_storage"))),
  category: v.union(v.string(), v.null()),
  rating: v.union(v.number(), v.null()),
  reviewsCount: v.union(v.number(), v.null()),
});

/** Trava de compilação: validador e interface não podem divergir (atribuíveis nos dois sentidos). */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const siteContentValidatorMatches: MutuallyAssignable<
  Infer<typeof siteContentValidator>,
  SiteContent
> = true;

/** Categoria (valores de CATEGORY_OPTIONS, spec 1.1) para modelo. Tudo o mais é vitrine. */
export const TEMPLATE_BY_CATEGORY: Record<string, TemplateId> = {
  restaurant: "mesa",
  cafe: "mesa",
  bar: "mesa",
  pub: "mesa",
  "pizza restaurant": "mesa",
  bakery: "mesa",
  "pastry shop": "mesa",
  "ice cream shop": "mesa",
  "barber shop": "estudio",
  "hair salon": "estudio",
  "beauty salon": "estudio",
  "nail salon": "estudio",
  spa: "estudio",
  "tattoo studio": "estudio",
  gym: "estudio",
  "personal trainer": "estudio",
  "yoga studio": "estudio",
  plumber: "oficio",
  electrician: "oficio",
  locksmith: "oficio",
  "car repair": "oficio",
  "car wash": "oficio",
  "driving school": "oficio",
  photographer: "oficio",
};

/**
 * Segunda chance por palavra-chave: a categoria gravada nem sempre é o valor do
 * select. O Places grava `primaryType` ("barber_shop", "italian_restaurant"), o
 * seed do demo usa "barber" e "hair_salon", e a criação manual é texto livre.
 * A ordem importa (mesa antes de estudio: "spanish restaurant" não é spa).
 */
const KEYWORDS: [RegExp, TemplateId][] = [
  [/restaurant|caf[eé]|coffee|\bbar\b|\bpub\b|bakery|pastry|ice ?cream|pizza|bistro|brasserie|diner/, "mesa"],
  [/barber|hair|salon|beauty|nail|\bspa\b|tattoo|\bgym\b|fitness|yoga|massage|trainer/, "estudio"],
  [/plumb|electric|locksmith|car ?repair|car ?wash|mechanic|garage|driving|photograph/, "oficio"],
];

/** Modelo sugerido pela categoria do lead. Desconhecida, nula ou vazia: vitrine. */
export function suggestTemplate(category: string | null | undefined): TemplateId {
  if (!category) return "vitrine";
  const key = category.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!key) return "vitrine";
  const exact = TEMPLATE_BY_CATEGORY[key];
  if (exact) return exact;
  for (const [re, id] of KEYWORDS) if (re.test(key)) return id;
  return "vitrine";
}

export type SiteCtaKind = "whatsapp" | "phone" | "email";
export interface SiteCta {
  kind: SiteCtaKind;
  href: string;
}

/**
 * Canais disponíveis na ordem da spec 1.6: WhatsApp (só se ela preencheu; nunca
 * derivado do telefone), telefone, e-mail. Vazio = sem botão nenhum.
 */
export function ctaOptions(c: Pick<SiteContent, "whatsapp" | "phone" | "email">): SiteCta[] {
  const out: SiteCta[] = [];
  const wa = c.whatsapp?.replace(/\D/g, "") ?? "";
  if (wa) out.push({ kind: "whatsapp", href: `https://wa.me/${wa}` });
  const phone = c.phone?.trim() ?? "";
  if (phone) out.push({ kind: "phone", href: `tel:${phone.replace(/\s+/g, "")}` });
  const email = c.email?.trim() ?? "";
  if (email) out.push({ kind: "email", href: `mailto:${email}` });
  return out;
}

/** CTA primário do hero (spec 1.6): o primeiro canal que existir, ou null. */
export function primaryCta(c: Pick<SiteContent, "whatsapp" | "phone" | "email">): SiteCta | null {
  return ctaOptions(c)[0] ?? null;
}

/**
 * URL do mapa embutido (adendo 2026-09-18): Google Maps sem chave de API, só a
 * busca pelo endereço com a cidade. Só faz sentido com endereço; cidade sozinha
 * não basta (o modelo não chama isto sem `address`). Devolve null sem endereço
 * para o chamador não renderizar um mapa de cidade inteira como se fosse o
 * negócio.
 */
export function mapEmbedUrl(address: string | undefined, city: string | null | undefined): string | null {
  const a = address?.trim() ?? "";
  if (!a) return null;
  const c = city?.trim() ?? "";
  const q = c ? `${a}, ${c}` : a;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

/** Mínimo que a página consegue renderizar; o chamador troca o nome pelo do lead quando o tem. */
export function minimalContent(): SiteContent {
  return {
    version: 2,
    template: "vitrine",
    palette: defaultPalette("vitrine"),
    name: "",
    city: null,
    countryCode: "GB",
    category: null,
    rating: null,
    reviewsCount: null,
  };
}

function str(x: unknown): string | undefined {
  return typeof x === "string" ? x : undefined;
}

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function opt<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: V });
}

function isItem(x: unknown): x is SiteItem {
  return !!x && typeof x === "object" && typeof (x as SiteItem).name === "string";
}

function isHours(x: unknown): x is SiteHours {
  if (!x || typeof x !== "object") return false;
  const h = x as SiteHours;
  return (
    typeof h.day === "number" &&
    Number.isInteger(h.day) &&
    h.day >= 0 &&
    h.day <= 6 &&
    typeof h.open === "string" &&
    typeof h.close === "string"
  );
}

/**
 * Lê `previews.content` (v.any()) e devolve sempre um SiteContent v2:
 * - formato antigo (PreviewContent, sem `version`): converte (modelo sugerido
 *   pela categoria, paleta padrão, canais e campos novos ausentes);
 * - nulo ou corrompido: o mínimo (vitrine, nome vazio). Nunca lança: uma
 *   query lançando derruba o drawer inteiro (spec 2.1).
 */
export function parseSiteContent(raw: unknown): SiteContent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return minimalContent();
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  if (name === undefined) return minimalContent();

  const category = str(r.category) ?? null;
  const phone = str(r.phone);
  const shared = {
    name,
    city: str(r.city) ?? null,
    countryCode: str(r.countryCode) || "GB",
    ...opt("phone", phone),
    category,
    rating: num(r.rating),
    reviewsCount: num(r.reviewsCount),
  };

  if (r.version !== 2) {
    // Formato antigo: só os campos do lead. Nenhum job de migração (spec 4); a
    // primeira gravação do editor já salva v2.
    const template = suggestTemplate(category);
    return { version: 2, template, palette: defaultPalette(template), ...shared };
  }

  const template = isTemplateId(r.template) ? r.template : suggestTemplate(category);
  const items = Array.isArray(r.items) ? r.items.filter(isItem) : undefined;
  const hours = Array.isArray(r.hours) ? r.hours.filter(isHours) : undefined;
  const gallery = Array.isArray(r.gallery)
    ? r.gallery.filter((g): g is Id<"_storage"> => typeof g === "string")
    : undefined;
  return {
    version: 2,
    template,
    palette: isPaletteOf(template, r.palette) ? r.palette : defaultPalette(template),
    ...shared,
    ...opt("tagline", str(r.tagline)),
    ...opt("about", str(r.about)),
    ...opt("items", items),
    ...opt("hours", hours),
    ...opt("address", str(r.address)),
    ...opt("whatsapp", str(r.whatsapp)),
    ...opt("instagram", str(r.instagram)),
    ...opt("email", str(r.email)),
    ...opt("heroImage", typeof r.heroImage === "string" ? (r.heroImage as Id<"_storage">) : undefined),
    ...opt("gallery", gallery),
  };
}

export const LIMITS = {
  name: 80,
  tagline: 120,
  about: 1200,
  items: 12,
  itemName: 60,
  itemPrice: 20,
  itemNote: 80,
  gallery: 6,
} as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Limites da spec 2.1, no servidor. Lança `userError` com a mensagem do campo
 * (pt-BR: quem lê é a Duda, no rodapé do editor). Campo vazio é "não
 * preenchido", não erro: o editor manda "" para o que ela limpou.
 */
export function validateSiteContent(c: SiteContent): void {
  const name = c.name.trim();
  if (name.length < 1 || name.length > LIMITS.name) {
    throw userError(`Nome: entre 1 e ${LIMITS.name} caracteres`);
  }
  if ((c.tagline ?? "").length > LIMITS.tagline) {
    throw userError(`Slogan: no máximo ${LIMITS.tagline} caracteres`);
  }
  if ((c.about ?? "").length > LIMITS.about) {
    throw userError(`Sobre: no máximo ${LIMITS.about} caracteres`);
  }
  if (!isPaletteOf(c.template, c.palette)) throw userError("Paleta inválida para este modelo");

  const items = c.items ?? [];
  if (items.length > LIMITS.items) throw userError(`Itens: no máximo ${LIMITS.items}`);
  for (const it of items) {
    const n = it.name.trim();
    if (n.length < 1 || n.length > LIMITS.itemName) {
      throw userError(`Item: nome entre 1 e ${LIMITS.itemName} caracteres`);
    }
    if ((it.price ?? "").length > LIMITS.itemPrice) {
      throw userError(`Item: preço com no máximo ${LIMITS.itemPrice} caracteres`);
    }
    if ((it.note ?? "").length > LIMITS.itemNote) {
      throw userError(`Item: nota com no máximo ${LIMITS.itemNote} caracteres`);
    }
  }

  const seen = new Set<number>();
  for (const h of c.hours ?? []) {
    if (seen.has(h.day)) throw userError("Horário: no máximo uma linha por dia");
    seen.add(h.day);
    if (!HHMM.test(h.open) || !HHMM.test(h.close)) throw userError("Horário: use o formato HH:MM");
  }

  if ((c.gallery ?? []).length > LIMITS.gallery) {
    throw userError(`Galeria: no máximo ${LIMITS.gallery} fotos`);
  }
  if (c.instagram && /[@\s/]/.test(c.instagram)) {
    throw userError("Instagram: só o nome de usuário, sem @, espaço ou barra");
  }
  if (c.whatsapp && !/^\d{8,15}$/.test(c.whatsapp)) {
    throw userError("WhatsApp: só dígitos com DDI, de 8 a 15");
  }
  if (c.email && !c.email.includes("@")) throw userError("E-mail inválido");
}

/** O que o lead precisa ter para alimentar o conteúdo inicial (Doc<"leads"> serve). */
export interface LeadLike {
  name: string;
  category?: string | null;
  city?: string | null;
  countryCode: string;
  phone?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  instagram?: string | null;
}

/**
 * Conteúdo inicial a partir do lead, usado UMA vez, na criação do preview
 * (spec Decisões: editar o lead depois não propaga). `whatsapp` e `email`
 * ficam vazios: o e-mail do lead é canal de outreach, não necessariamente
 * público, e WhatsApp derivado do telefone afirmaria um atendimento que
 * ninguém verificou. `instagram` é a exceção: quando o lead já tem o handle
 * (achado no OSM ou digitado à mão), ele é público por natureza — pré-preenche.
 */
export function defaultContentForLead(lead: LeadLike): SiteContent {
  const template = suggestTemplate(lead.category);
  return {
    version: 2,
    template,
    palette: defaultPalette(template),
    // 80 é o limite de `validateSiteContent`; um nome maior seria erro no
    // primeiro Salvar sem ela ter mexido no campo.
    name: lead.name.trim().slice(0, LIMITS.name),
    city: lead.city ?? null,
    countryCode: lead.countryCode,
    ...opt("phone", lead.phone || undefined),
    ...opt("address", lead.address || undefined),
    ...opt("instagram", lead.instagram || undefined),
    category: lead.category ?? null,
    rating: lead.rating ?? null,
    reviewsCount: lead.reviewsCount ?? null,
  };
}

/** Ids de storage referenciados pelo conteúdo (hero e galeria), sem repetição. */
export function imageIds(c: Pick<SiteContent, "heroImage" | "gallery">): Id<"_storage">[] {
  const out = new Set<Id<"_storage">>();
  if (c.heroImage) out.add(c.heroImage);
  for (const id of c.gallery ?? []) out.add(id);
  return [...out];
}

/**
 * Ids que estavam em `before` e não estão em `after`: o que `saveContent` apaga
 * do storage DEPOIS de gravar o conteúdo novo (spec 2.4). Trocar de slot (hero
 * vira galeria) não conta como saída.
 */
export function removedImageIds(
  before: Pick<SiteContent, "heroImage" | "gallery">,
  after: Pick<SiteContent, "heroImage" | "gallery">,
): Id<"_storage">[] {
  const keep = new Set(imageIds(after));
  return imageIds(before).filter((id) => !keep.has(id));
}
