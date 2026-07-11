import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { computeScore, tierFromScore, isEmailable, type Signals } from "./lib/domain";
import { isDemoEnabled } from "./model/tenant";

const ORG = "demo";
const NONE: Signals = {
  noSite: false,
  socialOnly: false,
  noHttps: false,
  notMobile: false,
  slow: false,
  sparseProfile: false,
};

type Stage = "base" | "approached" | "scheduled" | "followup" | "converted" | "lost";
type LegalForm = "incorporated" | "sole_trader" | "unknown";
type ContactType = "role" | "named" | "unknown";

// [name, category] — realistic European local businesses
const NAMES: [string, string][] = [
  ["The Oak & Barrel Ltd", "restaurant"],
  ["Bella Cucina", "restaurant"],
  ["The Copper Pot", "restaurant"],
  ["De Gouden Lepel BV", "restaurant"],
  ["The Dubliner", "restaurant"],
  ["Smörgås", "restaurant"],
  ["Fjord Kitchen AS", "restaurant"],
  ["Trattoria Roma", "restaurant"],
  ["Olive & Thyme", "cafe"],
  ["Corner Café", "cafe"],
  ["Café Amsterdam", "cafe"],
  ["Fika Corner", "cafe"],
  ["The Bruncherie", "cafe"],
  ["Kaffebar Oslo", "cafe"],
  ["The Tipsy Crow", "bar"],
  ["Bar Bruno", "bar"],
  ["Whiskey & Co", "bar"],
  ["Baker's Dozen Ltd", "bakery"],
  ["Het Broodhuis", "bakery"],
  ["Levain", "bakery"],
  ["Sharp Cuts", "barber"],
  ["The Grooming Room", "barber"],
  ["Kappers Amsterdam BV", "hair_salon"],
  ["Studio Blonde", "hair_salon"],
  ["Cork Barber Co Ltd", "hair_salon"],
  ["Klippet Nordic", "hair_salon"],
  ["Bella Beauty", "beauty_salon"],
  ["Serenity Spa", "spa"],
  ["Glow Studio", "beauty_salon"],
  ["Iron Works Gym", "gym"],
  ["FlexFit Studio", "gym"],
  ["Pilates Loft", "gym"],
  ["Bright Smile Dental", "dentist"],
  ["City Physio", "physiotherapist"],
  ["PetCare Clinic", "veterinarian"],
  ["QuickFix Plumbing", "plumber"],
  ["Bright Spark Electric", "electrician"],
  ["AutoCare Garage AS", "car_repair"],
  ["City Locksmiths", "locksmith"],
  ["Green Thumb Gardens", "florist"],
  ["Bloom Florist", "florist"],
  ["The Book Nook", "clothing store"],
  ["Vintage Threads", "clothing store"],
  ["Green Grocer", "restaurant"],
  ["Nordic Bygg AS", "car_repair"],
  ["Stockholm Bistro AB", "restaurant"],
  ["The Hungry Fox", "restaurant"],
  ["Amsterdam Ink", "spa"],
];

const COUNTRY_SEQ = ["GB", "GB", "GB", "GB", "NL", "NL", "NL", "IE", "IE", "SE", "SE", "NO"];
const CITY: Record<string, string[]> = {
  GB: ["London", "Manchester", "Bristol", "Leeds", "Brighton"],
  NL: ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven"],
  IE: ["Dublin", "Cork", "Galway"],
  SE: ["Stockholm", "Gothenburg", "Malmö"],
  NO: ["Oslo", "Bergen", "Trondheim"],
};

interface Profile {
  s: Partial<Signals>;
  lf: LegalForm;
  ct: ContactType;
  email?: boolean;
}
const PROFILES: Profile[] = [
  { s: { noSite: true, sparseProfile: true }, lf: "incorporated", ct: "unknown" }, // 75 hot
  { s: { socialOnly: true, sparseProfile: true }, lf: "incorporated", ct: "unknown" }, // 70 hot
  { s: { noHttps: true, notMobile: true, slow: true, sparseProfile: true }, lf: "unknown", ct: "role", email: true }, // 70 hot
  { s: { noSite: true }, lf: "unknown", ct: "unknown" }, // 55 warm, not emailable
  { s: { socialOnly: true }, lf: "incorporated", ct: "unknown" }, // 50 warm
  { s: { notMobile: true, slow: true }, lf: "unknown", ct: "named", email: true }, // 35 cold, not emailable
  { s: { slow: true, sparseProfile: true }, lf: "incorporated", ct: "role", email: true }, // 35 cold
  { s: { notMobile: true }, lf: "unknown", ct: "unknown" }, // 20 cold, not emailable
  { s: { sparseProfile: true }, lf: "sole_trader", ct: "unknown" }, // 20 cold, not emailable
];

const STAGES: Stage[] = [
  "base", "base", "base", "base", "base", "base", "base", "base", "base", "base",
  "approached", "approached", "approached", "approached",
  "scheduled", "scheduled",
  "followup", "followup", "followup",
  "converted", "converted",
  "lost",
];

function phone(cc: string, i: number): string {
  const p: Record<string, string> = { GB: "+44 20 7946", NL: "+31 20 555", IE: "+353 1 555", SE: "+46 8 555", NO: "+47 21 555" };
  return `${p[cc] ?? "+44 20 7946"} ${String(1000 + i * 7).slice(0, 4)}`;
}
function emailLocal(ct: ContactType): string {
  return ct === "named" ? "erik.lindqvist" : "info";
}

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

