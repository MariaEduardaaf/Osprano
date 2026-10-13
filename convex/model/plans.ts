import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeEmail, planOf, type Plan } from "../lib/domain.ts";
import { ensureWorkspace } from "./workspace.ts";

/** Só para a marca de teste (NÃO para supressão): tira +tag e, no Gmail, os pontos. */
export function trialEmail(email: string): string {
  const [local = "", domain = ""] = normalizeEmail(email).split("@");
  const base = local.split("+")[0] ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return `${base.replaceAll(".", "")}@gmail.com`;
  return `${base}@${domain}`;
}

/** SHA-256 hex do e-mail normalizado (nunca o e-mail em claro). Sem e-mail no token, cai no subject. */
export async function trialKey(who: {
  email?: string;
  subject: string;
}): Promise<{ key: string; via: "email" | "subject" }> {
  const email = who.email?.trim();
  const via = email ? "email" : "subject";
  const text = `osprano-trial:${email ? trialEmail(email) : `sub:${who.subject}`}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { key, via };
}

/** PLAN-04: o teste é da pessoa, não da conta. A tabela trialClaims não é tocada pelo purge. */
export async function claimTrial(
  ctx: MutationCtx,
  orgId: string,
  claim: { key: string; via: "email" | "subject" },
  now: number = Date.now(),
): Promise<void> {
  const ws = await ensureWorkspace(ctx, orgId);
  const existing = await ctx.db
    .query("trialClaims")
    .withIndex("by_key", (q) => q.eq("key", claim.key))
    .first();
  if (!existing) {
    await ctx.db.insert("trialClaims", {
      key: claim.key,
      orgId,
      via: claim.via,
      // max: o workspace pode ter sido criado milissegundos depois do `now` congelado da mutation.
      claimedAt: Math.max(now, ws._creationTime ?? 0),
    });
    return;
  }
  const again = existing.orgId !== orgId || (ws._creationTime ?? 0) > existing.claimedAt;
  if (again && planOf(ws.plan) === "trial" && ws.trialSpent !== true) {
    await ctx.db.patch(ws._id, { trialSpent: true });
  }
}

export async function orgIdForEmail(ctx: QueryCtx | MutationCtx, email: string): Promise<string | null> {
  const { key } = await trialKey({ email, subject: "" });
  const hit = await ctx.db
    .query("trialClaims")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return hit?.orgId ?? null;
}

/** Concessão manual do beta (sem Stripe). Começa um período novo. */
export async function grantPlanFor(ctx: MutationCtx, orgId: string, plan: Plan, now: number = Date.now()): Promise<void> {
  const ws = await ensureWorkspace(ctx, orgId);
  await ctx.db.patch(ws._id, {
    plan,
    trialSpent: false,
    leadsUsed: 0,
    sitesUsed: 0,
    detailsUsed: 0,
    aiUsed: 0,
    verificationsUsed: 0,
    periodStart: now,
  });
}

export async function migrateFreeBatch(
  ctx: MutationCtx,
  dryRun: boolean,
): Promise<{ found: number; migrated: number }> {
  // ponytail: tabela pequena no beta; paginar se passar de alguns milhares
  const free = (await ctx.db.query("workspaces").collect()).filter((w) => w.plan === "free");
  if (!dryRun) for (const w of free) await ctx.db.patch(w._id, { plan: "trial" });
  return { found: free.length, migrated: dryRun ? 0 : free.length };
}
