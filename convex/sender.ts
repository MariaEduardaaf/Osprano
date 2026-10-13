import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { getWorkspace, ensureWorkspace } from "./model/workspace";
import { normalizeSenderInput } from "./lib/sender";

/** Perfil de remetente do workspace (SEND-01); null enquanto não preenchido. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    return (await getWorkspace(ctx, orgId))?.sender ?? null;
  },
});

export const save = mutation({
  args: { name: v.string(), company: v.string(), address: v.string(), replyTo: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const sender = normalizeSenderInput(args);
    const ws = await ensureWorkspace(ctx, orgId);
    await ctx.db.patch(ws._id, { sender });
    return sender;
  },
});
