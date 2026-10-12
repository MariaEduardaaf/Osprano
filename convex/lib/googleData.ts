/**
 * Fonte única do que um lead pode levar para fora do app (preview público, mensagem, prompt da
 * IA, DM, links). Regra (Fase 10, termos do Google Maps Platform): de lead do Google (source
 * places) só o place_id é guardado; nome, telefone e endereço só existem quando a cliente
 * confirmou com o próprio negócio. Nunca decidir isso com if solto na tela: usar estes helpers.
 */
import {
  CATEGORY_OPTIONS,
  emailFields,
  inferLegalForm,
  type ContactType,
  type LegalForm,
  type Signals,
} from "./domain.ts";
import { userError } from "./errors.ts";

export type LeadSource = "places" | "fsq" | "osm" | "scrape" | "manual";
export type ConfirmVia = "call" | "visit" | "website" | "social" | "other";
export interface Confirmation {
  at: number;
  via: ConfirmVia;
  noSite?: boolean;
}

/** Forma mínima que os helpers leem. Doc<"leads"> satisfaz. `source` opcional = não-Google. */
export interface LeadFacts {
  source?: LeadSource;
  name?: string;
  phone?: string;
  address?: string;
  category?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  signals?: Signals;
  confirmation?: Confirmation;
}

export const CONFIRM_VIA_OPTIONS: readonly { value: ConfirmVia; label: string }[] = [
  { value: "call", label: "Falei por telefone ou WhatsApp com o negócio" },
  { value: "visit", label: "Fui ao local" },
  { value: "website", label: "Vi no site do próprio negócio" },
  { value: "social", label: "Vi nas redes sociais do negócio" },
  { value: "other", label: "Outro" },
];
export const CONFIRM_NAME_MESSAGE = "Confirme o nome do negócio antes de continuar.";
export const GOOGLE_LEAD_LABEL = "Negócio do Google";

const NAME_MSG = "Digite o nome do negócio.";
const VIA_MSG = "Escolha onde você confirmou estes dados.";

export function isGoogleLead(lead: { source?: string }): boolean {
  return lead.source === "places";
}

/** Rótulo INTERNO de tela (nunca sai do app). */
export function leadLabel(lead: { source?: string; name?: string }): string {
  return lead.name?.trim() || (isGoogleLead(lead) ? GOOGLE_LEAD_LABEL : "Sem nome");
}

const clean = (v: string | undefined): string | null => v?.trim() || null;
const blocked = (lead: LeadFacts) => isGoogleLead(lead) && !lead.confirmation;

export function shareableFacts(lead: LeadFacts): {
  name: string | null;
  phone: string | null;
  address: string | null;
} {
  if (blocked(lead)) return { name: null, phone: null, address: null };
  return { name: clean(lead.name), phone: clean(lead.phone), address: clean(lead.address) };
}

export function shareableName(lead: LeadFacts): string | null {
  return shareableFacts(lead).name;
}

export function shareableCategory(lead: LeadFacts): string | null {
  if (isGoogleLead(lead)) {
    return lead.category && CATEGORY_OPTIONS.some((o) => o.value === lead.category)
      ? lead.category
      : null;
  }
  return clean(lead.category);
}

export function shareableSignals(lead: LeadFacts): Signals | undefined {
  if (!lead.signals) return undefined;
  if (!isGoogleLead(lead)) return lead.signals;
  const s = { ...lead.signals, sparseProfile: false };
  if (lead.confirmation?.noSite !== true) {
    s.noSite = false;
    s.socialOnly = false;
  }
  return s;
}

/** Cópia do lead pronta para sair do app (IA, DM). Uso só em memória; nunca gravar. */
export function shareableLead<T extends LeadFacts>(lead: T): T {
  const facts = shareableFacts(lead);
  const g = isGoogleLead(lead);
  return {
    ...lead,
    name: facts.name ?? undefined,
    phone: facts.phone ?? undefined,
    address: facts.address ?? undefined,
    category: shareableCategory(lead) ?? undefined,
    website: g ? undefined : lead.website,
    rating: g ? undefined : lead.rating,
    reviewsCount: g ? undefined : lead.reviewsCount,
    signals: shareableSignals(lead),
  } as T;
}

export interface ConfirmArgs {
  name?: string;
  phone?: string;
  address?: string;
  via?: ConfirmVia;
  noSite?: boolean;
}
export interface ConfirmLeadPatch {
  name?: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  confirmation?: Confirmation;
  legalForm?: LegalForm;
  contactType?: ContactType;
  emailable?: boolean;
}

