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
import { checkHttps, fetchPageSpeed, extractEmail } from "./lib/enrich";

/**
 * Refine a lead after discovery: live Digital Presence signals (HTTPS, PageSpeed)
 * plus compliance enrichment — infer legal form from the name, discover a contact
 * email from the business's own site, classify role vs named, and recompute
 * whether the lead is defensibly emailable.
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
      noHttps = !https;
      if (ps) {
        if (ps.perf !== null) slow = ps.perf < 0.5;
        notMobile = !ps.mobileFriendly;
      }
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
