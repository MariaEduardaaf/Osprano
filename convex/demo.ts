import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { computeScore, tierFromScore, type Signals } from "./lib/domain";

const ORG = "demo";
const NONE: Signals = {
  noSite: false,
  socialOnly: false,
  noHttps: false,
  notMobile: false,
  slow: false,
  sparseProfile: false,
};

type Stage = "base" | "approached" | "opened" | "replied" | "converted" | "lost";
type LegalForm = "incorporated" | "sole_trader" | "unknown";
type ContactType = "role" | "named" | "unknown";

interface Sample {
  name: string;
  category: string;
  city: string;
  countryCode: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  reviewsCount?: number;
  signals: Partial<Signals>;
  stage: Stage;
  legalForm: LegalForm;
  contactType: ContactType;
  emailable: boolean;
}

const SAMPLES: Sample[] = [
  {
    name: "The Oak & Barrel Ltd",
    category: "restaurant",
    city: "Manchester",
    countryCode: "GB",
    phone: "+44 161 555 0198",
    rating: 4.6,
    reviewsCount: 212,
    signals: { noSite: true, sparseProfile: true },
    stage: "base",
    legalForm: "incorporated",
    contactType: "unknown",
    emailable: true,
  },
  {
    name: "Jansen Kappers BV",
    category: "hair_salon",
    city: "Amsterdam",
    countryCode: "NL",
    phone: "+31 20 555 0142",
    website: "https://instagram.com/jansenkappers",
    rating: 4.4,
    reviewsCount: 98,
    signals: { socialOnly: true, sparseProfile: true },
    stage: "approached",
    legalForm: "incorporated",
    contactType: "unknown",
    emailable: true,
  },
  {
    name: "The Dublin Corner Café",
    category: "cafe",
    city: "Dublin",
    countryCode: "IE",
    phone: "+353 1 555 0173",
    website: "http://dublincornercafe.ie",
    email: "info@dublincornercafe.ie",
    rating: 4.2,
    reviewsCount: 61,
    signals: { noHttps: true, notMobile: true, slow: true, sparseProfile: true },
    stage: "opened",
    legalForm: "unknown",
    contactType: "role",
    emailable: true,
  },
  {
    name: "Nordic Bygg AS",
    category: "car_repair",
    city: "Oslo",
    countryCode: "NO",
    phone: "+47 21 555 019",
    rating: 4.7,
    reviewsCount: 143,
    signals: { noSite: true },
    stage: "base",
    legalForm: "incorporated",
    contactType: "unknown",
    emailable: true,
  },
  {
    name: "Stockholm Bistro AB",
    category: "restaurant",
    city: "Stockholm",
    countryCode: "SE",
    phone: "+46 8 555 0121",
    website: "https://stockholmbistro.se",
    email: "erik.lindqvist@stockholmbistro.se",
    rating: 4.1,
    reviewsCount: 77,
    signals: { slow: true, notMobile: true, sparseProfile: true },
    stage: "base",
    legalForm: "incorporated",
    contactType: "named", // named individual → NOT emailable (shows the guardrail)
    emailable: false,
  },
  {
    name: "Cork Barber Co Ltd",
    category: "hair_salon",
    city: "Cork",
    countryCode: "IE",
    phone: "+353 21 555 0166",
    website: "https://linktr.ee/corkbarber",
    rating: 4.8,
    reviewsCount: 190,
    signals: { socialOnly: true },
    stage: "converted",
    legalForm: "incorporated",
    contactType: "role",
    emailable: true,
  },
];

async function clearOrg(ctx: MutationCtx): Promise<void> {
  for (const l of await ctx.db.query("leads").withIndex("by_org", (q) => q.eq("orgId", ORG)).collect())
    await ctx.db.delete(l._id);
  for (const p of await ctx.db.query("previews").withIndex("by_org", (q) => q.eq("orgId", ORG)).collect())
    await ctx.db.delete(p._id);
  for (const e of await ctx.db.query("events").withIndex("by_org", (q) => q.eq("orgId", ORG)).collect())
    await ctx.db.delete(e._id);
  for (const o of await ctx.db.query("outreach").withIndex("by_org", (q) => q.eq("orgId", ORG)).collect())
    await ctx.db.delete(o._id);
  for (const w of await ctx.db.query("workspaces").withIndex("by_org", (q) => q.eq("orgId", ORG)).collect())
    await ctx.db.delete(w._id);
}

/** Populate the demo workspace with realistic sample data. Demo mode only. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.DEMO_MODE !== "1") throw new Error("DEMO_MODE desligado");
    await clearOrg(ctx);

    const now = Date.now();
    await ctx.db.insert("workspaces", {
      orgId: ORG,
      plan: "pro",
      leadsUsed: 24,
      sitesUsed: 3,
      periodStart: now,
    });

    const ids = [];
    for (const s of SAMPLES) {
      const signals: Signals = { ...NONE, ...s.signals };
      const score = computeScore(signals);
      const id = await ctx.db.insert("leads", {
        orgId: ORG,
        source: "places",
        placeId: `demo-${s.name}`,
        name: s.name,
        category: s.category,
        city: s.city,
        countryCode: s.countryCode,
        phone: s.phone,
        website: s.website,
        email: s.email,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        score,
        tier: tierFromScore(score),
        signals,
        scoredAt: now,
        legalForm: s.legalForm,
        contactType: s.contactType,
        emailable: s.emailable,
        stage: s.stage,
        stageUpdatedAt: now,
        fetchedAt: now,
      });
      ids.push(id);
    }

    const featured = ids[1];
    const l2 = SAMPLES[1];
    await ctx.db.insert("previews", {
      orgId: ORG,
      leadId: featured,
      token: "demopreviewtoken0001",
      slug: "jansen-kappers-demo01",
      published: true,
      openCount: 3,
      lastOpenedAt: now,
      content: {
        name: l2.name,
        category: l2.category,
        city: l2.city,
        phone: l2.phone ?? null,
        rating: l2.rating ?? null,
        reviewsCount: l2.reviewsCount ?? null,
        countryCode: l2.countryCode,
      },
    });

    await ctx.db.insert("events", {
      orgId: ORG,
      type: "preview_open",
      leadId: featured,
      previewToken: "demopreviewtoken0001",
      at: now - 1000 * 60 * 8,
    });
    await ctx.db.insert("events", {
      orgId: ORG,
      type: "email_sent",
      leadId: ids[2],
      at: now - 1000 * 60 * 40,
    });
    await ctx.db.insert("events", {
      orgId: ORG,
      type: "preview_open",
      leadId: ids[2],
      at: now - 1000 * 60 * 90,
    });
    await ctx.db.insert("events", {
      orgId: ORG,
      type: "stage_change",
      leadId: ids[5],
      at: now - 1000 * 60 * 120,
      meta: { to: "converted" },
    });

    return { seeded: SAMPLES.length };
  },
});
