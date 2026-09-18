"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { LIMITS, type SiteContent } from "@convex/lib/site";
import { TEMPLATES } from "@/components/site-templates";
import { ACCEPT } from "@/lib/image-resize";
import { errorMessage } from "@/lib/errors";
import { Block, smallBtnCls } from "./fields";

/** O pai faz o upload e só troca o estado no sucesso; o slot cuida de progresso e erro. */
export type SlotUpload = (file: File, onProgress: (pct: number) => void) => Promise<void>;

function PhotoSlot({
  title,
  src,
  isDefault = false,
  onFile,
  onRemove,
  removeLabel,
}: {
  title: string;
  src?: string;
  isDefault?: boolean;
  onFile: SlotUpload;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de um erro
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      await onFile(file, setProgress);
    } catch (err) {
      // Foto anterior mantida (spec 4): o pai só troca o estado quando o upload inteiro deu certo.
      setError(errorMessage(err, "Falha no envio"));
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{title}</span>
        {isDefault && <span className="text-faint">Padrão</span>}
      </div>
      <div className="mt-1.5 aspect-[16/10] overflow-hidden rounded-md border border-border bg-surface-solid">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL local ou storage do Convex; sem ganho em next/image aqui (spec 1.4)
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-faint">Sem foto</div>
        )}
      </div>
      {busy && (
        <div
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Envio da foto"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void pick(e)} />
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={smallBtnCls}>
          {busy ? "Enviando…" : "Enviar foto"}
        </button>
        {onRemove && removeLabel && (
          <button type="button" disabled={busy} onClick={onRemove} className={smallBtnCls}>
            {removeLabel}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * Bloco Fotos (spec 3.1): principal e galeria (até 6). "Usar padrão" e
 * "Remover" só mudam o estado local; nada é apagado do storage antes do Salvar
 * (spec 2.4). `urls` mapeia id → URL (object URL de upload desta sessão ou URL
 * do storage vinda da query); id sem URL mostra "Sem foto".
 */
export function PhotosBlock({
  draft,
  urls,
  onHeroFile,
  onUseDefault,
  onGalleryFile,
  onRemoveGallery,
}: {
  draft: SiteContent;
  urls: Record<string, string>;
  onHeroFile: SlotUpload;
  onUseDefault: () => void;
  onGalleryFile: (file: File, onProgress: (pct: number) => void, index?: number) => Promise<void>;
  onRemoveGallery: (index: number) => void;
}) {
  const gallery = draft.gallery ?? [];
  const heroUrl = draft.heroImage ? urls[draft.heroImage] : undefined;
  return (
    <Block title="Fotos" hint="JPEG, PNG ou WebP até 10 MB">
      <div className="space-y-3">
        <PhotoSlot
          title="Principal"
          src={heroUrl ?? TEMPLATES[draft.template].photos.hero}
          isDefault={!draft.heroImage}
          onFile={onHeroFile}
          onRemove={draft.heroImage ? onUseDefault : undefined}
          removeLabel="Usar padrão"
        />
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-muted">
            <span>Galeria</span>
            <span className="text-faint">
              {gallery.length}/{LIMITS.gallery}
            </span>
          </div>
          {gallery.length === 0 && <p className="mb-2 text-xs text-muted">Sem fotos a galeria não aparece no site.</p>}
          <div className="grid grid-cols-2 gap-2">
            {gallery.map((id, i) => (
              <PhotoSlot
                key={id}
                title={`Foto ${i + 1}`}
                src={urls[id]}
                onFile={(file, onProgress) => onGalleryFile(file, onProgress, i)}
                onRemove={() => onRemoveGallery(i)}
                removeLabel="Remover"
              />
            ))}
            {gallery.length < LIMITS.gallery && (
              <PhotoSlot key="nova" title="Nova foto" onFile={(file, onProgress) => onGalleryFile(file, onProgress)} />
            )}
          </div>
        </div>
      </div>
    </Block>
  );
}
