"use client";

import { useEffect, useRef, useState } from "react";
import { renderTemplate, type SiteView } from "@/components/site-templates";
import type { Locale } from "@/lib/preview-i18n";

const WIDTHS = { desktop: 1280, mobile: 390 } as const;
type Device = keyof typeof WIDTHS;

/**
 * Prévia ao vivo (spec 3.1): o modelo de verdade, renderizado com o estado
 * local numa largura virtual (1280 ou 390) e reduzido com CSS `zoom` para
 * caber na largura medida do contêiner (ResizeObserver, como TemplateThumb).
 * `zoom`, não `transform: scale`: o scale deixaria a caixa de layout no
 * tamanho original e criaria rolagem dupla. O site inteiro rola dentro da
 * caixa; `scrollbar-gutter: stable` evita o vaivém largura/zoom quando a barra
 * de rolagem aparece. Funciona porque os modelos usam container queries.
 */
export function LivePreview({ view, locale, className = "" }: { view: SiteView; locale: Locale; className?: string }) {
  const [device, setDevice] = useState<Device>("desktop");
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtual = WIDTHS[device];
  const zoom = width > 0 ? Math.min(1, width / virtual) : 0;

  return (
    <div className={`glass flex flex-col rounded-xl p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">Prévia ao vivo</span>
        <div className="flex gap-1" role="group" aria-label="Largura da prévia">
          {(Object.keys(WIDTHS) as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                device === d ? "bg-brand text-brand-fg" : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {d === "desktop" ? "Desktop" : "Celular"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-surface-2 [scrollbar-gutter:stable]"
      >
        {zoom > 0 && (
          <div style={{ width: virtual, zoom }} className="mx-auto flex flex-col">
            {renderTemplate(view, locale)}
          </div>
        )}
      </div>
    </div>
  );
}
