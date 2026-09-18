"use client";

import { TEMPLATE_IDS, defaultPalette, suggestTemplate, type SiteContent, type TemplateId } from "@convex/lib/site";
import { TEMPLATES, palettesOf } from "@/components/site-templates";
import { TemplateThumb } from "@/components/site-templates/template-thumb";
import { Badge } from "@/components/ui";
import { Block } from "./fields";

/**
 * Blocos Modelo e Paleta (spec 3.1). Cada cartão de modelo é um `div` com um
 * botão esticado por cima (`absolute inset-0`), não um `<button>` em volta da
 * miniatura: o hero renderizado tem `header`/`section`/`h1`, que não podem
 * viver dentro de um botão. Trocar de modelo mantém todos os campos
 * (`withTemplate`, no pai).
 */
export function TemplateBlock({
  draft,
  onTemplate,
  onPalette,
}: {
  draft: SiteContent;
  onTemplate: (template: TemplateId) => void;
  onPalette: (palette: string) => void;
}) {
  const suggested = suggestTemplate(draft.category);
  const name = draft.name || "Nome do negócio";
  return (
    <>
      <Block title="Modelo" hint="Trocar mantém textos e fotos">
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_IDS.map((id) => {
            const t = TEMPLATES[id];
            const active = draft.template === id;
            return (
              <div
                key={id}
                className={`relative rounded-xl border p-2 transition-colors ${
                  active ? "border-brand bg-brand-soft" : "border-border bg-surface-2 hover:border-border-strong"
                }`}
              >
                <TemplateThumb
                  template={id}
                  palette={active ? draft.palette : defaultPalette(id)}
                  name={name}
                  className="rounded-lg border border-border"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{t.name}</span>
                  {id === suggested && <Badge tone="brand">Sugerido</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">{t.description}</p>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`Modelo ${t.name}`}
                  onClick={() => onTemplate(id)}
                  className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />
              </div>
            );
          })}
        </div>
      </Block>

      <Block title="Paleta">
        <div className="flex flex-wrap gap-2">
          {palettesOf(draft.template).map((p) => {
            const active = draft.palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPalette(p.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border bg-surface-solid text-muted hover:border-border-strong hover:text-foreground"
                }`}
              >
                <span className="relative h-5 w-8 shrink-0" aria-hidden>
                  <span
                    className="absolute left-0 top-0 h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.bg }}
                  />
                  <span
                    className="absolute left-3 top-0 h-5 w-5 rounded-full border border-black/10"
                    style={{ backgroundColor: p.accent }}
                  />
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </Block>
    </>
  );
}
