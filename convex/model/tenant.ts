import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/**
 * Resolve the current tenant. MVP: one workspace per Clerk user, keyed by the
 * user's subject. (Clerk-org support is a later change — swap in `identity.org_id`.)
 * Works in queries, mutations, and actions (all expose `ctx.auth`).
 */
export async function requireOrgId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) return identity.subject;
  // Demo mode (dev only): a shared, unauthenticated "demo" workspace.
  if (process.env.DEMO_MODE === "1") return "demo";
  throw new Error("Não autenticado");
}
