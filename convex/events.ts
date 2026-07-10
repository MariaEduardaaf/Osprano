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
      .take(15);
    return await Promise.all(
      events.map(async (e) => {
        const lead = e.leadId ? await ctx.db.get(e.leadId) : null;
        return {
          _id: e._id,
          type: e.type,
          at: e.at,
          leadName: lead?.name ?? null,
          meta: (e.meta ?? null) as { to?: string; channel?: string } | null,
        };
      }),
    );
  },
});
