"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { imageIds, type SiteContent } from "@convex/lib/site";
import { buildSiteView } from "@/components/site-templates";
import { EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { DICTS, localeForLead } from "@/lib/preview-i18n";
import {
  addGalleryImage,
  addItem,
  imageUrlMap,
  isDirty,
  removeGalleryImage,
  removeItem,
  replaceGalleryImage,
  setDay,
  setHero,
  setItem,
  setText,
  viewImages,
  withTemplate,
} from "@/lib/site-editor";
import { TemplateBlock } from "./template-block";
import { TextsBlock } from "./texts-block";
import { ItemsBlock } from "./items-block";
import { HoursBlock } from "./hours-block";
import { ContactBlock } from "./contact-block";
import { PhotosBlock } from "./photos-block";
import { LivePreview } from "./live-preview";
import { EditorFooter } from "./editor-footer";
import { useUpload } from "./use-upload";

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
  const removeUpload = useMutation(api.previews.removeUpload);
  const upload = useUpload(lead._id);

  // Estado local: o SiteContent inteiro (spec 3.1). "Alterado" = JSON canônico diferente do salvo.
  const [draft, setDraft] = useState<SiteContent>(preview.content);
  const [saved, setSaved] = useState<SiteContent>(preview.content);
  // id → URL: object URLs dos uploads desta sessão + URLs do storage que a query resolveu para o salvo.
  const [urls, setUrls] = useState<Record<string, string>>(() => imageUrlMap(preview.content, preview.images));
  // Uploads feitos aqui e ainda não salvos: só estes podem ser descartados com `removeUpload`.
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(() => new Set());
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

  // Object URLs são revogadas ao desmontar (spec 2.4); o ref guarda o mapa mais recente para o cleanup.
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);
  useEffect(
    () => () => {
      for (const u of Object.values(urlsRef.current)) if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    },
    [],
  );

  // "Salvo" por 2 s.
  useEffect(() => {
    if (status !== "saved") return;
    const t = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [status]);

  /** Descarta um upload que nunca foi salvo. Id já salvo fica: quem apaga é o servidor, depois do próximo Salvar. */
  function discard(id: Id<"_storage">) {
    if (!unsaved.has(id)) return;
    setUnsaved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const u = urls[id];
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
    setUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Melhor esforço: se o servidor recusar ("Imagem em uso" ou já apagada), o arquivo fica; sem coleta nesta rodada.
    void removeUpload({ storageId: id }).catch(() => undefined);
  }

  function adopt(id: Id<"_storage">, url: string) {
    setUrls((prev) => ({ ...prev, [id]: url }));
    setUnsaved((prev) => new Set(prev).add(id));
  }

  async function onHeroFile(file: File, onProgress: (pct: number) => void) {
    const previous = draft.heroImage;
    const { id, url } = await upload(file, onProgress);
    adopt(id, url);
    setDraft((c) => setHero(c, id));
    if (previous) discard(previous);
  }

  async function onGalleryFile(file: File, onProgress: (pct: number) => void, index?: number) {
    const previous = index === undefined ? undefined : draft.gallery?.[index];
    const { id, url } = await upload(file, onProgress);
    adopt(id, url);
    setDraft((c) => (index === undefined ? addGalleryImage(c, id) : replaceGalleryImage(c, index, id)));
    if (previous) discard(previous);
  }

  function onUseDefault() {
    const previous = draft.heroImage;
    setDraft((c) => setHero(c, undefined));
    if (previous) discard(previous);
  }

  function onRemoveGallery(index: number) {
    const previous = draft.gallery?.[index];
    setDraft((c) => removeGalleryImage(c, index));
    if (previous) discard(previous);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveContent({ leadId: lead._id, content: draft });
      setSaved(draft);
      const kept = new Set<string>(imageIds(draft));
      setUnsaved((prev) => new Set(Array.from(prev).filter((id) => !kept.has(id))));
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
          <ItemsBlock
            draft={draft}
            onAdd={() => setDraft((c) => addItem(c))}
            onChange={(i, patch) => setDraft((c) => setItem(c, i, patch))}
            onRemove={(i) => setDraft((c) => removeItem(c, i))}
          />
          <HoursBlock draft={draft} onDay={(day, range) => setDraft((c) => setDay(c, day, range))} />
          <ContactBlock draft={draft} onText={(key, value) => setDraft((c) => setText(c, key, value))} />
          <PhotosBlock
            draft={draft}
            urls={urls}
            onHeroFile={onHeroFile}
            onUseDefault={onUseDefault}
            onGalleryFile={onGalleryFile}
            onRemoveGallery={onRemoveGallery}
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
