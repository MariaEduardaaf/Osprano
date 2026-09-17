import {
  CONTAINER,
  Contact,
  CtaLink,
  Footer,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  SecondaryCta,
  Section,
  SiteRoot,
  Visit,
  ctaLabel,
  hasContact,
  hasHours,
  hasPlace,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Vitrine: loja, clínica, imobiliária, advogado e qualquer categoria
 * desconhecida. Composição inspirada em Wiggs CPA: hero com foto grande ao lado
 * de um bloco de texto com prova social OBJETIVA (só a nota e as avaliações do
 * lead; sem "anos" nem selo inventado), título de seção serifado com lista de
 * destaques com ícone, CTA repetido no cabeçalho, no hero e no rodapé.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-3xl font-medium tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.vitrine.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-lg bg-(--site-accent) px-6 py-3 text-sm font-semibold text-(--site-accent-fg) transition-opacity hover:opacity-90";
const outline =
  "inline-flex items-center gap-2 rounded-lg border border-(--site-line) px-6 py-3 text-sm font-semibold transition-colors hover:border-(--site-accent)";

export function Hero({ view, tr, locale }: TemplateProps) {
  const eyebrow = [view.category?.replace(/_/g, " "), view.city].filter(Boolean).join(" · ");
  return (
    <section className="bg-(--site-surface)">
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <span className={`${serif} text-xl font-semibold tracking-tight`}>{view.name}</span>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 rounded-lg bg-(--site-accent) px-4 py-2 text-sm font-semibold text-(--site-accent-fg) @md:inline-flex"
        />
      </header>
      <div className={`${CONTAINER} grid gap-10 pb-16 pt-6 @5xl:grid-cols-[1.1fr_1fr] @5xl:items-center @5xl:pb-24 @5xl:pt-10`}>
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)">{eyebrow}</p>
          )}
          <h1 className={`${serif} mt-4 text-balance text-4xl font-medium leading-tight tracking-tight @3xl:text-5xl @5xl:text-6xl`}>
            {view.name}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.tagline || tr.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
            <SecondaryCta view={view} tr={tr} locale={locale} className={outline} />
          </div>
          <Rating view={view} locale={locale} className="mt-6 rounded-lg bg-(--site-bg) px-3 py-2" />
        </div>
        <Photo
          src={view.heroUrl}
          alt={heroAlt(view)}
          className="aspect-[4/3] w-full rounded-2xl object-cover @5xl:aspect-[4/5]"
        />
      </div>
    </section>
  );
}

export function Vitrine(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.vitrine.photos;
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="checks" />

      {/* Sobre: título serifado centrado, parágrafo e duas fotos (decoração fixa, alt vazio) */}
      <Section className="text-center">
        <h2 className={h2}>{tr.aboutHeading}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
        <div className="mt-10 grid grid-cols-2 gap-3 @3xl:gap-4">
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <Photo src={photos.g2} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
        </div>
      </Section>

      {(hasPlace(view) || hasHours(view)) && (
        <section className="bg-(--site-surface)">
          <Section className="grid gap-12 @3xl:grid-cols-2">
            <Visit view={view} heading={tr.visitHeading} headingClass={h2} />
            <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
          </Section>
        </section>
      )}

      {hasContact(view, false) && (
        <Section className="grid gap-10 @3xl:grid-cols-2 @3xl:items-start">
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} withPlace={false} />
          {primary && (
            <div className="rounded-2xl bg-(--site-accent) p-8 text-(--site-accent-fg)">
              <p className={`${serif} text-2xl leading-snug`}>{view.tagline || tr.tagline}</p>
              <CtaLink
                cta={primary}
                label={ctaLabel(primary, CTA, tr, locale)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-(--site-bg) px-6 py-3 text-sm font-semibold text-(--site-text)"
              />
            </div>
          )}
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
