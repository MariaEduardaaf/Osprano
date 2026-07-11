import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/** O modo demo só liga fora de produção. DEFAULT-DENY: exige CONVEX_ENV="development"
 *  explícito (env esquecida = demo off = seguro). NODE_ENV NÃO serve aqui — o bundler
 *  do Convex o fixa em "production" em todo deployment (ver 01-RESEARCH.md, Pitfall 1). */
export function isDemoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMO_MODE === "1" && env.CONVEX_ENV === "development";
}

/**
 * Resolve the current tenant. MVP: one workspace per Clerk user, keyed by the
 * user's subject. (Clerk-org support is a later change — swap in `identity.org_id`.)
 * Works in queries, mutations, and actions (all expose `ctx.auth`).
 */
export async function requireOrgId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity.subject;
  // Demo mode (dev only): a shared, unauthenticated "demo" workspace.
  if (isDemoEnabled()) return "demo";
  throw new Error("Não autenticado");
}
