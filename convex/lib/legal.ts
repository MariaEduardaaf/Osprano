/**
 * Fonte única da identidade da empresa vendedora (brasileira) e da versão dos documentos legais.
 *
 * Módulo puro (zero imports): roda em Node (testes), no Convex e no Next.
 * O build NÃO falha por placeholder: o aviso é visual (`PlaceholderNotice`). A checagem
 * "zero placeholders" é item do portão de lançamento (Fase 16).
 */

export const PLACEHOLDER = "__PREENCHER__";

// Versão única de Termos + Privacidade + DPA + demais. Subir quando qualquer um mudar de forma
// material; subir obriga todo cliente a aceitar de novo no próximo acesso.
export const LEGAL_VERSION = "2026-10-12";
export const LEGAL_EFFECTIVE_DATE = "2026-10-12"; // AAAA-MM-DD

export interface LegalIdentity {
  brand: string;
  legalName: string;
  taxIdLabel: string;
  taxId: string;
  address: string;
  country: string;
  supportEmail: string;
  privacyEmail: string;
  euRepresentative: string;
}

export const LEGAL_IDENTITY: LegalIdentity = {
  brand: "Osprano",
  legalName: "58.493.767 MARIA EDUARDA ALVES FREIRE", // razão social (Receita Federal)
  taxIdLabel: "CNPJ",
  taxId: "58.493.767/0001-80",
  address: "Rua Manoel Vicente de Brito, 1401, Farolândia, Aracaju/SE, CEP 49032-100", // sede no CNPJ
  country: "Brasil",
  supportEmail: "madualvesfr@gmail.com",
  privacyEmail: "madualvesfr@gmail.com",
  // Representante na UE (GDPR art. 27). "" se o advogado confirmar que não se aplica
  // (aí a página não mostra a linha).
  euRepresentative: PLACEHOLDER,
};

export type LegalSlug =
  | "empresa"
  | "termos"
  | "privacidade"
  | "dpa"
  | "subprocessadores"
  | "cookies"
  | "aviso-prospect";

export const LEGAL_DOCS = [
  { slug: "empresa", title: "Informações da empresa" },
  { slug: "termos", title: "Termos de Uso" },
  { slug: "privacidade", title: "Política de Privacidade" },
  { slug: "dpa", title: "Acordo de Tratamento de Dados (DPA)" },
  { slug: "subprocessadores", title: "Subprocessadores" },
  { slug: "cookies", title: "Política de Cookies" },
  { slug: "aviso-prospect", title: "Aviso a negócios contatados" },
] as const satisfies readonly { slug: LegalSlug; title: string }[];

export function legalHref(slug: LegalSlug): string {
  return `/legal/${slug}`;
}

/** Campos ainda não preenchidos. String vazia NÃO é placeholder (= não se aplica). */
export function legalPlaceholders(identity: LegalIdentity = LEGAL_IDENTITY): (keyof LegalIdentity)[] {
  return (Object.keys(identity) as (keyof LegalIdentity)[]).filter((k) => identity[k] === PLACEHOLDER);
}

export function displayValue(value: string): string {
  return value === PLACEHOLDER ? "[a preencher]" : value;
}

/** "2026-10-12" -> "12/10/2026" (sem Date, sem fuso). */
export function formatLegalDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

export function isAccepted(
  ws: { termsVersion?: string; professionalUse?: boolean } | null | undefined,
  required: string = LEGAL_VERSION,
): boolean {
  return !!ws && ws.termsVersion === required && ws.professionalUse === true;
}
