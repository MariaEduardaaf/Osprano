import { ConvexError } from "convex/values";

/**
 * Erro cuja MENSAGEM é para a usuária (ou para quem opera o deployment) ler.
 *
 * Em deployment de produção o Convex REDIGE a mensagem de qualquer `Error` comum lançado
 * por query/mutation/action: o cliente recebe só "Server Error". Apenas `ConvexError`
 * atravessa a fronteira com o `data` intacto — e é isso que a UI mostra (src/lib/errors.ts).
 *
 * Use para validação, guardrails de compliance, limites de plano, "Lead não encontrado" e
 * dicas de configuração ("X não configurada"). NÃO use para invariantes de programação nem
 * para repassar corpo de resposta de API externa (isso vai para `console.error`, não pro
 * cliente).
 *
 * `ConvexError` estende `Error` e, com `data` string, `message === data` — asserções por
 * regex em `assert.throws` continuam valendo nos testes puros.
 */
export function userError(message: string): ConvexError<string> {
  return new ConvexError(message);
}
