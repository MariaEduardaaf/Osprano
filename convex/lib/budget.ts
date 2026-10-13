import { DETAILS_FIELDS_FULL, DETAILS_FIELDS_LIST, DETAILS_PRICE_USD_PER_1000, skuForFields } from "./placesFields.ts";

// Teto de segurança do app inteiro por mês (Google + Anthropic). Valor decidido em 2026-10-13; a Duda troca aqui.
export const GLOBAL_BUDGET_USD = 30;
export const BUDGET_WARN_RATIO = 0.8;

// Text Search Enterprise, por 1.000 chamadas (COST-PRICING 1a).
const TEXT_SEARCH_USD_PER_1000 = 35;

// Custo unitário estimado por chamada paga. A franquia grátis do Google não é descontada
// (superestima de propósito). `ai` arredonda para cima a média de US$ 0,007 (Sonnet 5, COST-PRICING 1c).
export const COST_USD = {
  textSearch: TEXT_SEARCH_USD_PER_1000 / 1000,
  detailsFull: DETAILS_PRICE_USD_PER_1000[skuForFields(DETAILS_FIELDS_FULL)] / 1000,
  detailsList: DETAILS_PRICE_USD_PER_1000[skuForFields(DETAILS_FIELDS_LIST)] / 1000,
  ai: 0.01,
};

export const BUDGET_PAUSED_MESSAGE =
  "Pausamos as buscas no Google e a IA por segurança: o orçamento do mês do Osprano foi atingido. Tente de novo mais tarde ou fale com o suporte.";
