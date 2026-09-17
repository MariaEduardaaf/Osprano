"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateId } from "@convex/lib/site";
import { renderHero, sampleView } from "./index";

/** Largura virtual em que o hero é renderizado antes de ser reduzido. */
const VIRTUAL_WIDTH = 1280;

/**
 * Miniatura ao vivo de um modelo (spec 1.4): renderiza SÓ o hero, numa largura
 * virtual de 1280 px, reduzido com CSS `zoom` (não `transform`, que deixaria a
 * caixa de layout no tamanho original) para caber na largura do contêiner pai,
 * medida com ResizeObserver. Proporção 16:10, `pointer-events: none`, `aria-hidden`.
 * Usa só as fotos padrão; nunca resolve storage.
 */
export function TemplateThumb({
  template,
  palette,
  name,
  className = "",
}: {
  template: TemplateId;
  palette: string;
  name: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // O observer dispara já com o tamanho inicial: não há setState síncrono no efeito.
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none relative aspect-[16/10] w-full select-none overflow-hidden ${className}`}
    >
      {width > 0 && (
        <div style={{ width: VIRTUAL_WIDTH, zoom: width / VIRTUAL_WIDTH }}>
          {renderHero(sampleView(template, palette, name), "pt")}
        </div>
      )}
    </div>
  );
}
