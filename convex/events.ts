import { query } from "./_generated/server";
import { requireOrgId } from "./model/tenant";

/** Recent activity for the workspace (preview opens, sends, stage changes). */
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const events = await ctx.db
      .query("events")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(30);
    // Nota é comentário privado do CRM; o feed é atividade do sistema. take(30) e corte em 15
    // para o feed manter o tamanho de hoje mesmo com notas no meio.
    const visible = events.filter((e) => e.type !== "note").slice(0, 15);
    return await Promise.all(
      visible.map(async (e) => {
        const lead = e.leadId ? await ctx.db.get(e.leadId) : null;
        return {
          _id: e._id,
          type: e.type,
          at: e.at,
          leadName: lead?.name ?? null,
          // `source` cobre contact_opt_in/wa_opt_in (ver eventLabel em dashboard/page.tsx).
          meta: (e.meta ?? null) as { to?: string; channel?: string; source?: string } | null,
        };
      }),
    );
  },
});
