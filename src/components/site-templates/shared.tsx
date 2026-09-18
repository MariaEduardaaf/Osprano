import type { CSSProperties, ReactNode } from "react";
import {
  MdCall,
  MdCheckCircleOutline,
  MdOutlineChat,
  MdOutlineMail,
  MdOutlinePlace,
  MdStar,
  MdStarBorder,
} from "react-icons/md";
import { FaInstagram } from "react-icons/fa6";
import {
  ctaOptions,
  mapEmbedUrl,
  type SiteContent,
  type SiteCta,
  type SiteHours,
  type SiteItem,
  type Weekday,
} from "@convex/lib/site";
import { DICTS, type Locale, type TemplateBlurb, type TemplateDict } from "@/lib/preview-i18n";
import { footerPalette, type Palette } from "./palettes";
import type { CtaKey } from "./catalog";

/**
 * O que o modelo recebe (spec 1.4): o conteúdo salvo mais as URLs já resolvidas
 * pela página. `heroUrl` é o upload ou a foto padrão do modelo; `galleryUrls` são
 * SÓ uploads (vazio: a galeria não renderiza). Quem monta é a página, nunca o
 * modelo (`buildSiteView` em index.tsx).
 */
export type SiteView = SiteContent & { heroUrl: string; galleryUrls: string[] };

export interface TemplateProps {
  view: SiteView;
  palette: Palette;
  tr: TemplateDict;
  locale: Locale;
}

/** Largura de leitura comum aos quatro modelos. Sem unidade de viewport, de propósito. */
export const CONTAINER = "mx-auto w-full max-w-[1120px] px-6";

/** Paleta como custom properties no raiz; `--site-line` (divisórias) deriva do texto. */
export function paletteStyle(p: Palette): CSSProperties {
  return {
    "--site-bg": p.bg,
    "--site-surface": p.surface,
    "--site-text": p.text,
    "--site-muted": p.muted,
    "--site-accent": p.accent,
    "--site-accent-fg": p.accentFg,
    "--site-line": "color-mix(in srgb, var(--site-text) 14%, transparent)",
  } as CSSProperties;
}

/**
 * Raiz de todo modelo. `lang` declara o idioma real do prospect (o documento é
 * pt-BR). `@container` (Tailwind v4) faz `@md:`/`@3xl:`/`@5xl:` seguirem a largura
 * DESTE div, não da janela: a prévia ao vivo do editor e a miniatura renderizam o
 * site num contêiner menor que a viewport (spec, Decisões). `flex-1` deixa a
 * página pública esticar o site até o fim da janela sem o modelo usar `dvh`.
 */
export function SiteRoot({
  palette,
  locale,
  children,
}: {
  palette: Palette;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div
      lang={locale}
      style={paletteStyle(palette)}
      className="@container flex flex-1 flex-col bg-(--site-bg) text-(--site-text) antialiased [font-family:var(--font-geist-sans)]"
    >
      {children}
    </div>
  );
}

/** Respiro de página (adendo 2026-09-18): cada seção com padding vertical maior. */
export const SECTION_PAD = "py-16 @md:py-24";

export function Section({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`${CONTAINER} ${SECTION_PAD} ${className}`}>{children}</section>;
}

/**
 * `<img>` e não `next/image`: as fotos vêm do storage do Convex (*.convex.cloud,
 * host que muda por deployment e exigiria `remotePatterns`) e de /public; não há
 * ganho de otimização que pague isso aqui (spec 1.4). Sem `decoding="async"`:
 * o Chrome headless das capturas não conclui a decodificação sob virtual time
 * e a foto sai em branco. `lazy` só na galeria (uploads, podem ser seis).
 */
export function Photo({
  src,
  alt,
  className,
  lazy = false,
}: {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading={lazy ? "lazy" : undefined} />
  );
}

/** alt da foto principal: só o upload dela leva o nome do negócio; a padrão é decoração (spec 4). */
export function heroAlt(view: SiteView): string {
  return view.heroImage ? view.name : "";
}

export const hasItems = (view: SiteView): boolean => (view.items?.length ?? 0) > 0;
export const hasHours = (view: SiteView): boolean => (view.hours?.length ?? 0) > 0;
export const hasGallery = (view: SiteView): boolean => view.galleryUrls.length > 0;
export const hasPlace = (view: SiteView): boolean => !!(view.address || view.city);

/** Rótulo do CTA (spec 1.6): `callNow` mora no topo do dicionário, os outros no modelo; e-mail é sempre `email`. */
export function ctaLabel(cta: SiteCta, ctaKey: CtaKey, tr: TemplateDict, locale: Locale): string {
  if (cta.kind === "email") return tr.email;
  return ctaKey === "callNow" ? DICTS[locale].callNow : tr[ctaKey];
}

