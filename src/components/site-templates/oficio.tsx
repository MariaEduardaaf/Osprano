import { MdOutlinePlace } from "react-icons/md";
import {
  BigFooter,
  CONTAINER,
  FOOTER_CTA,
  Gallery,
  Items,
  MapEmbed,
  Photo,
  PrimaryCta,
  Rating,
  RatingBand,
  SecondaryCta,
  Section,
  SiteRoot,
  Steps,
  Values,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";

/**
 * Ofício: encanador, eletricista, chaveiro, mecânica, fotógrafo. Composição
 * inspirada em Kohr Construction: CTA de orçamento sempre visível no cabeçalho,
 * hero dividido (texto objetivo à esquerda, foto grande do trabalho à direita),
 * serviços com ícone, "como trabalhamos" em passos com fotos de apoio, área
 * atendida que só nomeia a cidade, galeria "nosso trabalho" (só uploads dela).
 * Ritmo (adendo 2026-09-18): hero · valores · serviços* · como trabalhamos ·
 * galeria* · área atendida · faixa de avaliação* · mapa* · rodapé. O contato e
 * o pedido de orçamento moram no rodapé. Serifada (Fraunces) nos títulos.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-4xl font-medium tracking-tight @3xl:text-5xl`;
const h3 = "text-xl font-semibold";
const CTA = TEMPLATES.oficio.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-md bg-(--site-accent) px-6 py-3 text-sm font-semibold text-(--site-accent-fg) transition-opacity hover:opacity-90";
const outline =
  "inline-flex items-center gap-2 rounded-md border border-(--site-line) px-6 py-3 text-sm font-semibold transition-colors hover:border-(--site-accent) hover:text-(--site-accent)";

export function Hero({ view, tr, locale }: TemplateProps) {
  const eyebrow = [view.category?.replace(/_/g, " "), view.city].filter(Boolean).join(" · ");
  return (
    <>
      <header className="border-b border-(--site-line)">
        <div className={`${CONTAINER} flex items-center justify-between gap-6 py-4`}>
          <span className={`${serif} text-xl font-semibold tracking-tight`}>{view.name}</span>
          <PrimaryCta
            view={view}
            tr={tr}
            locale={locale}
            ctaKey={CTA}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-(--site-accent) px-3 py-2 text-xs font-semibold text-(--site-accent) transition-colors hover:bg-(--site-accent) hover:text-(--site-accent-fg) @md:px-4 @md:text-sm"
          />
        </div>
      </header>
      <section className={`${CONTAINER} grid gap-10 py-12 @5xl:grid-cols-2 @5xl:items-center @5xl:py-20`}>
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-accent)">{eyebrow}</p>
          )}
          <h1 className={`${serif} mt-4 text-balance text-4xl font-medium leading-tight tracking-tight @3xl:text-5xl @5xl:text-6xl`}>
            {view.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.tagline || tr.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
            <SecondaryCta view={view} tr={tr} locale={locale} className={outline} />
          </div>
          <Rating view={view} locale={locale} className="mt-6" />
        </div>
        <Photo src={view.heroUrl} alt={heroAlt(view)} className="aspect-[4/3] w-full rounded-lg object-cover" />
      </section>
    </>
  );
}

export function Oficio(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.oficio.photos;
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      {/* Valores: clareza e confiança, com ícone, logo depois do hero */}
      <div className="border-t border-(--site-line)">
        <Values values={tr.values} heading={tr.whyHeading} headingClass={h2} titleClass={h3} variant="icons" />
      </div>

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="checks" />

      {/* Como trabalhamos: o "sobre" abre os três passos; fotos de apoio (decoração fixa, alt vazio) fecham a faixa */}
      <section className="bg-(--site-surface)">
        <Steps
          steps={tr.steps}
          heading={tr.howHeading}
          headingClass={h2}
          titleClass={h3}
          numberClass={`${serif} text-3xl text-(--site-accent)`}
          intro={view.about || tr.about}
        />
        <div className={`${CONTAINER} grid grid-cols-2 gap-4 pb-16 @md:pb-24`}>
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <Photo src={photos.g2} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
        </div>
      </section>

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      {/* Área atendida: só com cidade, e só a cidade (nunca "atendemos a região") */}
      {view.city && (
        <Section className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)">{tr.areaHeading}</h2>
            <p className={`${serif} mt-3 flex items-center gap-3 text-4xl @3xl:text-5xl`}>
              <MdOutlinePlace size={34} className="shrink-0 text-(--site-accent)" aria-hidden />
              {tr.inCity(view.city)}
            </p>
          </div>
          {view.address && <p className="text-(--site-muted)">{view.address}</p>}
        </Section>
      )}

      <RatingBand view={view} locale={locale} tone="accent" numberClass={serif} />

      <MapEmbed view={view} tr={tr} />

      <BigFooter
        view={view}
        tr={tr}
        locale={locale}
        palette={palette}
        ctaKey={CTA}
        nameClass={`${serif} text-3xl font-semibold tracking-tight`}
        ctaClass={`${FOOTER_CTA} rounded-md`}
      />
    </SiteRoot>
  );
}
