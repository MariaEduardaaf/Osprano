import { ConvexError } from "convex/values";

/**
 * Mensagem de erro pronta pra mostrar na tela.
 *
 * Erros lançados no Convex com `userError` (convex/lib/errors.ts) chegam aqui como
 * `ConvexError` com o texto em `data` — é o único tipo que atravessa a fronteira em produção
 * (Error comum vira "Server Error", e em dev vem com o prefixo `[CONVEX M(...)] [Request ID...]`).
 * Qualquer outro `Error` mantém o `message`; o resto cai no `fallback` do chamador.
 */
export function errorMessage(e: unknown, fallback = "Falha"): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  if (e instanceof Error) return e.message;
  return fallback;
}
