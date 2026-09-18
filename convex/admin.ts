import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Manutenção: passa tudo que pertence a uma org para outra (ex.: dados
 * importados do demo para a conta real da dona). Só pela CLI
 * (`npx convex run admin:adoptOrg '{"from":"demo","to":"user_..."}'`);
 * internalMutation nunca é chamável pelo cliente.
 */
export const adoptOrg = internalMutation({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const counts: Record<string, number> = {};
    // Tabelas com índice by_org.
    for (const table of ["leads", "previews", "events", "outreach"] as const) {
      let n = 0;
      for (const doc of await ctx.db.query(table).withIndex("by_org", (q) => q.eq("orgId", from)).collect()) {
        await ctx.db.patch(doc._id, { orgId: to });
        n += 1;
      }
      counts[table] = n;
    }
    // Sem índice by_org: varredura completa (tabelas pequenas).
    for (const table of ["uploads", "suppressions"] as const) {
      let n = 0;
      for (const doc of await ctx.db.query(table).collect()) {
        if (doc.orgId !== from) continue;
        await ctx.db.patch(doc._id, { orgId: to });
        n += 1;
      }
      counts[table] = n;
    }
    const fromWs = await ctx.db.query("workspaces").withIndex("by_org", (q) => q.eq("orgId", from)).first();
    const toWs = await ctx.db.query("workspaces").withIndex("by_org", (q) => q.eq("orgId", to)).first();
    if (fromWs) {
      if (toWs) {
        await ctx.db.patch(toWs._id, {
          plan: fromWs.plan,
          leadsUsed: fromWs.leadsUsed,
          sitesUsed: fromWs.sitesUsed,
          periodStart: fromWs.periodStart,
        });
        await ctx.db.delete(fromWs._id);
      } else {
        await ctx.db.patch(fromWs._id, { orgId: to });
      }
      counts.workspaces = 1;
    }
    return counts;
  },
});
