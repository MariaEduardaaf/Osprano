/**
 * Máscaras de campo e preços do Google Places (New). Fontes de preço:
 * https://developers.google.com/maps/billing-and-pricing/pricing e /sku-details (lidas em 2026-10-08).
 * A máscara cobra pelo SKU mais alto: acrescentar campo aqui muda o custo. O teste barra
 * reviews, photos e location.
 */
export type Sku = "essentials_ids" | "essentials" | "pro" | "enterprise";

export const TEXT_SEARCH_FIELDS: readonly string[] = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "nextPageToken",
];

export const DETAILS_FIELDS_LIST: readonly string[] = ["displayName", "formattedAddress"];
export const DETAILS_FIELDS_FULL: readonly string[] = [
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "businessStatus",
];

export const FIELD_SKU: Readonly<Record<string, Sku>> = {
  id: "essentials_ids",
  formattedAddress: "essentials",
  displayName: "pro",
  primaryType: "pro",
  businessStatus: "pro",
  nationalPhoneNumber: "enterprise",
  websiteUri: "enterprise",
  rating: "enterprise",
  userRatingCount: "enterprise",
};

export const DETAILS_PRICE_USD_PER_1000: Readonly<Record<Sku, number>> = {
  essentials_ids: 0,
  essentials: 5,
  pro: 17,
  enterprise: 20,
};
export const GOOGLE_PRICES_CHECKED_AT = "2026-10-08";
export const DETAILS_BATCH_MAX = 24;

const ORDER: readonly Sku[] = ["essentials_ids", "essentials", "pro", "enterprise"];

export function skuForFields(fields: readonly string[]): Sku {
  let max = 0;
  for (const f of fields) {
    const sku = FIELD_SKU[f.replace(/^places\./, "")];
    if (!sku) throw new Error(`Campo sem SKU mapeado: ${f}`);
    max = Math.max(max, ORDER.indexOf(sku));
  }
  return ORDER[max];
}

export function fieldMask(fields: readonly string[]): string {
  return fields.join(",");
}

export interface GooglePlaceLite {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  businessStatus?: string;
}

/** Mapeia o JSON do Google (Text Search ou Place Details) para a forma enxuta, SEM chaves undefined. */
export function toPlaceLite(raw: unknown): GooglePlaceLite {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: GooglePlaceLite = {};
  const dn = r.displayName as { text?: unknown } | undefined;
  if (typeof dn?.text === "string") out.name = dn.text;
  if (typeof r.formattedAddress === "string") out.address = r.formattedAddress;
  if (typeof r.nationalPhoneNumber === "string") out.phone = r.nationalPhoneNumber;
  if (typeof r.websiteUri === "string") out.website = r.websiteUri;
  if (typeof r.rating === "number") out.rating = r.rating;
  if (typeof r.userRatingCount === "number") out.reviewsCount = r.userRatingCount;
  if (typeof r.businessStatus === "string") out.businessStatus = r.businessStatus;
  return out;
}
