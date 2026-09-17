import { renderTemplate, type SiteView } from "@/components/site-templates";
import type { Locale } from "@/lib/preview-i18n";

/**
 * Ponto de entrada das páginas públicas (spec 1.4): só delega ao modelo salvo
 * no conteúdo. O `min-h-dvh` mora AQUI, fora de `site-templates/`, onde
 * unidade de viewport é proibida: o modelo tem `flex-1` e estica até o fim.
 */
export function PreviewSite({ view, locale }: { view: SiteView; locale: Locale }) {
  return <div className="flex min-h-dvh flex-col">{renderTemplate(view, locale)}</div>;
}
