import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  inferLegalForm,
  inferContactType,
  isEmailable,
  type Signals,
} from "./lib/domain";
import { checkHttps, fetchPageSpeed, extractEmail, isSlow, isNotMobile } from "./lib/enrich";

/**
 * Refine a lead after discovery: live Digital Presence signals (HTTPS, PageSpeed)
 * plus compliance enrichment — infer legal form from the name, discover a contact
 * email from the business's own site, classify role vs named, and recompute
 * whether the lead is defensibly emailable.
 *
 * INVARIANTE DE SINAL: cada flag de `Signals` significa "pain VERIFICADA".
 * Medição que não voltou (timeout, bloqueio anti-bot, PageSpeed fora do ar) fica
 * `false` — não pontua, não vira frase no email. Nunca escreva `!medida` aqui:
 * foi assim (`noHttps = !https`) que qualquer falha de rede virou a acusação
 * "o site deste negócio não tem HTTPS".
 */
export const scoreLead = internalAction({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.runQuery(internal.leads.getInternal, { leadId });
    if (!lead) return;

    const web = classifyWebsite(lead.website);
    let noHttps = false;
    let notMobile = false;
    let slow = false;
    let discoveredEmail: string | undefined = lead.email ?? undefined;

    if (web.hasRealSite && lead.website) {
      const key = process.env.GOOGLE_PAGESPEED_API_KEY;
      const [https, ps, email] = await Promise.all([
        checkHttps(lead.website),
        fetchPageSpeed(lead.website, key),
        discoveredEmail ? Promise.resolve(discoveredEmail) : extractEmail(lead.website),
      ]);
      // Só evidência positiva de ausência de TLS vira pain; "unknown" fica false.
      noHttps = https.status === "insecure";
      if (https.status === "unknown") {
        console.log(`[scoring] HTTPS indeterminado para ${lead.website} (${https.reason})`);
      }
      slow = isSlow(ps);
      notMobile = isNotMobile(ps);
      if (email) discoveredEmail = email;
    }

    const signals: Signals = {
      noSite: !lead.website,
      socialOnly: web.socialOnly,
      noHttps,
      notMobile,
      slow,
      sparseProfile: !lead.phone || lead.rating === undefined || (lead.reviewsCount ?? 0) < 5,
    };
    const score = computeScore(signals);

    const legalForm = inferLegalForm(lead.name, lead.countryCode);
    const contactType = inferContactType(discoveredEmail);
    const emailable = isEmailable({ countryCode: lead.countryCode, legalForm, contactType });

    await ctx.runMutation(internal.leads.applyScore, {
      leadId,
      signals,
      score,
      tier: tierFromScore(score),
      email: discoveredEmail,
      legalForm,
      contactType,
      emailable,
    });
  },
});
