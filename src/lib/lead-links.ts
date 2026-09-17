// `MARKETS` é import relativo com extensão `.ts` de propósito: os testes rodam
// em `node --experimental-strip-types`, que não lê os `paths` do tsconfig (o
// alias `@convex/*` quebraria) nem resolve import sem extensão. `Doc` é só
// tipo — o import é apagado antes de qualquer resolução, então o alias é
// seguro ali.
import type { Doc } from "@convex/_generated/dataModel";
import { MARKETS } from "../../convex/lib/domain.ts";

type LeadForLinks = Pick<
  Doc<"leads">,
  "website" | "source" | "placeId" | "name" | "address" | "city" | "countryCode"
>;

export type WhatTheyHaveLabel = "Ver site" | "Ver no Google" | "Buscar no Google";

export interface WhatTheyHaveLink {
  href: string;
  label: WhatTheyHaveLabel;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Site salvo sem esquema ("www.foo.com") vira link clicável de verdade. */
function normalizeWebsite(website: string): string {
  return HAS_SCHEME.test(website) ? website : `https://${website}`;
}

/**
 * O que o lead já tem online hoje, na melhor fonte disponível:
 *   1. site próprio, se houver;
 *   2. ficha do Google Maps (Places, quando há placeId);
 *   3. busca no Google Maps por nome + endereço/cidade + país — cobre
 *      OSM/manual sem site, e Places sem placeId.
 */
export function whatTheyHaveLink(lead: LeadForLinks): WhatTheyHaveLink {
  if (lead.website) {
    return { href: normalizeWebsite(lead.website), label: "Ver site" };
  }
  if (lead.source === "places" && lead.placeId) {
    return {
      href: `https://www.google.com/maps/place/?q=place_id:${lead.placeId}`,
      label: "Ver no Google",
    };
  }
  const country = MARKETS[lead.countryCode]?.name ?? lead.countryCode;
  const locality = lead.address ?? lead.city ?? "";
  const query = `${lead.name}, ${locality}, ${country}`;
  return {
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    label: "Buscar no Google",
  };
}
