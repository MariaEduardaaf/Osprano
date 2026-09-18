"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import type { SiteContent } from "@convex/lib/site";
import { buildSiteView } from "@/components/site-templates";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { DICTS, localeForLead } from "@/lib/preview-i18n";
import { imageUrlMap, isDirty, setText, viewImages, withTemplate } from "@/lib/site-editor";
import { TemplateBlock } from "./template-block";
import { TextsBlock } from "./texts-block";
import { LivePreview } from "./live-preview";
import { EditorFooter } from "./editor-footer";

type Preview = NonNullable<FunctionReturnType<typeof api.previews.getForLead>>;

/**
 * Editor do site (spec 3.1). Esta casca resolve o lead (id como string:
 * malformado ou de outra org vira "Lead não encontrado", sem crash), garante o
 * preview (a query nunca cria nada: com `null`, dispara `generate` UMA vez no
 * mount e a query reativa passa a devolver a linha) e só então monta o
 * `EditorBody`, que nasce com o conteúdo salvo e nunca é remontado enquanto
 * a query atualiza `published`/`openCount`.
 */
export function SiteEditor({ leadId, from }: { leadId: string; from: "crm" | "sites" }) {
  const lead = useQuery(api.leads.get, { id: leadId });
  const preview = useQuery(api.previews.getForLead, lead ? { leadId: lead._id } : "skip");
  const generate = useMutation(api.previews.generate);
  const [genError, setGenError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!lead || preview !== null || started.current) return;
    started.current = true;
    generate({ leadId: lead._id }).catch((e: unknown) => setGenError(errorMessage(e, "Falha ao preparar o site")));
  }, [lead, preview, generate]);

  const backHref = from === "sites" ? "/sites" : `/crm?lead=${leadId}`;

  if (lead === null) return <NotFound />;
  if (genError) return <p className="text-sm text-danger">{genError}</p>;
  if (lead === undefined || preview === undefined) return <p className="text-sm text-faint">Carregando…</p>;
  if (preview === null) return <p className="text-sm text-faint">Preparando o site…</p>;
  return <EditorBody key={lead._id} lead={lead} preview={preview} backHref={backHref} />;
}

function NotFound() {
  return (
    <EmptyState title="Lead não encontrado">
      O link pode estar errado ou o lead não é deste workspace.{" "}
      <Link href="/crm" className="font-semibold text-brand hover:underline">
        Voltar ao CRM
      </Link>
    </EmptyState>
  );
}

function EditorBody({ lead, preview, backHref }: { lead: Doc<"leads">; preview: Preview; backHref: string }) {
  const router = useRouter();
  const saveContent = useMutation(api.previews.saveContent);

  // Estado local: o SiteContent inteiro (spec 3.1). "Alterado" = JSON canônico diferente do salvo.
  const [draft, setDraft] = useState<SiteContent>(preview.content);
  const [saved, setSaved] = useState<SiteContent>(preview.content);
  // id → URL das fotos já salvas, resolvidas pela query (os uploads desta sessão entram na Task 11).
  const [urls] = useState<Record<string, string>>(() => imageUrlMap(preview.content, preview.images));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = isDirty(draft, saved);
  const locale = localeForLead(draft.countryCode, draft.city);
  const tr = DICTS[locale].templates[draft.template];
  const view = buildSiteView(draft, viewImages(draft, urls));

  // Sair com mudança pede confirmação (spec 3.1). O Voltar confirma por conta própria.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // "Salvo" por 2 s.
  useEffect(() => {
    if (status !== "saved") return;
    const t = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [status]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveContent({ leadId: lead._id, content: draft });
      setSaved(draft);
      setStatus("saved");
    } catch (e) {
      // Erro de validação do servidor no rodapé, estado local mantido (spec 4).
      setError(errorMessage(e, "Falha ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) return;
    router.push(backHref);
  }

  return (
    <>
      <PageHeader eyebrow="Site" title="Editor do site" subtitle={lead.city ? `${lead.name} · ${lead.city}` : lead.name} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="order-2 space-y-4 xl:order-1">
          <TemplateBlock
            draft={draft}
            onTemplate={(t) => setDraft((c) => withTemplate(c, t))}
            onPalette={(palette) => setDraft((c) => ({ ...c, palette }))}
          />
          <TextsBlock
            draft={draft}
            tr={tr}
            onName={(name) => setDraft((c) => ({ ...c, name }))}
            onText={(key, value) => setDraft((c) => setText(c, key, value))}
          />
        </div>
        <LivePreview
          view={view}
          locale={locale}
          className="order-1 h-[70vh] xl:sticky xl:top-4 xl:order-2 xl:h-[calc(100dvh-7rem)]"
        />
      </div>
      <EditorFooter
        leadId={lead._id}
        token={preview.token}
        slug={preview.slug}
        published={preview.published}
        dirty={dirty}
        saving={saving}
        status={status}
        error={error}
        onSave={() => void save()}
        onBack={back}
      />
    </>
  );
}