function CtaIcon({ kind, size = 18 }: { kind: SiteCta["kind"]; size?: number }) {
  if (kind === "whatsapp") return <MdOutlineChat size={size} aria-hidden />;
  if (kind === "email") return <MdOutlineMail size={size} aria-hidden />;
  return <MdCall size={size} aria-hidden />;
}

export function CtaLink({ cta, label, className }: { cta: SiteCta; label: string; className: string }) {
  const external = cta.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a href={cta.href} className={className} {...external}>
      <CtaIcon kind={cta.kind} />
      {label}
    </a>
  );
}

/** CTA primário (spec 1.6). Sem canal preenchido devolve null: nunca um botão que não leva a nada. */
export function PrimaryCta({
  view,
  tr,
  locale,
  ctaKey,
  className,
}: {
  view: SiteView;
  tr: TemplateDict;
  locale: Locale;
  ctaKey: CtaKey;
  className: string;
}) {
  const cta = ctaOptions(view)[0];
  if (!cta) return null;
  return <CtaLink cta={cta} label={ctaLabel(cta, ctaKey, tr, locale)} className={className} />;
}

/** Segundo canal, ao lado do primário (agendar + telefone, como nas referências). Telefone mostra o próprio número. */
export function SecondaryCta({
  view,
  tr,
  locale,
  className,
}: {
  view: SiteView;
  tr: TemplateDict;
  locale: Locale;
  className: string;
}) {
  const cta = ctaOptions(view)[1];
  if (!cta) return null;
  return <CtaLink cta={cta} label={contactLabel(cta, view, tr, locale)} className={className} />;
}

/** Rótulo "de contato" de um canal: o próprio número, "WhatsApp" ou o e-mail (faixas e CTA secundário). */
export function contactLabel(cta: SiteCta, view: SiteView, tr: TemplateDict, locale: Locale): string {
  if (cta.kind === "phone") return view.phone ?? DICTS[locale].call;
  if (cta.kind === "whatsapp") return DICTS[locale].whatsapp;
  return view.email ?? tr.email;
}

/** "4.7" ou "4,7" conforme o idioma do prospect; uma casa decimal, como o Google mostra. */
export function formatRating(rating: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}

function Stars({ rating, size }: { rating: number; size: number }) {
  const full = Math.round(rating);
  return (
    <>
      {Array.from({ length: 5 }, (_, i) =>
        i < full ? <MdStar key={i} size={size} /> : <MdStarBorder key={i} size={size} />,
      )}
    </>
  );
}

/** Nota e avaliações: só dado do lead, nunca do dicionário. */
export function Rating({
  view,
  locale,
  className = "",
  onDark = false,
}: {
  view: SiteView;
  locale: Locale;
  className?: string;
  onDark?: boolean; // dentro de um hero escuro com véu (estúdio): o secundário fica branco translúcido
}) {
  if (view.rating == null) return null;
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="inline-flex text-(--site-accent)" aria-hidden>
        <Stars rating={view.rating} size={16} />
      </span>
      <span className="font-semibold tabular-nums">{formatRating(view.rating, locale)}</span>
      {view.reviewsCount != null && (
        <span className={onDark ? "text-white/70" : "text-(--site-muted)"}>
          {view.reviewsCount} {DICTS[locale].reviews}
        </span>
      )}
    </div>
  );
}

/**
 * Faixa de avaliação (adendo 2026-09-18): a nota em tamanho grande, as estrelas e
 * "N avaliações", só com `rating` do lead. `accent` inverte para a cor de
 * destaque (par accent/accentFg, testado); `surface` fica entre duas linhas.
 */
