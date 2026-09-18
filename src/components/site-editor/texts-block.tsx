"use client";

import { LIMITS, type SiteContent } from "@convex/lib/site";
import type { TemplateDict } from "@/lib/preview-i18n";
import type { TextKey } from "@/lib/site-editor";
import { Block, Field, inputCls } from "./fields";

/**
 * Bloco Textos (spec 3.1). Placeholder = o texto padrão do modelo no idioma do
 * lead (`tr`), para ela ver o que sai se deixar vazio. `maxLength` espelha os
 * limites do servidor; o servidor continua validando.
 */
export function TextsBlock({
  draft,
  tr,
  onName,
  onText,
}: {
  draft: SiteContent;
  tr: TemplateDict;
  onName: (name: string) => void;
  onText: (key: TextKey, value: string) => void;
}) {
  return (
    <Block title="Textos" hint="Vazio usa o texto padrão do modelo">
      <div className="space-y-3">
        <Field label="Nome" hint={`${draft.name.length}/${LIMITS.name}`}>
          <input
            value={draft.name}
            maxLength={LIMITS.name}
            onChange={(e) => onName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Slogan" hint={`${(draft.tagline ?? "").length}/${LIMITS.tagline}`}>
          <input
            value={draft.tagline ?? ""}
            maxLength={LIMITS.tagline}
            placeholder={tr.tagline}
            onChange={(e) => onText("tagline", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Sobre" hint={`${(draft.about ?? "").length}/${LIMITS.about}`}>
          <textarea
            value={draft.about ?? ""}
            maxLength={LIMITS.about}
            placeholder={tr.about}
            rows={4}
            onChange={(e) => onText("about", e.target.value)}
            className={`${inputCls} resize-y`}
          />
        </Field>
      </div>
    </Block>
  );
}
