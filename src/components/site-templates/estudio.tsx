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
  contactLabel,
  hasContact,
  hasHours,
  heroAlt,
  type TemplateProps,
} from "./shared";
import { TEMPLATES } from "./catalog";
import { ctaOptions } from "@convex/lib/site";

/**
 * Estúdio: barbearia, salão, spa, tatuagem, academia. Composição inspirada em
 * Barber & Co: hero em foto cheia com véu escuro, nome em caixa alta bold
 * (Bricolage Grotesque), dois CTAs lado a lado (agendar + telefone), bloco de
 * posicionamento com foto ao lado, serviços em cartões, faixa de agendamento.
 * Sem CTA fixo ao rolar: `fixed`/`sticky` dependem da viewport (spec, Decisões).
 */
const display = "[font-family:var(--font-bricolage)]";
const h2 = `${display} text-3xl font-bold uppercase tracking-tight @3xl:text-4xl`;
const CTA = TEMPLATES.estudio.ctaKey;
const solid =
  "inline-flex items-center gap-2 rounded-full bg-(--site-accent) px-6 py-3 text-sm font-bold uppercase tracking-wider text-(--site-accent-fg) transition-opacity hover:opacity-90";

export function Hero({ view, tr, locale }: TemplateProps) {
  return (
    <section className="relative isolate flex min-h-[640px] flex-col text-white @5xl:min-h-[760px]">
      <Photo src={view.heroUrl} alt={heroAlt(view)} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.35)_40%,rgba(0,0,0,0.8))]"
        aria-hidden
      />
      <header className={`${CONTAINER} flex items-center justify-between gap-6 py-5`}>
        <span className={`${display} text-lg font-bold uppercase tracking-[0.18em]`}>{view.name}</span>
        <PrimaryCta
          view={view}
          tr={tr}
          locale={locale}
          ctaKey={CTA}
          className="hidden items-center gap-2 rounded-full bg-(--site-accent) px-4 py-2 text-xs font-bold uppercase tracking-wider text-(--site-accent-fg) @md:inline-flex"
        />
      </header>
      <div className={`${CONTAINER} flex flex-1 flex-col items-center justify-center py-16 text-center`}>
        <h1
          className={`${display} max-w-4xl text-balance text-5xl font-extrabold uppercase leading-[0.95] tracking-tight @3xl:text-7xl @5xl:text-8xl`}
        >
          {view.name}
        </h1>
        <p className="mt-6 max-w-xl text-sm uppercase tracking-[0.2em] text-white/80 @3xl:text-base">
          {view.tagline || tr.tagline}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={CTA} className={solid} />
          <SecondaryCta
            view={view}
            tr={tr}
            locale={locale}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
          />
        </div>
        <Rating view={view} locale={locale} className="mt-6" onDark />
      </div>
    </section>
  );
}

export function Estudio(props: TemplateProps) {
  const { view, palette, tr, locale } = props;
  const photos = TEMPLATES.estudio.photos;
  const primary = ctaOptions(view)[0];
  return (
    <SiteRoot palette={palette} locale={locale}>
      <Hero {...props} />

      {/* Posicionamento: texto + foto de apoio (decoração fixa, alt vazio) */}
      <Section className="grid items-center gap-10 @3xl:grid-cols-2 @3xl:gap-16">
        <div>
          <h2 className={h2}>{tr.aboutHeading}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-(--site-muted)">{view.about || tr.about}</p>
        </div>
        <Photo src={photos.g1} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover" />
      </Section>

      <Items items={view.items} heading={tr.itemsHeading} headingClass={h2} variant="cards" />

      <Gallery urls={view.galleryUrls} heading={tr.galleryHeading} headingClass={h2} />

      {/* Agendar: só com canal preenchido, senão a faixa não existe */}
      {primary && (
        <section className="bg-(--site-accent) text-(--site-accent-fg)">
          <div className={`${CONTAINER} flex flex-col items-start gap-6 py-14 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:py-16`}>
            <h2 className={`${display} text-3xl font-bold uppercase tracking-tight @3xl:text-4xl`}>{tr.book}</h2>
            <CtaLink
              cta={primary}
              label={contactLabel(primary, view, tr, locale)}
              className="inline-flex items-center gap-2 rounded-full bg-(--site-bg) px-6 py-3 text-sm font-bold tracking-wide text-(--site-text)"
            />
          </div>
        </section>
      )}

      {(hasHours(view) || hasContact(view)) && (
        <Section className="grid gap-12 @3xl:grid-cols-[1fr_1fr_1.2fr] @3xl:items-start">
          <Hours hours={view.hours} heading={tr.hoursHeading} closed={tr.closed} locale={locale} headingClass={h2} />
          <Contact view={view} heading={tr.contactHeading} headingClass={h2} />
          <Photo src={photos.g2} alt="" className="hidden aspect-[4/3] w-full rounded-2xl object-cover @3xl:block" />
        </Section>
      )}

      <Footer name={view.name} />
    </SiteRoot>
  );
}
