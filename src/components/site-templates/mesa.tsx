import {
  BigFooter,
  CONTAINER,
  Gallery,
  Hours,
  Items,
  MapEmbed,
  Photo,
  PrimaryCta,
  Rating,
  RatingBand,
  SECTION_PAD,
  Section,
  SiteRoot,
  Steps,
  Values,
  Visit,
  hasHours,
  hasItems,
  hasPlace,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";

/**
 * Mesa: restaurante, café, bar, padaria. Composição inspirada em Cutler & Co.:
 * cabeçalho tipográfico, hero com foto grande à direita e coluna de texto à
 * esquerda, bloco institucional em duas colunas, faixa de fotos sem legenda,
 * CTA discreto (sublinhado ou contorno fino). Serifada (Fraunces) nos títulos.
 * Ritmo (adendo 2026-09-18): hero · sobre · valores · cardápio* · galeria* ·
 * faixa de avaliação* · como funciona · horário* · mapa* · rodapé, com as
 * seções separadas por réguas finas, como na referência.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-4xl font-medium tracking-tight @3xl:text-5xl`;
const h3 = `${serif} text-2xl font-medium`;
const eyebrow = "text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)";
const outline =
  "inline-flex w-fit items-center gap-2 rounded-full border border-(--site-text) px-6 py-3 text-sm font-semibold transition-colors hover:bg-(--site-text) hover:text-(--site-bg)";
const CTA = TEMPLATES.mesa.ctaKey;

export function Hero({ view, tr, locale }: TemplateProps) {
  return (
    <>
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <h1 className={`${serif} text-2xl font-semibold tracking-tight`}>{view.name}</h1>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 text-sm font-medium underline decoration-(--site-accent) underline-offset-4 hover:opacity-70 @md:inline-flex"
        />
      </header>
      <section className={`${CONTAINER} grid gap-8 pb-16 pt-2 @5xl:grid-cols-[300px_1fr] @5xl:gap-14 @5xl:pb-24`}>
        <div className="order-2 flex flex-col justify-center @5xl:order-1">
          <p className={`${serif} text-2xl italic leading-snug @3xl:text-3xl`}>{view.tagline || tr.tagline}</p>
          <Rating view={view} locale={locale} className="mt-5" />
          <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={`mt-8 ${outline}`} />
        </div>
        <Photo
          src={view.heroUrl}
          alt={heroAlt(view)}
          className="order-1 aspect-[4/3] w-full object-cover @5xl:order-2 @5xl:aspect-[16/11]"
        />
      </section>
    </>
  );
}

export function Mesa(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.mesa.photos;
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      {/* Sobre: bloco institucional curto em duas colunas, depois a faixa de fotos (decoração fixa, alt vazio) */}
      <section className="border-t border-(--site-line)">
        <div className={`${CONTAINER} grid gap-6 ${SECTION_PAD} @3xl:grid-cols-[1fr_2fr]`}>
          <h2 className={eyebrow}>{tr.aboutHeading}</h2>
          <p className={`${serif} max-w-2xl text-xl leading-relaxed @3xl:text-2xl`}>{view.about || tr.about}</p>
        </div>
        <div className={`${CONTAINER} grid grid-cols-2 gap-3 pb-16 @md:pb-24`}>
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full object-cover" />
          <Photo src={photos.g2} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
      </section>

      {/* Valores: três colunas genéricas do dicionário, sobre postura, com régua fina acima */}
      <div className="border-t border-(--site-line)">
        <Values values={tr.values} heading={tr.whyHeading} headingClass={h2} titleClass={h3} variant="lines" />
      </div>

      {hasItems(view) && (
        <div className="border-t border-(--site-line)">
          <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="lines" />
        </div>
      )}

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      <RatingBand view={view} locale={locale} tone="surface" numberClass={serif} />

      <Steps
        steps={tr.steps}
        heading={tr.howHeading}
        headingClass={h2}
        titleClass={h3}
        numberClass={`${serif} text-3xl italic text-(--site-accent)`}
      />

      {(hasHours(view) || hasPlace(view)) && (
        <section className="border-t border-(--site-line)">
          <Section className="grid gap-12 @3xl:grid-cols-2">
            <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={eyebrow} />
            <Visit view={view} heading={tr.visitHeading} headingClass={eyebrow} />
          </Section>
        </section>
      )}

      {/* Mapa de ponta a ponta, só com endereço */}
      <MapEmbed view={view} tr={tr} className="border-t border-(--site-line)" />

      <BigFooter
        view={view}
        tr={tr}
        locale={locale}
        palette={palette}
        ctaKey={CTA}
        nameClass={`${serif} text-3xl font-semibold tracking-tight`}
        ctaClass={outline}
      />
    </SiteRoot>
  );
}
