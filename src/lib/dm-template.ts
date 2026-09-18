// Import relativo e com extensão `.ts` de propósito: os testes rodam em
// `node --experimental-strip-types`, que não lê os `paths` do tsconfig (o alias
// `@convex/*` quebraria) nem resolve import sem extensão. Ver preview-i18n.ts.
import { localeForLead, type Locale } from "./preview-i18n.ts";

/**
 * Mensagem de DM pronta para copiar (Instagram/Facebook), no idioma do lead.
 *
 * Puro, sem React: `src/components/crm/dm-composer.tsx` só monta o textarea com o
 * que sai daqui. Mesma regra de honestidade dos templates de site (ver
 * tests/site-templates-i18n.test.ts): nada de fato inventado sobre o negócio além
 * dos dados que o lead já tem (nome, categoria, avaliação/número de avaliações).
 *
 * Estrutura (referência em inglês, adaptada com naturalidade por idioma — ordem de
 * palavras, gênero de artigo e pontuação variam, o conteúdo e o tom não):
 *   "Hi {name}! I'm {signature}, a web developer. {reviewsLine}I noticed you don't
 *   have a website yet. Most people search on Google before choosing a {noun}, and
 *   a simple site helps them find you, see what you offer and know where you are.
 *
 *   I've already started putting one together for you, because I think it fits the
 *   {place} really well. Would you like to see it? If you're interested, I'll send
 *   you the preview, and if you like it I finish it with your photos and details in
 *   a few days.
 *
 *   {signature}"
 */

export interface DmLead {
  name: string;
  category?: string | null;
  city?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  countryCode: string;
}

export interface DmOptions {
  signature: string;
}

// ---------------------------------------------------------------------------
// Categoria → substantivo genérico por idioma (spec: 8 mais comuns + fallback).
// EN fica SEM artigo (o template já escreve "a {noun}" fixo — nenhum caso dos 8
// precisa de "an"); os demais idiomas embutem o artigo/gênero certo no próprio
// valor, porque o artigo indefinido varia por gênero gramatical e o template não
// tem como adivinhar o gênero de um substantivo que só se sabe em runtime.
// ---------------------------------------------------------------------------

type Concept =
  | "barber"
  | "bakery"
  | "cafe"
  | "nail_salon"
  | "hair_salon"
  | "tattoo_studio"
  | "florist"
  | "restaurant";

/**
 * Reconhece o conceito a partir de QUALQUER forma que `lead.category` assuma:
 * `primaryType` do Google Places (snake_case, "barber_shop"), termo de busca do
 * CATEGORY_OPTIONS (com espaço, "barber shop") ou nome de categoria do Foursquare
 * (texto livre, ex. "Barbershop", "Tattoo Parlor"). Substring por palavra, não
 * igualdade exata — é o que cobre as três origens com um único mapa por conceito.
 */
const CONCEPT_RULES: readonly [Concept, RegExp][] = [
  ["barber", /\bbarber/],
  ["bakery", /\bbaker/],
  ["cafe", /\bcafe\b|\bcoffee/],
  ["nail_salon", /\bnail/],
  ["hair_salon", /\bhair/],
  ["tattoo_studio", /\btattoo/],
  ["florist", /\bflorist|\bflower/],
  ["restaurant", /\brestaurant/],
];

