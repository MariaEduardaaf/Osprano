import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrgId } from "./model/tenant";
import { hasWaOptIn } from "./lib/domain";
import { userError } from "./lib/errors";

/**
 * Send a WhatsApp follow-up. COMPLIANCE: allowed ONLY after the prospect has a
 * registered opt-in, checked via hasWaOptIn(lead). Two equivalent legal bases:
 *  - lead.waOptInAt — opt-in específico de WhatsApp (leads.recordWaOptIn);
 *  - lead.contactOptInAt — consentimento de contato generalizado (OPTIN-04,
 *    leads.recordContactOptIn), que destrava email E WhatsApp com um único registro.
 * Ambos gravam origem + timestamp + evento, que são a prova de consentimento.
 * Kanban stage does NOT unlock WhatsApp — moving a card never grants consent.
 * Cold WhatsApp is unlawful in the EU without prior opt-in.
 */
export const sendFollowup = action({
  args: { leadId: v.id("leads"), message: v.string() },
  handler: async (ctx, { leadId, message }): Promise<{ sent: boolean }> => {
    const orgId = await requireOrgId(ctx);
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead || lead.orgId !== orgId) throw userError("Lead não encontrado");
    if (!hasWaOptIn(lead)) {
      throw userError("WhatsApp só com opt-in registrado do prospect.");
    }
    if (!lead.phone) throw userError("Lead sem telefone.");

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) throw userError("WHATSAPP_TOKEN / WHATSAPP_PHONE_ID não configurados.");

    const to = lead.phone.replace(/[^0-9]/g, "");
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) {
      // Corpo da resposta só nos logs do Convex: nunca vaza pro cliente.
      console.error(`WhatsApp ${res.status}:`, (await res.text()).slice(0, 200));
      throw userError(`WhatsApp respondeu ${res.status}`);
    }

    await ctx.runMutation(internal.whatsapp.record, { orgId, leadId, message });
    return { sent: true };
  },
});

export const record = internalMutation({
  args: { orgId: v.string(), leadId: v.id("leads"), message: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("outreach", {
      orgId: args.orgId,
      leadId: args.leadId,
      channel: "whatsapp",
      body: args.message,
      status: "sent",
      sentAt: Date.now(),
    });
  },
});
