import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { classifyWebsite, computeScore, tierFromScore, type Signals } from "./lib/domain";
import { checkHttps, fetchPageSpeed } from "./lib/enrich";

/**
 * Refine a lead's Digital Presence Score with live signals: HTTPS validity and
 * PageSpeed (performance + mobile-friendliness). The website-classification
 * signals (noSite / socialOnly) are already set at discovery; this fills the rest.
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

    if (web.hasRealSite && lead.website) {
      const key = process.env.GOOGLE_PAGESPEED_API_KEY;
      const [https, ps] = await Promise.all([
        checkHttps(lead.website),
        fetchPageSpeed(lead.website, key),
      ]);
      noHttps = !https;
      if (ps) {
        if (ps.perf !== null) slow = ps.perf < 0.5;
        notMobile = !ps.mobileFriendly;
      }
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
    await ctx.runMutation(internal.leads.applyScore, {
      leadId,
      signals,
      score,
      tier: tierFromScore(score),
    });
  },
});
