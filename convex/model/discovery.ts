import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  inferLegalForm,
  emailFields,
  type Signals,
  type Tier,
  type LegalForm,
  type ContactType,
} from "../lib/domain.ts";

/**
 * Lead do Google (Fase 10): os dados ao vivo do Text Search servem só para CALCULAR
 * derivados aqui; o documento guarda placeId + termo buscado + cidade/país do formulário
 * + derivados. Nada do conteúdo do Google entra no banco.
 */
export interface PlacesLive {
  name?: string;
  website?: string;
  phone?: string;
  rating?: number;
  reviewsCount?: number;
}

export interface PlacesDerived {
  signals: Signals;
  score: number;
  tier: Tier;
  legalForm: LegalForm;
  contactType: ContactType;
  emailable: boolean;
}

export function placesDerived(live: PlacesLive, countryCode: string): PlacesDerived {
  const web = classifyWebsite(live.website);
  const signals: Signals = {
    noSite: !live.website,
    socialOnly: web.socialOnly,
    noHttps: false,
    notMobile: false,
    slow: false,
    sparseProfile: !live.phone || live.rating === undefined || (live.reviewsCount ?? 0) < 5,
  };
  const score = computeScore(signals);
  const legalForm = inferLegalForm(live.name ?? "", countryCode);
  const { contactType, emailable } = emailFields({ countryCode, legalForm }, undefined);
  return { signals, score, tier: tierFromScore(score), legalForm, contactType, emailable };
}

export interface InsertPlacesArgs {
  orgId: string;
  placeId: string;
  category: string;
  city: string;
  countryCode: string;
  derived: PlacesDerived;
}

export async function insertPlacesLead(
  ctx: MutationCtx,
  args: InsertPlacesArgs,
  now: number = Date.now(),
): Promise<{ leadId: Id<"leads">; created: boolean }> {
  const existing = await ctx.db
    .query("leads")
    .withIndex("by_org_place", (q) => q.eq("orgId", args.orgId).eq("placeId", args.placeId))
    .first();
  // não reescreve nada: dado confirmado pela cliente é dela
  if (existing) return { leadId: existing._id, created: false };

  const { derived: d } = args;
  const leadId = await ctx.db.insert("leads", {
    orgId: args.orgId,
    source: "places",
    placeId: args.placeId,
    category: args.category,
    city: args.city,
    countryCode: args.countryCode,
    signals: d.signals,
    score: d.score,
    tier: d.tier,
    scoredAt: now,
    legalForm: d.legalForm,
    contactType: d.contactType,
    emailable: d.emailable,
    stage: "base",
    stageUpdatedAt: now,
    saved: false,
    fetchedAt: now,
  });
  return { leadId, created: true };
}
