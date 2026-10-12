// Operação por CLI da migração GPLC-04. Dev: `npx convex run googleCompliance:migrateAll '{"dryRun":true}' > /tmp/x.json`
// (redirecionar para arquivo; `| head` trava, LESSONS). Produção: SÓ com aprovação explícita da Duda e backup
// antes (plano 10-12).
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { isDevEnv } from "./lib/env";
import { emptyReport, mergeReports, migrateLeads, type MigrationReport } from "./model/googleMigration";

type BatchResult = { report: MigrationReport; isDone: boolean; continueCursor: string };

// 50 leads por transação (~3 leituras por lead): folgado nos limites do Convex.
export const migrateBatch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), dryRun: v.boolean(), numItems: v.optional(v.number()) },
  handler: async (ctx, a): Promise<BatchResult> => {
    const page = await ctx.db.query("leads").paginate({ cursor: a.cursor, numItems: a.numItems ?? 50 });
    return {
      report: await migrateLeads(ctx, page.page, a.dryRun),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const migrateAll = internalAction({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }): Promise<MigrationReport & { dryRun: boolean; batches: number }> => {
    let cursor: string | null = null;
    let total = emptyReport();
    let batches = 0;
    for (;;) {
      const r: BatchResult = await ctx.runMutation(internal.googleCompliance.migrateBatch, { cursor, dryRun });
      total = mergeReports(total, r.report);
      batches++;
      if (r.isDone) break;
      cursor = r.continueCursor;
    }
    return { dryRun, batches, ...total };
  },
});

/** Fixtures fictícias (prefixo "Fixture") para ensaiar a migração no dev. */
export const seedDevFixtures = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    if (!isDevEnv()) throw new Error("seedDevFixtures só roda no deployment de dev (CONVEX_ENV=development).");
    const now = Date.now();
    const base = { orgId, countryCode: "GB", city: "London", stage: "base" as const, stageUpdatedAt: now, fetchedAt: now };
    const google = (name: string) => ({
      ...base, source: "places" as const, saved: true, name,
      phone: "+44 20 0000 0001", address: "1 Fixture St", website: "https://fixture.test",
      rating: 4.6, reviewsCount: 31, category: "italian_restaurant",
    });
    const g1 = await ctx.db.insert("leads", {
      ...google("Fixture Google Um"), email: "info@fixture.test", stage: "approached",
      instagram: "fixture1", callScript: "texto",
    });
    const g2 = await ctx.db.insert("leads", google("Fixture Google Dois"));
    const g3 = await ctx.db.insert("leads", google("Fixture Google Tres"));
    await ctx.db.insert("leads", {
      ...base, source: "places", saved: true, name: "Fixture Typed Name", category: "cafe",
      confirmation: { at: now, via: "call" },
    });
    await ctx.db.insert("leads", {
      ...base, source: "osm", saved: true, name: "Fixture Osm One", phone: "+44 20 0000 0002", rating: 4,
    });
    await ctx.db.insert("leads", { ...base, source: "manual", name: "Fixture Manual One" });

    const legacy = (name: string, phone: string) => ({
      name, phone, address: "1 Fixture St", category: "italian_restaurant",
      rating: 4.6, reviewsCount: 31, city: "London", countryCode: "GB",
    });
    await ctx.db.insert("previews", {
      orgId, leadId: g1, token: "fixturetok1", openCount: 0, content: legacy("Fixture Google Um", "+44 20 0000 0001"),
    });
    await ctx.db.insert("previews", {
      orgId, leadId: g2, token: "fixturetok2", openCount: 0, published: true, slug: "fixture-abc123",
      content: legacy("Fixture Google Dois", "+44 20 0000 0001"),
    });
    await ctx.db.insert("previews", {
      orgId, leadId: g3, token: "fixturetok3", openCount: 0, content: legacy("Fixture Editado", "+44 20 0000 0099"),
    });
    await ctx.db.insert("outreach", { orgId, leadId: g1, channel: "email", status: "sent", sentAt: now });

    await ctx.db.insert("suppressions", { email: "global@fixture.test", source: "manual", at: now });
    await ctx.db.insert("suppressions", { orgId, email: "org@fixture.test", source: "manual", at: now });
    return { leads: 6, previews: 3 };
  },
});
