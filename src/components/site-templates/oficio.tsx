import { MdOutlinePlace } from "react-icons/md";
import {
  CONTAINER,
  Contact,
  CtaLink,
  Footer,
  Gallery,
  Hours,
  Items,
  Photo,
  PrimaryCta,
  Rating,
  SecondaryCta,
  Section,
  SiteRoot,
  ctaLabel,
  hasContact,
  hasHours,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Ofício: encanador, eletricista, chaveiro, mecânica, fotógrafo. Composição
 * inspirada em Kohr Construction: CTA de orçamento sempre visível no cabeçalho,
 * hero dividido (texto objetivo à esquerda, foto grande do trabalho à direita),
 * serviços com ícone, "como trabalhamos" com fotos de apoio, área atendida que
 * só nomeia a cidade, galeria "nosso trabalho" (só uploads dela), faixa de
 * orçamento. Serifada (Fraunces) nos títulos.
 */
const serif = "[font-family:var(--font-fraunces)]";
const h2 = `${serif} text-3xl font-medium tracking-tight @3xl:text-4xl`;
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
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="checks" />

      {/* Como trabalhamos: foto | texto | foto (decoração fixa, alt vazio) */}
      <section className="bg-(--site-surface)">
        <Section className="grid items-center gap-8 @5xl:grid-cols-[1fr_1.2fr_1fr] @5xl:gap-12">
          <Photo src={photos.g1} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <div className="text-center">
            <h2 className={h2}>{tr.aboutHeading}</h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
          </div>
          <Photo src={photos.g2} alt="" className="hidden aspect-[4/3] w-full rounded-lg object-cover @5xl:block" />
        </Section>
      </section>

      {/* Área atendida: só com cidade, e só a cidade (nunca "atendemos a região") */}
      {view.city && (
        <Section className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)">{tr.areaHeading}</h2>
            <p className={`${serif} mt-3 flex items-center gap-3 text-3xl @3xl:text-4xl`}>
              <MdOutlinePlace size={30} className="shrink-0 text-(--site-accent)" aria-hidden />
              {tr.inCity(view.city)}
            </p>
          </div>
          {view.address && <p className="text-(--site-muted)">{view.address}</p>}
        </Section>
      )}

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      {/* Pedir orçamento: só com canal preenchido */}
      {primary && (
        <section className="border-y border-(--site-line)">
          <div className={`${CONTAINER} flex flex-col items-start gap-6 py-14 @3xl:flex-row @3xl:items-center @3xl:justify-between`}>
            <h2 className={h2}>{tr.quoteHeading}</h2>
            <CtaLink cta={primary} label={ctaLabel(primary, CTA, tr, locale)} className={solid} />
          </div>
        </section>
      )}

      {/* Com cidade, o endereço já apareceu em "área atendida": o contato não repete */}
      {(hasContact(view, !view.city) || hasHours(view)) && (
        <Section className="grid gap-12 @3xl:grid-cols-2">
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} withPlace={!view.city} />
          <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