/** Lança userError nas regras; devolve o patch (chave presente com undefined = remove o campo). */
export function confirmPatch(
  lead: LeadFacts & { countryCode: string; legalForm?: LegalForm; email?: string },
  args: ConfirmArgs,
  now: number,
): ConfirmLeadPatch {
  if (args.name !== undefined && !args.name.trim()) throw userError(NAME_MSG);
  const first = isGoogleLead(lead) && !lead.confirmation;
  if (first && !args.via) throw userError(VIA_MSG);
  if (first && !args.name?.trim()) throw userError(NAME_MSG);

  const patch: ConfirmLeadPatch = {};
  if (args.name !== undefined) patch.name = args.name.trim().slice(0, 120);
  if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined;
  if (args.address !== undefined) patch.address = args.address.trim() || undefined;

  if (first) {
    // Apaga qualquer resto de conteúdo do Google.
    if (!("phone" in patch)) patch.phone = undefined;
    if (!("address" in patch)) patch.address = undefined;
    patch.website = undefined;
    patch.rating = undefined;
    patch.reviewsCount = undefined;
  }

  const noSite = args.noSite ?? lead.confirmation?.noSite;
  if (args.via) {
    patch.confirmation = { at: now, via: args.via, ...(noSite !== undefined ? { noSite } : {}) };
  } else if (args.noSite !== undefined && lead.confirmation) {
    patch.confirmation = { ...lead.confirmation, noSite: args.noSite };
  }

  if (patch.name && patch.name !== lead.name) {
    const legalForm = inferLegalForm(patch.name, lead.countryCode);
    const { contactType, emailable } = emailFields(
      { countryCode: lead.countryCode, legalForm },
      lead.email,
    );
    patch.legalForm = legalForm;
    patch.contactType = contactType;
    patch.emailable = emailable;
  }
  return patch;
}

type ScrubKey = "name" | "phone" | "address" | "website" | "rating" | "reviewsCount" | "category";

/** Migração (GPLC-04). Patch vazio {} quando nada a limpar (idempotência). */
export function scrubLeadPatch(lead: LeadFacts): Partial<Record<ScrubKey, undefined>> {
  const patch: Partial<Record<ScrubKey, undefined>> = {};
  if (!isGoogleLead(lead)) return patch;
  if (lead.category !== undefined && shareableCategory(lead) === null) patch.category = undefined;
  if (!lead.confirmation) {
    for (const k of ["name", "phone", "address", "website", "rating", "reviewsCount"] as const) {
      if (lead[k] !== undefined) patch[k] = undefined;
    }
  }
  return patch;
}

export interface PreviewContentLike {
  name: string;
  phone?: string;
  address?: string;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
}

/**
 * Recebe o conteúdo JÁ parseado (parseSiteContent) e o lead ANTES do patch de limpeza: compara
 * com o valor do Google ainda gravado. Igual = cópia intacta do Google; diferente = editado pela
 * cliente.
 */
export function scrubPreviewContent<C extends PreviewContentLike>(
  content: C,
  leadBeforePatch: LeadFacts,
  published: boolean,
): { changed: boolean; content: C; keptPublishedName: boolean } {
  const lead = leadBeforePatch;
  if (!isGoogleLead(lead) || lead.confirmation) {
    return { changed: false, content, keptPublishedName: false };
  }
  const next = { ...content };
  let changed = false;
  let keptPublishedName = false;
  const same = (a: string | undefined | null, b: string | undefined) =>
    b !== undefined && a != null && a.trim() === b.trim();

  if (same(content.phone, lead.phone)) {
    delete next.phone;
    changed = true;
  }
  if (same(content.address, lead.address)) {
    delete next.address;
    changed = true;
  }
  if (lead.rating !== undefined && content.rating === lead.rating) {
    next.rating = null;
    changed = true;
  }
  if (lead.reviewsCount !== undefined && content.reviewsCount === lead.reviewsCount) {
    next.reviewsCount = null;
    changed = true;
  }
  if (same(content.category, lead.category) && shareableCategory(lead) === null) {
    next.category = null;
    changed = true;
  }
  if (same(content.name, lead.name)) {
    if (published) keptPublishedName = true;
    else {
      next.name = "";
      changed = true;
    }
  }
  return { changed, content: changed ? next : content, keptPublishedName };
}
