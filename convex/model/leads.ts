import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Apaga um lead e tudo que pende dele: previews (site gerado, token e conteúdo),
 * uploads (fotos, apagadas do Convex Storage também), eventos (histórico do CRM)
 * e outreach (rascunhos/envios de email e DM). Usada por `leads.remove` (botão
 * "Excluir" da UI) e por `admin.deleteLead` (CLI) — uma cascata só, nos dois lugares.
 *
 * Não devolve cota: `workspaces.leadsUsed` já foi debitado na descoberta/criação
 * do lead, e apagar depois não desfaz o consumo do mês — a cota mede o que foi
 * gasto, não quantos leads sobrevivem no CRM.
 */
export async function deleteLeadCascade(ctx: MutationCtx, lead: Doc<"leads">): Promise<void> {
  for (const p of await ctx.db
    .query("previews")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .collect())
    await ctx.db.delete(p._id);

  for (const u of await ctx.db
    .query("uploads")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .collect()) {
    // O arquivo pode já ter sumido do storage (apagado por fora): a linha sai mesmo assim.
    if (await ctx.db.system.get("_storage", u.storageId)) await ctx.storage.delete(u.storageId);
    await ctx.db.delete(u._id);
  }

  for (const e of await ctx.db
    .query("events")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .collect())
    await ctx.db.delete(e._id);

  for (const o of await ctx.db
    .query("outreach")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .collect())
    await ctx.db.delete(o._id);

  await ctx.db.delete(lead._id);
}
