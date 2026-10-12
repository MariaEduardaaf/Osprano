// GPLC-04: limpa conteúdo do Google de leads existentes. Idempotente. Relatório só com contagens e
// ids (nunca dado do negócio). Histórico (events, outreach, callScript, slug) não é tocado: só contado.
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { isGoogleLead, scrubLeadPatch, scrubPreviewContent } from "../lib/googleData.ts";
import { parseSiteContent } from "../lib/site.ts";

export interface MigrationReport {
  leadsScanned: number;
  placesLeads: number;
  confirmedLeads: number;
  leadsCleaned: number;
  leadsWithoutNameAfter: number;
  previewsCleaned: number;
  publishedNameKept: number;
  publishedNameKeptLeadIds: string[];
  previewsChangedWithSentOutreach: number;
  leadsWithOutreachHistory: number;
  leadsWithCallScript: number;
}

export function emptyReport(): MigrationReport {
  return {
    leadsScanned: 0,
    placesLeads: 0,
    confirmedLeads: 0,
    leadsCleaned: 0,
    leadsWithoutNameAfter: 0,
    previewsCleaned: 0,
    publishedNameKept: 0,
    publishedNameKeptLeadIds: [],
    previewsChangedWithSentOutreach: 0,
    leadsWithOutreachHistory: 0,
    leadsWithCallScript: 0,
  };
}

export function mergeReports(a: MigrationReport, b: MigrationReport): MigrationReport {
  return {
    leadsScanned: a.leadsScanned + b.leadsScanned,
    placesLeads: a.placesLeads + b.placesLeads,
    confirmedLeads: a.confirmedLeads + b.confirmedLeads,
    leadsCleaned: a.leadsCleaned + b.leadsCleaned,
    leadsWithoutNameAfter: a.leadsWithoutNameAfter + b.leadsWithoutNameAfter,
    previewsCleaned: a.previewsCleaned + b.previewsCleaned,
    publishedNameKept: a.publishedNameKept + b.publishedNameKept,
    publishedNameKeptLeadIds: [...a.publishedNameKeptLeadIds, ...b.publishedNameKeptLeadIds],
    previewsChangedWithSentOutreach: a.previewsChangedWithSentOutreach + b.previewsChangedWithSentOutreach,
    leadsWithOutreachHistory: a.leadsWithOutreachHistory + b.leadsWithOutreachHistory,
    leadsWithCallScript: a.leadsWithCallScript + b.leadsWithCallScript,
  };
}

export async function migrateLeads(
  ctx: MutationCtx,
  leads: Doc<"leads">[],
  dryRun: boolean,
): Promise<MigrationReport> {
  const r = emptyReport();
  for (const lead of leads) {
    r.leadsScanned++;
    if (!isGoogleLead(lead)) continue;
    r.placesLeads++;
    if (lead.confirmation) r.confirmedLeads++;

    const patch = scrubLeadPatch(lead);
    const patchKeys = Object.keys(patch);
    if (patchKeys.length > 0) r.leadsCleaned++;
    const nameAfter = "name" in patch ? undefined : lead.name;
    if (!nameAfter?.trim()) r.leadsWithoutNameAfter++;
    if (lead.callScript) r.leadsWithCallScript++;

    const outreachRows = await ctx.db
      .query("outreach")
      .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
      .take(20);
    if (outreachRows.length > 0) r.leadsWithOutreachHistory++;

    const preview = await ctx.db
      .query("previews")
      .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
      .first();
    // Ordem importa: o preview é comparado com o lead ANTES do patch.
    const scrubbed = preview
      ? scrubPreviewContent(parseSiteContent(preview.content), lead, preview.published === true && !!preview.slug)
      : null;
    // Formato antigo (sem version 2) pode guardar endereço do Google que o parse
    // descarta: regravar sempre no formato novo para o campo cru sair do banco.
    const legacy = !!preview && (preview.content as { version?: unknown } | null)?.version !== 2;
    const next = scrubbed && legacy ? { ...scrubbed, changed: true } : scrubbed;
    if (preview && next) {
      if (next.changed) {
        r.previewsCleaned++;
        if (outreachRows.some((o) => o.status !== "draft")) r.previewsChangedWithSentOutreach++;
      }
      if (next.keptPublishedName) {
        r.publishedNameKept++;
        r.publishedNameKeptLeadIds.push(lead._id);
      }
    }

    if (dryRun) continue;
    if (patchKeys.length > 0) await ctx.db.patch(lead._id, patch);
    if (preview && next?.changed) await ctx.db.patch(preview._id, { content: next.content });
  }
  return r;
}