function normalizeCategoryKey(category: string): string {
  return category
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function conceptFor(category?: string | null): Concept | null {
  if (!category) return null;
  const key = normalizeCategoryKey(category);
  for (const [concept, re] of CONCEPT_RULES) {
    if (re.test(key)) return concept;
  }
  return null;
}

type NounMap = Record<Concept, string> & { default: string };

const NOUN_BY_LOCALE: Record<Locale, NounMap> = {
  en: {
    barber: "barber",
    bakery: "bakery",
    cafe: "café",
    nail_salon: "nail salon",
    hair_salon: "hair salon",
    tattoo_studio: "tattoo studio",
    florist: "florist",
    restaurant: "restaurant",
    default: "business",
  },
  nl: {
    barber: "kapper",
    bakery: "bakkerij",
    cafe: "café",
    nail_salon: "nagelstudio",
    hair_salon: "kapsalon",
    tattoo_studio: "tattoostudio",
    florist: "bloemenwinkel",
    restaurant: "restaurant",
    default: "bedrijf",
  },
  sv: {
    barber: "en barberare",
    bakery: "ett bageri",
    cafe: "ett café",
    nail_salon: "en nagelsalong",
    hair_salon: "en frisörsalong",
    tattoo_studio: "en tatueringsstudio",
    florist: "en blomsterhandel",
    restaurant: "en restaurang",
    default: "ett företag",
  },
  no: {
    barber: "en barberer",
    bakery: "et bakeri",
    cafe: "en kafé",
    nail_salon: "en neglesalong",
    hair_salon: "en frisørsalong",
    tattoo_studio: "en tatoveringsstudio",
    florist: "en blomsterbutikk",
    restaurant: "en restaurant",
    default: "en bedrift",
  },
  es: {
    barber: "una barbería",
    bakery: "una panadería",
    cafe: "una cafetería",
    nail_salon: "un salón de uñas",
    hair_salon: "una peluquería",
    tattoo_studio: "un estudio de tatuajes",
    florist: "una floristería",
    restaurant: "un restaurante",
    default: "un negocio",
  },
  it: {
    barber: "un barbiere",
    bakery: "una panetteria",
    cafe: "un bar",
    nail_salon: "un centro unghie",
    hair_salon: "un parrucchiere",
    tattoo_studio: "uno studio di tatuaggi",
    florist: "un fioraio",
    restaurant: "un ristorante",
    default: "un'attività",
  },
  pt: {
    barber: "um barbeiro",
    bakery: "uma padaria",
    cafe: "um café",
    nail_salon: "um salão de unhas",
    hair_salon: "um cabeleireiro",
    tattoo_studio: "um estúdio de tatuagens",
    florist: "uma florista",
    restaurant: "um restaurante",
    default: "um negócio",
  },
  de: {
    barber: "einen Barbier",
    bakery: "eine Bäckerei",
    cafe: "ein Café",
    nail_salon: "ein Nagelstudio",
    hair_salon: "einen Friseursalon",
    tattoo_studio: "ein Tattoo-Studio",
    florist: "einen Blumenladen",
    restaurant: "ein Restaurant",
    default: "ein Unternehmen",
  },
  da: {
    barber: "en barber",
    bakery: "et bageri",
    cafe: "en café",
    nail_salon: "en neglesalon",
    hair_salon: "en frisørsalon",
    tattoo_studio: "et tatoveringsstudie",
    florist: "en blomsterhandel",
    restaurant: "en restaurant",
    default: "en virksomhed",
  },
  fr: {
    barber: "un barbier",
    bakery: "une boulangerie",
    cafe: "un café",
    nail_salon: "un salon de manucure",
    hair_salon: "un salon de coiffure",
    tattoo_studio: "un studio de tatouage",
    florist: "un fleuriste",
    restaurant: "un restaurant",
    default: "un commerce",
  },
};

function nounFor(locale: Locale, category?: string | null): string {
  const map = NOUN_BY_LOCALE[locale];
  const concept = conceptFor(category);
  return concept ? map[concept] : map.default;
}

// ---------------------------------------------------------------------------
// Avaliação: 1 casa decimal, separador da vírgula/ponto do idioma (mesma
// convenção europeia usada no resto do produto — só o inglês usa ponto).
// ---------------------------------------------------------------------------

const COMMA_LOCALES = new Set<Locale>(["nl", "sv", "no", "es", "it", "pt", "de", "da", "fr"]);

function formatRating(rating: number, locale: Locale): string {
  const fixed = rating.toFixed(1);
  return COMMA_LOCALES.has(locale) ? fixed.replace(".", ",") : fixed;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : (s[0] ?? "").toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Copy por idioma. `reviewsClause` é sempre uma frase NOVA (começa maiúscula,
// termina com o conector "e"/"and"/… + espaço) — some inteira quando não há
// avaliação. `noSite` é escrita em forma de CONTINUAÇÃO (minúscula): quando
// `reviewsClause` está ausente ela vira a primeira frase do parágrafo e
// `capitalize()` cuida da maiúscula. `offer` é o segundo parágrafo, fixo (não
// depende do lead) — a personalização mora só no nome, na saudação e no `noun`.
// ---------------------------------------------------------------------------

interface LocaleParts {
  greeting: (name: string, signature: string) => string;
  reviewsClause: (rating: string, reviewsCount: number) => string;
  noSite: (noun: string) => string;
  offer: string;
}

const PARTS: Record<Locale, LocaleParts> = {
  en: {
    greeting: (name, signature) => `Hi ${name}! I'm ${signature}, a web developer.`,
    reviewsClause: (rating, reviewsCount) =>
      `I saw your reviews (${rating} with ${reviewsCount} of them, impressive) and `,
    // "I" é sempre maiúsculo em inglês (regra do pronome, não de posição na frase) —
    // por isso esta é a ÚNICA entrada de `noSite` que já nasce maiúscula: o
    // `capitalize()` do caminho sem avaliação vira no-op aqui, de propósito.
    noSite: (noun) =>
      `I noticed you don't have a website yet. Most people search on Google before choosing a ${noun}, and a simple site helps them find you, see what you offer and know where you are.`,
    offer:
      "I've already started putting one together for you, because I think it fits the shop really well. Would you like to see it? If you're interested, I'll send you the preview, and if you like it I finish it with your photos and details in a few days.",
  },
  nl: {
    greeting: (name, signature) => `Hoi ${name}! Ik ben ${signature}, webontwikkelaar.`,
    reviewsClause: (rating, reviewsCount) =>
      `Ik zag je reviews (${rating} met ${reviewsCount} stuks, indrukwekkend) en `,
    noSite: (noun) =>
      `ik zag dat je nog geen website hebt. De meeste mensen zoeken op Google voordat ze een ${noun} kiezen, en een simpele site helpt ze je te vinden, te zien wat je aanbiedt en te weten waar je zit.`,
    offer:
      "Ik ben al begonnen met er een voor je te maken, want ik denk dat die goed bij de zaak past. Wil je hem zien? Als je geïnteresseerd bent, stuur ik je de preview, en als je hem mooi vindt maak ik hem in een paar dagen af met jouw foto's en gegevens.",
  },
  sv: {
    greeting: (name, signature) => `Hej ${name}! Jag heter ${signature} och är webbutvecklare.`,
    reviewsClause: (rating, reviewsCount) =>
      `Jag såg dina recensioner (${rating} med ${reviewsCount} stycken, imponerande) och `,
    noSite: (noun) =>
      `jag märkte att ni inte har en webbplats än. De flesta söker på Google innan de väljer ${noun}, och en enkel webbplats hjälper dem att hitta er, se vad ni erbjuder och veta var ni finns.`,
    offer:
      "Jag har redan börjat sätta ihop en åt er, för jag tycker den passar stället riktigt bra. Vill ni se den? Om ni är intresserade skickar jag förhandsvisningen, och om ni gillar den blir den klar med era bilder och uppgifter inom några dagar.",
  },
  no: {
    greeting: (name, signature) => `Hei ${name}! Jeg heter ${signature} og er webutvikler.`,
    reviewsClause: (rating, reviewsCount) =>
      `Jeg så anmeldelsene deres (${rating} med ${reviewsCount} stykker, imponerende) og `,
    noSite: (noun) =>
      `jeg la merke til at dere ikke har noen nettside ennå. De fleste søker på Google før de velger ${noun}, og en enkel nettside hjelper dem å finne dere, se hva dere tilbyr og vite hvor dere holder til.`,
    offer:
      "Jeg har allerede begynt å sette sammen en til dere, for jeg tror den passer stedet veldig godt. Vil dere se den? Hvis dere er interessert, sender jeg forhåndsvisningen, og hvis dere liker den, gjør jeg den ferdig med bildene og opplysningene deres om noen dager.",
  },
  es: {
    greeting: (name, signature) => `¡Hola, ${name}! Soy ${signature}, desarrollador(a) web.`,
    reviewsClause: (rating, reviewsCount) =>
      `Vi tus reseñas (${rating} con ${reviewsCount} de ellas, impresionante) y `,
    noSite: (noun) =>
      `noté que todavía no tienes una página web. La mayoría de la gente busca en Google antes de elegir ${noun}, y una web sencilla les ayuda a encontrarte, ver lo que ofreces y saber dónde estás.`,
    offer:
      "Ya empecé a preparar una para ti, porque creo que le queda muy bien al negocio. ¿Quieres verla? Si te interesa, te mando la vista previa, y si te gusta la termino con tus fotos y datos en pocos días.",
  },
  it: {
    greeting: (name, signature) => `Ciao ${name}! Sono ${signature}, sviluppatore/sviluppatrice web.`,
    reviewsClause: (rating, reviewsCount) =>
      `Ho visto le tue recensioni (${rating} con ${reviewsCount} di esse, impressionante) e `,
    noSite: (noun) =>
      `ho notato che non hai ancora un sito web. La maggior parte delle persone cerca su Google prima di scegliere ${noun}, e un sito semplice le aiuta a trovarti, vedere cosa offri e sapere dove ti trovi.`,
    offer:
      "Ho già iniziato a prepararne uno per te, perché penso che si adatti benissimo all'attività. Vuoi vederlo? Se ti interessa, ti mando l'anteprima, e se ti piace lo completo con le tue foto e i tuoi dati in pochi giorni.",
  },
  pt: {
    greeting: (name, signature) => `Olá, ${name}! Sou ${signature}, programador(a) de sites.`,
    reviewsClause: (rating, reviewsCount) =>
      `Vi as suas avaliações (${rating} com ${reviewsCount} delas, impressionante) e `,
    noSite: (noun) =>
      `reparei que ainda não tem um site. A maioria das pessoas procura no Google antes de escolher ${noun}, e um site simples ajuda a encontrá-lo, a ver o que oferece e a saber onde fica.`,
    offer:
      "Já comecei a preparar um para si, porque acho que fica mesmo bem para o negócio. Quer ver? Se tiver interesse, envio-lhe a pré-visualização, e se gostar termino com as suas fotos e dados em poucos dias.",
  },
  de: {
    greeting: (name, signature) => `Hallo ${name}! Ich bin ${signature}, Webentwickler(in).`,
    reviewsClause: (rating, reviewsCount) =>
      `Ich habe Ihre Bewertungen gesehen (${rating} mit ${reviewsCount} davon, beeindruckend) und `,
    noSite: (noun) =>
      `mir ist aufgefallen, dass Sie noch keine Website haben. Die meisten Menschen suchen bei Google, bevor sie ${noun} wählen, und eine einfache Website hilft ihnen, Sie zu finden, zu sehen, was Sie anbieten, und zu wissen, wo Sie sind.`,
    offer:
      "Ich habe schon angefangen, eine für Sie zusammenzustellen, weil ich finde, dass sie gut zum Geschäft passt. Möchten Sie sie sehen? Bei Interesse schicke ich Ihnen die Vorschau, und wenn sie Ihnen gefällt, stelle ich sie in ein paar Tagen mit Ihren Fotos und Angaben fertig.",
  },
  da: {
    greeting: (name, signature) => `Hej ${name}! Jeg hedder ${signature} og er webudvikler.`,
    reviewsClause: (rating, reviewsCount) =>
      `Jeg så jeres anmeldelser (${rating} med ${reviewsCount} af dem, imponerende) og `,
    noSite: (noun) =>
      `jeg lagde mærke til, at I ikke har en hjemmeside endnu. De fleste søger på Google, før de vælger ${noun}, og en simpel hjemmeside hjælper dem med at finde jer, se hvad I tilbyder, og vide hvor I ligger.`,
    offer:
      "Jeg er allerede i gang med at lave en til jer, for jeg synes, den passer rigtig godt til stedet. Vil I se den? Hvis I er interesserede, sender jeg jer previewet, og hvis I kan lide det, gør jeg det færdigt med jeres billeder og oplysninger om nogle dage.",
  },
  fr: {
    greeting: (name, signature) => `Bonjour ${name} ! Je suis ${signature}, développeur(se) web.`,
    reviewsClause: (rating, reviewsCount) =>
      `J'ai vu vos avis (${rating} avec ${reviewsCount} d'entre eux, impressionnant) et `,
    noSite: (noun) =>
      `j'ai remarqué que vous n'avez pas encore de site web. La plupart des gens cherchent sur Google avant de choisir ${noun}, et un site simple les aide à vous trouver, voir ce que vous proposez et savoir où vous êtes.`,
    offer:
      "J'ai déjà commencé à en préparer un pour vous, car je pense qu'il correspond vraiment bien à l'établissement. Voulez-vous le voir ? Si cela vous intéresse, je vous envoie l'aperçu, et si vous l'aimez, je le termine avec vos photos et vos informations en quelques jours.",
  },
};

/**
 * Mensagem de DM pronta, no idioma do lead (`localeForLead`). Honestidade: nada
 * afirmado além do nome, categoria e avaliação/número de avaliações — os únicos
 * dados que entram no texto. `rating`/`reviewsCount` só aparecem juntos (a linha
 * de avaliações some quando falta qualquer um dos dois).
 */
export function dmMessage(lead: DmLead, opts: DmOptions): string {
  const locale = localeForLead(lead.countryCode, lead.city);
  const parts = PARTS[locale];
  const signature = opts.signature;
  const noun = nounFor(locale, lead.category);

  const hasReviews =
    typeof lead.rating === "number" && typeof lead.reviewsCount === "number" && lead.reviewsCount > 0;
  const reviewsClause = hasReviews
    ? parts.reviewsClause(formatRating(lead.rating as number, locale), lead.reviewsCount as number)
    : "";
  const noSite = hasReviews ? parts.noSite(noun) : capitalize(parts.noSite(noun));

  const para1 = `${parts.greeting(lead.name, signature)} ${reviewsClause}${noSite}`;
  return `${para1}\n\n${parts.offer}\n\n${signature}`;
}
