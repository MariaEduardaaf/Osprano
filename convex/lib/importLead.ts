// Importação de leads pesquisados fora do app (prospecção manual da Duda).
// Pura: monta o documento e a chave de dedupe; a mutation `admin:importLeads`
// só grava. Regra de compliance igual ao resto: `emailFields` decide `emailable`.

import {
  computeScore,
  emailFields,
  isEmailable,
  normalizeFacebook,
  normalizeInstagram,
  tierFromScore,
  type Signals,
} from "./domain.ts";

export type ImportStage = "base" | "approached";

export interface ImportLeadInput {
  name: string;
  countryCode: string;
  category?: string;
  city?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  /** Empresa conferida no registro oficial (Companies House / CRO). */
  incorporated: boolean;
  /**
   * E-mail conferido como o contato publicado pela própria empresa (página oficial).
   * A heurística `inferContactType` lê caixas de marca curtas ("drakesgas@") como
   * nome de pessoa; aqui a conferência humana manda e o contato vira "role".
   */
  businessEmail?: boolean;
  stage: ImportStage;
}

/** Chave de dedupe: e-mail (minúsculo) quando há; senão nome + cidade. */
export function importDedupeKey(lead: { name: string; city?: string; email?: string }): string {
  const email = lead.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `name:${norm(lead.name)}|${norm(lead.city)}`;
}

/** Campos do documento `leads` (sem orgId/timestamps, que a mutation põe). */
export function buildImportedLead(input: ImportLeadInput) {
  const countryCode = input.countryCode.trim().toUpperCase();
  const legalForm = input.incorporated ? ("incorporated" as const) : ("unknown" as const);
  const clean = input.email?.trim().toLowerCase() || undefined;
  const inferred = emailFields({ countryCode, legalForm }, clean);
  const contact =
    input.businessEmail && clean
      ? { email: clean, contactType: "role" as const, emailable: isEmailable({ countryCode, legalForm, contactType: "role" }) }
      : inferred;
  // Só entra lead sem site de verdade; domínio morto vai pra nota, não pra `website`.
  const signals: Signals = {
    noSite: true,
    socialOnly: Boolean(input.instagram || input.facebook),
    noHttps: false,
    notMobile: false,
    slow: false,
    sparseProfile: !input.phone,
  };
  const score = computeScore(signals);
  return {
    source: "manual" as const,
    name: input.name.trim(),
    category: input.category?.trim() || undefined,
    city: input.city?.trim() || undefined,
    countryCode,
    phone: input.phone?.trim() || undefined,
    instagram: normalizeInstagram(input.instagram),
    facebook: normalizeFacebook(input.facebook),
    score,
    tier: tierFromScore(score),
    signals,
    legalForm,
    ...contact,
    stage: input.stage,
    saved: true,
  };
}