/** Populate the demo workspace with a rich sample dataset. Demo mode only. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    if (!isDemoEnabled()) throw new Error("DEMO_MODE desligado");
    await clearOrg(ctx);

    const now = Date.now();
    await ctx.db.insert("workspaces", {
      orgId: ORG,
      plan: "pro",
      leadsUsed: 137,
      sitesUsed: 9,
      periodStart: now,
    });

    const ids = [];
    for (let i = 0; i < NAMES.length; i++) {
      const [name, category] = NAMES[i];
      const cc = COUNTRY_SEQ[i % COUNTRY_SEQ.length];
      const cities = CITY[cc];
      const city = cities[i % cities.length];
      const p = PROFILES[i % PROFILES.length];
      const stage = STAGES[(i * 5) % STAGES.length];

      const signals: Signals = { ...NONE, ...p.s };
      const score = computeScore(signals);
      const email = p.email ? `${emailLocal(p.ct)}@${name.toLowerCase().replace(/[^a-z]/g, "")}.example` : undefined;
      const rating = 3.8 + ((i * 3) % 12) / 10; // 3.8–4.9
      const reviews = 20 + ((i * 37) % 400);

      const id = await ctx.db.insert("leads", {
        orgId: ORG,
        source: "places",
        placeId: `demo-${i}`,
        name,
        category,
        city,
        countryCode: cc,
        phone: phone(cc, i),
        email,
        rating: Math.round(rating * 10) / 10,
        reviewsCount: reviews,
        website: p.s.socialOnly ? "https://instagram.com/x" : p.s.noSite ? undefined : "https://example.com",
        score,
        tier: tierFromScore(score),
        signals,
        scoredAt: now,
        legalForm: p.lf,
        contactType: p.ct,
        emailable: isEmailable({ countryCode: cc, legalForm: p.lf, contactType: p.ct }),
        stage,
        stageUpdatedAt: now,
        fetchedAt: now,
      });
      ids.push({ id, name, category, city, cc, stage, phone: phone(cc, i), rating: Math.round(rating * 10) / 10, reviews });
    }

    // Publish sites for a handful (opened/converted leads), previews for a few more
    const publishable = ids.filter(
      (l) => l.stage === "followup" || l.stage === "converted" || l.stage === "scheduled",
    );
    for (let k = 0; k < publishable.length; k++) {
      const l = publishable[k];
      const published = k < 6;
      await ctx.db.insert("previews", {
        orgId: ORG,
        leadId: l.id,
        token: `demotok${k}${l.cc}`,
        slug: published ? `${l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-d${k}` : undefined,
        published,
        openCount: (k * 3) % 11,
        lastOpenedAt: now - k * 3600_000,
        content: {
          name: l.name,
          category: l.category,
          city: l.city,
          phone: l.phone,
          rating: l.rating,
          reviewsCount: l.reviews,
          countryCode: l.cc,
        },
      });
    }

    // Activity feed
    const openedLeads = ids.filter((l) => l.stage === "followup" || l.stage === "converted");
    const approached = ids.filter((l) => l.stage === "approached" || l.stage === "scheduled");
    let t = 0;
    for (const l of openedLeads.slice(0, 8)) {
      await ctx.db.insert("events", { orgId: ORG, type: "preview_open", leadId: l.id, at: now - t * 900_000 });
      t += 1;
    }
    for (const l of approached.slice(0, 5)) {
      await ctx.db.insert("events", { orgId: ORG, type: "email_sent", leadId: l.id, at: now - t * 900_000 });
      t += 1;
    }
    for (const l of ids.filter((x) => x.stage === "converted").slice(0, 3)) {
      await ctx.db.insert("events", { orgId: ORG, type: "stage_change", leadId: l.id, at: now - t * 900_000, meta: { to: "converted" } });
      t += 1;
    }

    // Outbox — abordagens em vários estágios (rascunho → enviado → abriu → respondeu)
    const emailBody = (nm: string, ct: string) =>
      `Olá, tudo bem?\n\nReparei que o ${nm}, aí em ${ct}, ainda não aparece com um site próprio no Google — e quem procura acaba indo pro concorrente que aparece.\n\nMontei uma prévia de site pra vocês, sem custo, só pra dar uma olhada: {link}\n\nSe fizer sentido, respondo com os próximos passos. Se não quiser mais receber, é só avisar que não escrevo de novo.\n\nAbraço.`;
    const mkOutreach = async (
      l: { id: Id<"leads">; name: string; city: string },
      status: "draft" | "sent" | "opened" | "replied",
      opts: { sentAt?: number; openedAt?: number } = {},
    ) => {
      await ctx.db.insert("outreach", {
        orgId: ORG,
        leadId: l.id,
        channel: "email",
        subject: `Uma prévia do site do ${l.name}`,
        body: emailBody(l.name, l.city),
        status,
        sentAt: opts.sentAt,
        openedAt: opts.openedAt,
      });
    };
    const HOUR = 3600_000;
    const drafts = ids.filter((l) => l.stage === "base").slice(0, 5);
    const sent = ids.filter((l) => l.stage === "approached").slice(0, 6);
    const opened = ids.filter((l) => l.stage === "scheduled" || l.stage === "followup").slice(0, 6);
    const replied = ids.filter((l) => l.stage === "converted").slice(0, 3);
    let ot = 1;
    for (const l of drafts) await mkOutreach(l, "draft");
    for (const l of sent) await mkOutreach(l, "sent", { sentAt: now - ot++ * 6 * HOUR });
    for (const l of opened)
      await mkOutreach(l, "opened", { sentAt: now - (ot + 24) * HOUR, openedAt: now - ot++ * 6 * HOUR });
    for (const l of replied) {
      await mkOutreach(l, "replied", { sentAt: now - (ot + 48) * HOUR, openedAt: now - (ot + 6) * HOUR });
      await ctx.db.insert("events", { orgId: ORG, type: "reply", leadId: l.id, at: now - ot++ * 6 * HOUR });
    }

    return { seeded: NAMES.length };
  },
});
