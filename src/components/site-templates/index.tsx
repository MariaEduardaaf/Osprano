import type { ReactElement } from "react";
import type { SiteContent, TemplateId } from "@convex/lib/site";
import { DICTS, type Locale } from "@/lib/preview-i18n";
import { paletteFor } from "./palettes";
import { TEMPLATES } from "./catalog";
import { SiteRoot, type SiteView, type TemplateProps } from "./shared";
import { Mesa, Hero as MesaHero } from "./mesa";
import { Estudio, Hero as EstudioHero } from "./estudio";
import { Oficio, Hero as OficioHero } from "./oficio";
import { Vitrine, Hero as VitrineHero } from "./vitrine";

export { TEMPLATES } from "./catalog";
export type { TemplateMeta, CtaKey } from "./catalog";
export type { SiteView, TemplateProps } from "./shared";
export type { Palette } from "./palettes";
export { paletteFor, palettesOf } from "./palettes";

type Template = (props: TemplateProps) => ReactElement;

const COMPONENTS: Record<TemplateId, { Site: Template; Hero: Template }> = {
  mesa: { Site: Mesa, Hero: MesaHero },
  estudio: { Site: Estudio, Hero: EstudioHero },
  oficio: { Site: Oficio, Hero: OficioHero },
  vitrine: { Site: Vitrine, Hero: VitrineHero },
};

/** URLs resolvidas pela query (`images` de getByToken/getBySlug/getForLead). */
export interface SiteImages {
  heroUrl?: string;
  galleryUrls: string[];
}

/**
 * Monta o SiteView (spec 1.4): upload onde houver, foto padrão do modelo no
 * lugar do hero quando não há. Se o storage não devolveu URL para um
 * `heroImage` gravado, o id é descartado da view para o alt não afirmar que a
 * foto padrão é do negócio.
 */
export function buildSiteView(content: SiteContent, images: SiteImages): SiteView {
  const heroUrl = images.heroUrl ?? TEMPLATES[content.template].photos.hero;
  return {
    ...content,
    heroImage: images.heroUrl ? content.heroImage : undefined,
    heroUrl,
    galleryUrls: images.galleryUrls,
  };
}

function propsFor(view: SiteView, locale: Locale): TemplateProps {
  return {
    view,
    palette: paletteFor(view.template, view.palette),
    tr: DICTS[locale].templates[view.template],
    locale,
  };
}

/** O site inteiro no modelo salvo no conteúdo. */
export function renderTemplate(view: SiteView, locale: Locale): ReactElement {
  const { Site } = COMPONENTS[view.template];
  return <Site {...propsFor(view, locale)} />;
}

/** Só o hero (miniaturas): cada modelo exporta `Hero` além do componente completo. */
export function renderHero(view: SiteView, locale: Locale): ReactElement {
  const p = propsFor(view, locale);
  const { Hero } = COMPONENTS[view.template];
  return (
    <SiteRoot palette={p.palette} locale={locale}>
      <Hero {...p} />
    </SiteRoot>
  );
}

/** View de amostra (miniaturas e cartões): só nome, modelo e paleta; nada de dado inventado. */
export function sampleView(template: TemplateId, palette: string, name: string): SiteView {
  return {
    version: 2,
    template,
    palette,
    name,
    city: null,
    countryCode: "GB",
    category: null,
    rating: null,
    reviewsCount: null,
    heroUrl: TEMPLATES[template].photos.hero,
    galleryUrls: [],
  };
}
