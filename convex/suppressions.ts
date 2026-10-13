import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { addSuppression, isEmailSuppressed, suppressByToken } from "./model/suppressions";

export { addSuppression, isEmailSuppressed } from "./model/suppressions";

export const add = internalMutation({
  args: {
    email: v.string(),
    orgId: v.optional(v.string()),
    source: v.string(),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => addSuppression(ctx, args),
});

/** Dual-scope: suprimido se houver row da própria org OU global (orgId undefined). */
export const isSuppressed = internalQuery({
  args: { email: v.string(), orgId: v.string() },
  handler: async (ctx, args) => isEmailSuppressed(ctx, args),
});

/*
 * `countryForUnsubToken` viveu aqui e foi REMOVIDA de propósito: ela resolvia o idioma
 * da página de unsubscribe só pelo país, e na Suíça isso mandava o prospect de Genebra
 * para uma página em alemão. Quem faz esse trabalho agora é
 * `outreach.langForUnsubToken`, que devolve o idioma já resolvido por (país, cidade).
 * Não reintroduzir uma versão country-only: dois resolvedores de idioma divergem.
 */

/*
 * `countryForUnsubToken` viveu aqui e foi REMOVIDA de propósito: ela resolvia o idioma
 * da página de unsubscribe só pelo país, e na Suíça isso mandava o prospect de Genebra
 * para uma página em alemão. Quem faz esse trabalho agora é
 * `outreach.langForUnsubToken`, que devolve o idioma já resolvido por (país, cidade).
 * Não reintroduzir uma versão country-only: dois resolvedores de idioma divergem.
 */

/** Chamado pelo endpoint público (plano 02-03). Grava supressão global (SEND-05). */
export const unsubscribeByToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => suppressByToken(ctx, token),
});