export function RatingBand({
  view,
  locale,
  tone = "surface",
  numberClass = "",
  className = "",
}: {
  view: SiteView;
  locale: Locale;
  tone?: "surface" | "accent";
  numberClass?: string;
  className?: string;
}) {
  if (view.rating == null) return null;
  const onAccent = tone === "accent";
  return (
    <section
      className={`${
        onAccent ? "bg-(--site-accent) text-(--site-accent-fg)" : "border-y border-(--site-line) bg-(--site-surface)"
      } ${className}`}
    >
      <div className={`${CONTAINER} flex flex-col items-center gap-5 py-16 text-center @md:py-20`}>
        <span className={`text-7xl font-semibold leading-none tabular-nums @3xl:text-8xl ${numberClass}`}>
          {formatRating(view.rating, locale)}
        </span>
        <span className={`inline-flex gap-1 ${onAccent ? "" : "text-(--site-accent)"}`} aria-hidden>
          <Stars rating={view.rating} size={28} />
        </span>
        {view.reviewsCount != null && (
          <span className={`text-sm uppercase tracking-[0.2em] ${onAccent ? "opacity-80" : "text-(--site-muted)"}`}>
            {view.reviewsCount} {DICTS[locale].reviews}
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * Lista de itens (cardápio / serviços / destaques). Nome, preço e nota saem SÓ de
 * `items` (o `view.items` salvo): o dicionário não fornece valor aqui.
 */
export function Items({
  items,
  heading,
  headingClass,
  variant,
}: {
  items: SiteItem[] | undefined;
  heading: string;
  headingClass: string;
  variant: "lines" | "cards" | "checks";
}) {
  if (!items || items.length === 0) return null;
  const grid =
    variant === "lines"
      ? "grid gap-x-12 gap-y-4 @3xl:grid-cols-2"
      : "grid gap-4 @md:grid-cols-2 @5xl:grid-cols-3";
  return (
    <Section>
      <h2 className={headingClass}>{heading}</h2>
      <ul className={`mt-8 ${grid}`}>
        {items.map((it, i) => (
          <li
            key={`${it.name}-${i}`}
            className={
              variant === "lines"
                ? "border-b border-(--site-line) pb-4"
                : variant === "cards"
                  ? "rounded-xl bg-(--site-surface) p-5"
                  : "flex gap-3"
            }
          >
            {variant === "checks" && (
              <MdCheckCircleOutline size={22} className="mt-0.5 shrink-0 text-(--site-accent)" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{it.name}</span>
                {it.price && <span className="shrink-0 tabular-nums text-(--site-muted)">{it.price}</span>}
              </div>
              {it.note && <p className="mt-1 text-sm leading-relaxed text-(--site-muted)">{it.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const dayNameCache = new Map<Locale, string[]>();

/** Nome curto do dia via Intl: nenhuma string nova no dicionário (spec 1.5). Índice 0 = domingo. */
export function weekdayNames(locale: Locale): string[] {
  let names = dayNameCache.get(locale);
  if (!names) {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    // 2024-01-07 é um domingo em UTC; os seis dias seguintes vão de segunda a sábado.
    names = Array.from({ length: 7 }, (_, d) => fmt.format(new Date(Date.UTC(2024, 0, 7 + d))));
    dayNameCache.set(locale, names);
  }
  return names;
}

/**
 * Horário: renderiza só quando `hours` (o `view.hours` salvo) tem linha. Dia sem
 * linha sai como `closed`. Os valores das faixas vêm só do dado.
 */
export function Hours({
  hours,
  heading,
  closed,
  locale,
  headingClass,
}: {
  hours: SiteHours[] | undefined;
  heading: string;
  closed: string;
  locale: Locale;
  headingClass: string;
}) {
  if (!hours || hours.length === 0) return null;
  const names = weekdayNames(locale);
  const byDay = new Map(hours.map((h) => [h.day, h]));
  return (
    <div>
      <h2 className={headingClass}>{heading}</h2>
      <dl className="mt-6 divide-y divide-(--site-line) border-y border-(--site-line)">
        {DAY_ORDER.map((d) => {
          const h = byDay.get(d);
          return (
            <div key={d} className="flex justify-between gap-6 py-3 text-sm">
              <dt className="capitalize text-(--site-muted)">{names[d]}</dt>
              <dd className="tabular-nums">{h ? `${h.open} - ${h.close}` : closed}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Onde estamos: só endereço e cidade, só quando existem. */
export function Visit({ view, heading, headingClass }: { view: SiteView; heading: string; headingClass: string }) {
  if (!hasPlace(view)) return null;
  return (
    <div>
      <h2 className={headingClass}>{heading}</h2>
      <p className="mt-6 flex items-start gap-3 text-lg leading-relaxed">
        <MdOutlinePlace size={22} className="mt-1 shrink-0 text-(--site-accent)" aria-hidden />
        <span>
          {view.address && <span className="block">{view.address}</span>}
          {view.city && <span className="block text-(--site-muted)">{view.city}</span>}
        </span>
      </p>
    </div>
  );
}

interface ContactRow {
  key: string;
  icon: ReactNode;
  value: string;
  href?: string;
  external?: boolean;
}

/**
 * Uma linha por canal preenchido (telefone, WhatsApp, e-mail, Instagram). O
 * endereço não entra: o rodapé o mostra na própria coluna. Sem canal, vazio
 * (spec 4: nenhum bloco de contato sem dado).
 */
function contactRows(view: SiteView): ContactRow[] {
  const rows: ContactRow[] = [];
  if (view.phone) {
    rows.push({
      key: "phone",
      icon: <MdCall size={20} aria-hidden />,
      value: view.phone,
      href: `tel:${view.phone.replace(/\s+/g, "")}`,
    });
  }
  if (view.whatsapp) {
    rows.push({
      key: "whatsapp",
      icon: <MdOutlineChat size={20} aria-hidden />,
      value: `+${view.whatsapp}`,
      href: `https://wa.me/${view.whatsapp}`,
      external: true,
    });
  }
  if (view.email) {
    rows.push({ key: "email", icon: <MdOutlineMail size={20} aria-hidden />, value: view.email, href: `mailto:${view.email}` });
  }
  if (view.instagram) {
    rows.push({
      key: "instagram",
      icon: <FaInstagram size={19} aria-hidden />,
      value: `@${view.instagram}`,
      href: `https://instagram.com/${view.instagram}`,
      external: true,
    });
  }
  return rows;
}

function ContactList({ rows, iconClass }: { rows: ContactRow[]; iconClass: string }) {
  return (
    <ul className="mt-6 space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-3 text-base">
          <span className={iconClass}>{r.icon}</span>
          {r.href ? (
            <a
              href={r.href}
              className="underline decoration-(--site-line) underline-offset-4 hover:decoration-(--site-accent)"
              {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {r.value}
            </a>
          ) : (
            <span>{r.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Galeria: SÓ uploads dela (spec 1.4). Vazia, não renderiza. alt="" sempre. */
export function Gallery({ urls, heading, headingClass }: { urls: string[]; heading: string; headingClass: string }) {
  if (urls.length === 0) return null;
  return (
    <Section>
      <h2 className={headingClass}>{heading}</h2>
      <div className="mt-8 grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        {urls.map((u) => (
          <Photo key={u} src={u} alt="" lazy className="aspect-[4/3] w-full rounded-lg object-cover" />
        ))}
      </div>
    </Section>
  );
}

/**
 * Valores (adendo 2026-09-18): três cartões GENÉRICOS do dicionário, sobre postura
 * (atenção, acolhimento, clareza), nunca sobre o produto. `lines` é uma régua
 * fina acima de cada coluna (mesa), `cards` usa `surface`, `icons` põe um
 * ícone de destaque em cima (ofício).
 */
export function Values({
  values,
  heading,
  headingClass,
  titleClass = "text-xl font-semibold",
  variant,
  className = "",
}: {
  values: readonly TemplateBlurb[];
  heading: string;
  headingClass: string;
  titleClass?: string;
  variant: "lines" | "cards" | "icons";
  className?: string;
}) {
  const item =
    variant === "lines"
      ? "border-t border-(--site-line) pt-6"
      : variant === "cards"
        ? "rounded-2xl bg-(--site-surface) p-7 @3xl:p-8"
        : "";
  return (
    <Section className={className}>
      <h2 className={headingClass}>{heading}</h2>
      <ul className="mt-10 grid gap-8 @3xl:grid-cols-3 @3xl:gap-10">
        {values.map((v) => (
          <li key={v.title} className={item}>
            {variant === "icons" && (
              <MdCheckCircleOutline size={30} className="mb-4 text-(--site-accent)" aria-hidden />
            )}
            <h3 className={titleClass}>{v.title}</h3>
            <p className="mt-3 leading-relaxed text-(--site-muted)">{v.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * Como funciona (adendo 2026-09-18): três passos genéricos numerados (contacto,
 * combinar dia e hora, aproveitar). `intro` é o parágrafo "sobre" quando o
 * modelo junta as duas coisas (ofício: "como trabalhamos"). O numeral visível é
 * decoração: a `<ol>` já numera para o leitor de tela.
 */
export function Steps({
  steps,
  heading,
  headingClass,
  titleClass = "text-xl font-semibold",
  numberClass = "text-sm font-semibold tabular-nums text-(--site-accent)",
  intro,
  className = "",
}: {
  steps: readonly TemplateBlurb[];
  heading: string;
  headingClass: string;
  titleClass?: string;
  numberClass?: string;
  intro?: string;
  className?: string;
}) {
  return (
    <Section className={className}>
      <h2 className={headingClass}>{heading}</h2>
      {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-(--site-muted)">{intro}</p>}
      <ol className="mt-10 grid gap-8 @3xl:grid-cols-3 @3xl:gap-10">
        {steps.map((st, i) => (
          <li key={st.title} className="border-t border-(--site-line) pt-6">
            <span className={`block ${numberClass}`} aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className={`mt-4 ${titleClass}`}>{st.title}</h3>
            <p className="mt-3 leading-relaxed text-(--site-muted)">{st.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/**
 * Mapa (adendo 2026-09-18): Google Maps embutido sem chave, só com `address`
 * (cidade sozinha viraria um mapa da cidade inteira). `loading="lazy"` porque
 * fica no fim da página; `title` localizado para o leitor de tela.
 */
export function MapEmbed({ view, tr, className = "" }: { view: SiteView; tr: TemplateDict; className?: string }) {
  const src = mapEmbedUrl(view.address, view.city);
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={tr.mapTitle}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`block h-[320px] w-full border-0 @3xl:h-[440px] ${className}`}
    />
  );
}

/**
 * Botão do rodapé: o par text/bg da paleta do rodapé (sempre com contraste),
 * NÃO o accent. Em `vitrine.areia` o accent é quase igual ao fundo invertido e
 * o botão sumia; em `oficio.azul`/`verde` ficava baço. Os modelos acrescentam
 * só a forma (raio, caixa alta).
 */
export const FOOTER_CTA =
  "inline-flex items-center gap-2 bg-(--site-text) px-6 py-3 text-sm font-semibold text-(--site-bg) transition-opacity hover:opacity-90";

/**
 * Rodapé completo (adendo 2026-09-18), no lugar da linha mínima: marca (nome +
 * slogan) e CTA primário, contato (só canais preenchidos), endereço e horário
 * (só com dado), e a linha final com o nome. Sem crédito da Osprano
 * (white-label). A paleta é a de `footerPalette`: invertida em site claro, em
 * `surface` em site escuro, reaplicada como custom properties para os blocos
 * partilhados (Hours, lista de contato) herdarem as cores certas. `ctaClass`
 * deve pintar o botão com `--site-text`/`--site-bg` (ver FOOTER_CTA).
 */
export function BigFooter({
  view,
  tr,
  locale,
  palette,
  ctaKey,
  nameClass = "text-2xl font-semibold tracking-tight",
  headingClass = "text-xs font-semibold uppercase tracking-[0.2em] text-(--site-muted)",
  ctaClass = `${FOOTER_CTA} rounded-full`,
}: {
  view: SiteView;
  tr: TemplateDict;
  locale: Locale;
  palette: Palette;
  ctaKey: CtaKey;
  nameClass?: string;
  headingClass?: string;
  ctaClass?: string;
}) {
  const rows = contactRows(view);
  const place = hasPlace(view);
  const hours = hasHours(view);
  return (
    <footer style={paletteStyle(footerPalette(palette))} className="mt-auto bg-(--site-bg) text-(--site-text)">
      <div className={`${CONTAINER} grid gap-12 py-16 @3xl:grid-cols-2 @3xl:py-20 @5xl:grid-cols-[1.5fr_1fr_1fr]`}>
        <div className="@3xl:col-span-2 @5xl:col-span-1">
          <p className={nameClass}>{view.name}</p>
          <p className="mt-3 max-w-sm leading-relaxed text-(--site-muted)">{view.tagline || tr.tagline}</p>
          <PrimaryCta view={view} tr={tr} locale={locale} ctaKey={ctaKey} className={`mt-8 ${ctaClass}`} />
        </div>
        {rows.length > 0 && (
          <div>
            <h2 className={headingClass}>{tr.contactHeading}</h2>
            <ContactList rows={rows} iconClass="text-(--site-muted)" />
          </div>
        )}
        {(place || hours) && (
          <div>
            {place && (
              <>
                <h2 className={headingClass}>{tr.visitHeading}</h2>
                <p className="mt-6 leading-relaxed">
                  {view.address && <span className="block">{view.address}</span>}
                  {view.city && <span className="block text-(--site-muted)">{view.city}</span>}
                </p>
              </>
            )}
            {hours && (
              <div className={place ? "mt-8" : ""}>
                <Hours
                  hours={view.hours}
                  heading={tr.hoursHeading}
                  closed={tr.closed}
                  locale={locale}
                  headingClass={headingClass}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-(--site-line)">
        <div
          className={`${CONTAINER} flex flex-col gap-2 py-6 text-[11px] uppercase tracking-[0.22em] text-(--site-muted) @md:flex-row @md:items-center @md:justify-between`}
        >
          <span>{view.name}</span>
          {view.city && <span>{view.city}</span>}
        </div>
      </div>
    </footer>
  );
}
