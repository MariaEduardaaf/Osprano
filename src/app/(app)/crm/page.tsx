import { PageHeader } from "@/components/ui";
import { PIPELINE_STAGES } from "@convex/lib/domain";

export default function CrmPage() {
  return (
    <>
      <PageHeader title="CRM" subtitle="Filtre, priorize e gerencie o contato com cada lead" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.filter((s) => s.id !== "lost").map((stage) => (
          <div key={stage.id} className="w-64 shrink-0">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{stage.label}</span>
              <span className="text-xs tabular-nums text-faint">0</span>
            </div>
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 text-xs text-faint">
              Sem leads
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
