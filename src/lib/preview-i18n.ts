// Import relativo e com extensão `.ts` de propósito: os testes rodam em
// `node --experimental-strip-types`, que não lê os `paths` do tsconfig (o alias
// `@convex/*` quebraria) nem resolve import sem extensão.
import { swissLanguage } from "../../convex/lib/domain.ts";
import type { TemplateId } from "../../convex/lib/site.ts";

export type Locale = "en" | "nl" | "sv" | "no" | "es" | "it" | "pt" | "de" | "da" | "fr";

/**
 * Idioma da prévia por mercado. Precisa cobrir TODOS os SEARCHABLE_MARKETS
 * (convex/lib/domain.ts) e ficar em paridade com LANG (convex/lib/outreachAi.ts)
 * e FOOTER_COPY (convex/lib/compliance.ts): o prospect que recebe script de
 * ligação e email no idioma dele não pode abrir a prévia em inglês.
 */
const LOCALE_BY_COUNTRY: Record<string, Locale> = {
  GB: "en",
  IE: "en",
  NL: "nl",
  SE: "sv",
  NO: "no",
  // Mercados opt-in (OPTIN-01/03).
  ES: "es",
  IT: "it",
  PT: "pt", // português europeu
  DE: "de",
  CH: "de", // só o país: a Suíça é multilíngue, ver localeForLead
  DK: "da",
};

/**
 * Idioma derivado APENAS do país. Correto para todo mercado monolíngue, mas na
 * Suíça devolve sempre alemão — use `localeForLead`, que é a fonte de verdade
 * quando a cidade do lead está disponível. Exportado porque é a base do mapa
 * país→idioma e das invariantes de paridade dos dicionários.
 */
export function localeForCountry(countryCode: string): Locale {
  return LOCALE_BY_COUNTRY[countryCode.toUpperCase()] ?? "en";
}

/**
 * Idioma da prévia para um lead concreto. A Suíça é o único mercado multilíngue
 * da base: lá o idioma sai da cidade (Genebra → francês, Lugano → italiano,
 * desconhecida → alemão, ver `swissLanguage`). Todos os outros países ignoram a
 * cidade e continuam derivando só do countryCode.
 */
export function localeForLead(countryCode: string, city?: string | null): Locale {
  const cc = countryCode.toUpperCase();
  if (cc === "CH") return swissLanguage(city); // "de" | "fr" | "it" — todos Locale
  return localeForCountry(cc);
}

/**
 * Textos padrão de cada modelo (spec 1.5). Regra de honestidade: nada aqui
 * afirma fato sobre o negócio (horário, preço, ano, "melhor da cidade",
 * "atendemos a região"); tests/site-templates-i18n.test.ts proíbe dígito em
 * qualquer valor. Horário, preço e itens só entram pelo `SiteContent` salvo e
 * só aparecem quando ela preencheu. `callNow` e `whatsapp` continuam no topo
 * do PreviewDict; os modelos os leem de lá.
 */
export interface TemplateDict {
  tagline: string; // slogan genérico
  about: string; // parágrafo genérico sobre atendimento e cuidado, sem fato
  itemsHeading: string; // cardápio / serviços / serviços / destaques
  galleryHeading: string;
  hoursHeading: string;
  areaHeading: string; // ofício: "área atendida"
  inCity: (city: string) => string; // "Em {city}": só nomeia a cidade, nunca "atendemos a região"
  quoteHeading: string;
  aboutHeading: string;
  visitHeading: string; // onde estamos / localização e horário
  contactHeading: string;
  reserve: string; // CTA mesa
  book: string; // CTA estúdio
  quote: string; // CTA ofício
  email: string; // rótulo do CTA quando o único canal é e-mail
  closed: string; // linha do horário para dia sem faixa
}

type TemplateCommon = Pick<
  TemplateDict,
  | "galleryHeading"
  | "hoursHeading"
  | "areaHeading"
  | "inCity"
  | "quoteHeading"
  | "contactHeading"
  | "reserve"
  | "book"
  | "quote"
  | "email"
  | "closed"
>;
type TemplateOwn = Pick<TemplateDict, "tagline" | "about" | "itemsHeading" | "aboutHeading" | "visitHeading"> &
  Partial<TemplateCommon>;

/** Monta os 4 dicionários de modelo de um idioma: parte comum + o que cada modelo muda. */
function templateSet(common: TemplateCommon, own: Record<TemplateId, TemplateOwn>): Record<TemplateId, TemplateDict> {
  return {
    mesa: { ...common, ...own.mesa },
    estudio: { ...common, ...own.estudio },
    oficio: { ...common, ...own.oficio },
    vitrine: { ...common, ...own.vitrine },
  };
}

export interface PreviewDict {
  call: string;
  callNow: string;
  whatsapp: string;
  reviews: string;
  phoneLabel: string;
  whereLabel: string;
  // Horário NÃO é chave do dicionário. Ele existe só como DADO (`SiteContent.hours`,
  // convex/lib/site.ts), renderizado apenas quando a Duda preencheu no editor; o
  // rótulo da seção (`templates.<id>.hoursHeading`) aparece junto com o dado, nunca
  // sozinho. Qualquer valor fixo ("Seg a Sáb, 9h às 19h") num dicionário seria
  // invenção sobre o negócio de terceiro e mandaria o cliente dele a uma porta
  // fechada. tests/preview-i18n.test.ts trava isso na fonte dos modelos.
  /**
   * Título da aba do navegador. É o nome do NEGÓCIO, nunca a marca Osprano:
   * o prospect abre o que parece ser o site dele, não uma página do produto.
   */
  metaTitle: (o: { name: string; city: string | null }) => string;
  /**
   * Descrição da aba/preview de link (WhatsApp, messengers), no idioma do lead.
   * Recebe só nome e cidade — os dois dados verificados — e não pode prometer o
   * que a página não tem: nada de "Horário, telefone e como chegar", que anuncia
   * um horário inexistente e um telefone que nem todo lead tem.
   */
  metaDescription: (o: { name: string; city: string | null }) => string;
  templates: Record<TemplateId, TemplateDict>;
}

const enTemplates = templateSet(
  {
    galleryHeading: "Gallery",
    hoursHeading: "Opening hours",
    areaHeading: "Service area",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Ask for a quote",
    contactHeading: "Contact",
    reserve: "Book a table",
    book: "Book an appointment",
    quote: "Request a quote",
    email: "Send an email",
    closed: "Closed",
  },
  {
    mesa: {
      tagline: "A table set with care",
      about:
        "We take care of every detail and welcome you the way we would at home. Come and see us.",
      itemsHeading: "From the menu",
      aboutHeading: "About us",
      visitHeading: "Where to find us",
    },
    estudio: {
      tagline: "Your time, well spent",
      about:
        "A calm space, careful hands and attention to what you want. Book your visit and leave feeling like yourself again.",
      itemsHeading: "Services",
      aboutHeading: "About the studio",
      visitHeading: "Where to find us",
    },
    oficio: {
      tagline: "Work done right",
      about:
        "Clear answers, tidy work and respect for your time and your home. Tell us what you need and we will get back to you.",
      itemsHeading: "Services",
      aboutHeading: "How we work",
      visitHeading: "Where to find us",
      galleryHeading: "Our work",
    },
    vitrine: {
      tagline: "Here for you",
      about:
        "Personal attention, honest advice and the care you would expect from people who know their trade. Get in touch or come and see us.",
      itemsHeading: "Highlights",
      aboutHeading: "About us",
      visitHeading: "Location and hours",
    },
  },
);

const en: PreviewDict = {
  call: "Call",
  callNow: "Call now",
  whatsapp: "WhatsApp",
  reviews: "reviews",
  phoneLabel: "Phone",
  whereLabel: "Where",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Get to know ${name}${city ? ` in ${city}` : ""}. Come and visit us.`,
  templates: enTemplates,
};

const nlTemplates = templateSet(
  {
    galleryHeading: "Galerij",
    hoursHeading: "Openingstijden",
    areaHeading: "Werkgebied",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Vraag een offerte aan",
    contactHeading: "Contact",
    reserve: "Reserveer een tafel",
    book: "Maak een afspraak",
    quote: "Offerte aanvragen",
    email: "Stuur een e-mail",
    closed: "Gesloten",
  },
  {
    mesa: {
      tagline: "Een tafel met zorg gedekt",
      about:
        "We letten op elk detail en ontvangen u zoals we dat thuis zouden doen. Kom gerust langs.",
      itemsHeading: "Van de kaart",
      aboutHeading: "Over ons",
      visitHeading: "Waar u ons vindt",
    },
    estudio: {
      tagline: "Uw tijd, goed besteed",
      about:
        "Een rustige ruimte, zorgvuldige handen en aandacht voor wat u wilt. Boek uw bezoek en ga weer helemaal uzelf naar huis.",
      itemsHeading: "Diensten",
      aboutHeading: "Over de studio",
      visitHeading: "Waar u ons vindt",
    },
    oficio: {
      tagline: "Werk dat goed gedaan is",
      about:
        "Duidelijke antwoorden, net werk en respect voor uw tijd en uw huis. Vertel ons wat u nodig heeft en we nemen contact met u op.",
      itemsHeading: "Diensten",
      aboutHeading: "Zo werken wij",
      visitHeading: "Waar u ons vindt",
      galleryHeading: "Ons werk",
    },
    vitrine: {
      tagline: "Voor u klaar",
      about:
        "Persoonlijke aandacht, eerlijk advies en de zorg die u mag verwachten van mensen die hun vak verstaan. Neem contact op of kom langs.",
      itemsHeading: "Uitgelicht",
      aboutHeading: "Over ons",
      visitHeading: "Locatie en openingstijden",
    },
  },
);

const nl: PreviewDict = {
  call: "Bellen",
  callNow: "Nu bellen",
  whatsapp: "WhatsApp",
  reviews: "beoordelingen",
  phoneLabel: "Telefoon",
  whereLabel: "Waar",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Maak kennis met ${name}${city ? ` in ${city}` : ""}. Kom gerust langs.`,
  templates: nlTemplates,
};

const svTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Öppettider",
    areaHeading: "Område vi arbetar i",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Be om en offert",
    contactHeading: "Kontakt",
    reserve: "Boka bord",
    book: "Boka tid",
    quote: "Begär offert",
    email: "Skicka e-post",
    closed: "Stängt",
  },
  {
    mesa: {
      tagline: "Ett bord dukat med omsorg",
      about:
        "Vi bryr oss om varje detalj och tar emot dig som hemma. Kom gärna förbi.",
      itemsHeading: "Ur menyn",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit",
    },
    estudio: {
      tagline: "Din tid, väl använd",
      about:
        "En lugn plats, varsamma händer och uppmärksamhet på vad du vill ha. Boka ditt besök och gå hem som dig själv igen.",
      itemsHeading: "Tjänster",
      aboutHeading: "Om studion",
      visitHeading: "Hitta hit",
    },
    oficio: {
      tagline: "Arbete som blir rätt gjort",
      about:
        "Tydliga svar, snyggt utfört arbete och respekt för din tid och ditt hem. Berätta vad du behöver så hör vi av oss.",
      itemsHeading: "Tjänster",
      aboutHeading: "Så arbetar vi",
      visitHeading: "Hitta hit",
      galleryHeading: "Vårt arbete",
    },
    vitrine: {
      tagline: "Här för dig",
      about:
        "Personligt bemötande, ärliga råd och den omsorg du kan förvänta dig av människor som kan sitt hantverk. Hör av dig eller kom förbi.",
      itemsHeading: "I fokus",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit och öppettider",
    },
  },
);

const sv: PreviewDict = {
  call: "Ring",
  callNow: "Ring nu",
  whatsapp: "WhatsApp",
  reviews: "omdömen",
  phoneLabel: "Telefon",
  whereLabel: "Var",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lär känna ${name}${city ? ` i ${city}` : ""}. Kom gärna förbi.`,
  templates: svTemplates,
};

const noTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Åpningstider",
    areaHeading: "Område vi dekker",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Be om et tilbud",
    contactHeading: "Kontakt",
    reserve: "Bestill bord",
    book: "Bestill time",
    quote: "Be om tilbud",
    email: "Send e-post",
    closed: "Stengt",
  },
  {
    mesa: {
      tagline: "Et bord dekket med omhu",
      about:
        "Vi tar vare på hver detalj og tar imot deg som hjemme. Kom gjerne innom.",
      itemsHeading: "Fra menyen",
      aboutHeading: "Om oss",
      visitHeading: "Her finner du oss",
    },
    estudio: {
      tagline: "Din tid, godt brukt",
      about:
        "Et rolig sted, varsomme hender og oppmerksomhet på det du ønsker. Bestill ditt besøk og gå hjem som deg selv igjen.",
      itemsHeading: "Tjenester",
      aboutHeading: "Om studioet",
      visitHeading: "Her finner du oss",
    },
    oficio: {
      tagline: "Arbeid gjort riktig",
      about:
        "Klare svar, ryddig arbeid og respekt for tiden din og hjemmet ditt. Fortell oss hva du trenger, så tar vi kontakt.",
      itemsHeading: "Tjenester",
      aboutHeading: "Slik jobber vi",
      visitHeading: "Her finner du oss",
      galleryHeading: "Vårt arbeid",
    },
    vitrine: {
      tagline: "Her for deg",
      about:
        "Personlig oppfølging, ærlige råd og omsorgen du forventer av folk som kan faget sitt. Ta kontakt eller stikk innom.",
      itemsHeading: "Utvalgt",
      aboutHeading: "Om oss",
      visitHeading: "Adresse og åpningstider",
    },
  },
);

const no: PreviewDict = {
  call: "Ring",
  callNow: "Ring nå",
  whatsapp: "WhatsApp",
  reviews: "anmeldelser",
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Bli kjent med ${name}${city ? ` i ${city}` : ""}. Kom gjerne innom.`,
  templates: noTemplates,
};

const esTemplates = templateSet(
  {
    galleryHeading: "Galería",
    hoursHeading: "Horario",
    areaHeading: "Zona de servicio",
    inCity: (city) => `En ${city}`,
    quoteHeading: "Pida presupuesto",
    contactHeading: "Contacto",
    reserve: "Reservar mesa",
    book: "Pedir cita",
    quote: "Solicitar presupuesto",
    email: "Enviar un correo",
    closed: "Cerrado",
  },
  {
    mesa: {
      tagline: "Una mesa puesta con cariño",
      about:
        "Cuidamos cada detalle y le recibimos como en casa. Venga a conocernos.",
      itemsHeading: "De la carta",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Dónde encontrarnos",
    },
    estudio: {
      tagline: "Su tiempo, bien aprovechado",
      about:
        "Un espacio tranquilo, manos cuidadosas y atención a lo que usted quiere. Reserve su visita y salga sintiéndose usted de nuevo.",
      itemsHeading: "Servicios",
      aboutHeading: "Sobre el estudio",
      visitHeading: "Dónde encontrarnos",
    },
    oficio: {
      tagline: "Trabajo bien hecho",
      about:
        "Respuestas claras, trabajo limpio y respeto por su tiempo y su casa. Cuéntenos qué necesita y le responderemos.",
      itemsHeading: "Servicios",
      aboutHeading: "Cómo trabajamos",
      visitHeading: "Dónde encontrarnos",
      galleryHeading: "Nuestro trabajo",
    },
    vitrine: {
      tagline: "Aquí para usted",
      about:
        "Atención personal, consejo honesto y el cuidado que espera de quien conoce su oficio. Escríbanos o venga a vernos.",
      itemsHeading: "Destacados",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Ubicación y horario",
    },
  },
);

const es: PreviewDict = {
  call: "Llamar",
  callNow: "Llamar ahora",
  whatsapp: "WhatsApp",
  reviews: "reseñas",
  phoneLabel: "Teléfono",
  whereLabel: "Dónde",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Conozca ${name}${city ? ` en ${city}` : ""}. Venga a visitarnos.`,
  templates: esTemplates,
};

// Botões (reserve/book/quote/email) no imperativo informal, padrão dos sites italianos e
// coerente com o `callNow: "Chiama ora"` que já existe no topo; títulos e texto corrido em Lei.
const itTemplates = templateSet(
  {
    galleryHeading: "Galleria",
    hoursHeading: "Orari di apertura",
    areaHeading: "Zona servita",
    inCity: (city) => `A ${city}`,
    quoteHeading: "Chieda un preventivo",
    contactHeading: "Contatti",
    reserve: "Prenota un tavolo",
    book: "Prenota un appuntamento",
    quote: "Richiedi un preventivo",
    email: "Scrivici",
    closed: "Chiuso",
  },
  {
    mesa: {
      tagline: "Una tavola apparecchiata con cura",
      about:
        "Curiamo ogni dettaglio e La accogliamo come a casa. Venga a trovarci.",
      itemsHeading: "Dal menù",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove trovarci",
    },
    estudio: {
      tagline: "Il Suo tempo, speso bene",
      about:
        "Uno spazio tranquillo, mani attente e cura per ciò che desidera. Prenoti la Sua visita e torni a sentirsi al meglio.",
      itemsHeading: "Servizi",
      aboutHeading: "Lo studio",
      visitHeading: "Dove trovarci",
    },
    oficio: {
      tagline: "Lavoro fatto bene",
      about:
        "Risposte chiare, lavoro pulito e rispetto per il Suo tempo e la Sua casa. Ci dica di cosa ha bisogno e La ricontatteremo.",
      itemsHeading: "Servizi",
      aboutHeading: "Come lavoriamo",
      visitHeading: "Dove trovarci",
      galleryHeading: "I nostri lavori",
    },
    vitrine: {
      tagline: "Qui per Lei",
      about:
        "Attenzione personale, consigli onesti e la cura che si aspetta da chi conosce il proprio mestiere. Ci contatti o venga a trovarci.",
      itemsHeading: "In evidenza",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove siamo e orari",
    },
  },
);

const it: PreviewDict = {
  call: "Chiama",
  callNow: "Chiama ora",
  whatsapp: "WhatsApp",
  reviews: "recensioni",
  phoneLabel: "Telefono",
  whereLabel: "Dove",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Scopra ${name}${city ? ` a ${city}` : ""}. Venga a trovarci.`,
  templates: itTemplates,
};

const ptTemplates = templateSet(
  {
    galleryHeading: "Galeria",
    hoursHeading: "Horário",
    areaHeading: "Zona de atuação",
    inCity: (city) => `Em ${city}`,
    quoteHeading: "Peça um orçamento",
    contactHeading: "Contacto",
    reserve: "Reservar mesa",
    book: "Marcar horário",
    quote: "Pedir orçamento",
    email: "Enviar e-mail",
    closed: "Fechado",
  },
  {
    mesa: {
      tagline: "Uma mesa posta com cuidado",
      about:
        "Fazemos tudo com atenção a cada detalhe e recebemo-lo como em casa. Venha conhecer-nos.",
      itemsHeading: "Da ementa",
      aboutHeading: "Sobre nós",
      visitHeading: "Onde estamos",
    },
    estudio: {
      tagline: "O seu tempo, bem passado",
      about:
        "Um espaço tranquilo, mãos cuidadosas e atenção ao que pretende. Marque a sua visita e saia a sentir-se de novo como gosta.",
      itemsHeading: "Serviços",
      aboutHeading: "O estúdio",
      visitHeading: "Onde estamos",
    },
    oficio: {
      tagline: "Trabalho bem feito",
      about:
        "Respostas claras, trabalho limpo e respeito pelo seu tempo e pela sua casa. Diga-nos do que precisa e entraremos em contacto.",
      itemsHeading: "Serviços",
      aboutHeading: "Como trabalhamos",
      visitHeading: "Onde estamos",
      galleryHeading: "O nosso trabalho",
    },
    vitrine: {
      tagline: "Aqui para si",
      about:
        "Atenção pessoal, conselhos honestos e o cuidado que espera de quem conhece o seu ofício. Contacte-nos ou venha visitar-nos.",
      itemsHeading: "Destaques",
      aboutHeading: "Sobre nós",
      visitHeading: "Localização e horário",
    },
  },
);

/** Português europeu (PT), não pt-BR: é a língua do prospect, não da usuária. */
const pt: PreviewDict = {
  call: "Ligar",
  callNow: "Ligar agora",
  whatsapp: "WhatsApp",
  reviews: "avaliações",
  phoneLabel: "Telefone",
  whereLabel: "Onde",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Conheça ${name}${city ? `, em ${city}` : ""}. Venha visitar-nos.`,
  templates: ptTemplates,
};

const deTemplates = templateSet(
  {
    galleryHeading: "Galerie",
    hoursHeading: "Öffnungszeiten",
    areaHeading: "Einsatzgebiet",
    inCity: (city) => `In ${city}`,
    quoteHeading: "Angebot anfragen",
    contactHeading: "Kontakt",
    reserve: "Tisch reservieren",
    book: "Termin buchen",
    quote: "Angebot anfordern",
    email: "E-Mail schreiben",
    closed: "Geschlossen",
  },
  {
    mesa: {
      tagline: "Ein Tisch, mit Sorgfalt gedeckt",
      about:
        "Wir achten auf jedes Detail und empfangen Sie wie zu Hause. Schauen Sie vorbei.",
      itemsHeading: "Aus der Karte",
      aboutHeading: "Über uns",
      visitHeading: "So finden Sie uns",
    },
    estudio: {
      tagline: "Ihre Zeit, gut verbracht",
      about:
        "Ein ruhiger Ort, sorgfältige Hände und ein offenes Ohr für Ihre Wünsche. Buchen Sie Ihren Besuch und gehen Sie wieder ganz als Sie selbst nach Hause.",
      itemsHeading: "Leistungen",
      aboutHeading: "Das Studio",
      visitHeading: "So finden Sie uns",
    },
    oficio: {
      tagline: "Arbeit, die richtig gemacht ist",
      about:
        "Klare Antworten, saubere Arbeit und Respekt vor Ihrer Zeit und Ihrem Zuhause. Sagen Sie uns, was Sie brauchen, und wir melden uns bei Ihnen.",
      itemsHeading: "Leistungen",
      aboutHeading: "So arbeiten wir",
      visitHeading: "So finden Sie uns",
      galleryHeading: "Unsere Arbeit",
    },
    vitrine: {
      tagline: "Für Sie da",
      about:
        "Persönliche Betreuung, ehrliche Beratung und die Sorgfalt, die Sie von Menschen erwarten, die ihr Handwerk verstehen. Melden Sie sich oder schauen Sie vorbei.",
      itemsHeading: "Highlights",
      aboutHeading: "Über uns",
      visitHeading: "Standort und Öffnungszeiten",
    },
  },
);

/** Alemão padrão (Hochdeutsch) — serve DE e CH (B2B suíço usa alemão padrão). */
const de: PreviewDict = {
  call: "Anrufen",
  callNow: "Jetzt anrufen",
  whatsapp: "WhatsApp",
  reviews: "Bewertungen",
  phoneLabel: "Telefon",
  whereLabel: "Wo",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lernen Sie ${name}${city ? ` in ${city}` : ""} kennen. Besuchen Sie uns.`,
  templates: deTemplates,
};

const daTemplates = templateSet(
  {
    galleryHeading: "Galleri",
    hoursHeading: "Åbningstider",
    areaHeading: "Vores område",
    inCity: (city) => `I ${city}`,
    quoteHeading: "Bed om et tilbud",
    contactHeading: "Kontakt",
    reserve: "Book bord",
    book: "Book tid",
    quote: "Anmod om tilbud",
    email: "Send en e-mail",
    closed: "Lukket",
  },
  {
    mesa: {
      tagline: "Et bord dækket med omhu",
      about:
        "Vi går op i hver detalje og tager imod dig som derhjemme. Kig gerne forbi.",
      itemsHeading: "Fra menuen",
      aboutHeading: "Om os",
      visitHeading: "Her finder du os",
    },
    estudio: {
      tagline: "Din tid, godt brugt",
      about:
        "Et roligt sted, omhyggelige hænder og opmærksomhed på det, du ønsker. Book dit besøg og gå hjem som dig selv igen.",
      itemsHeading: "Ydelser",
      aboutHeading: "Om studiet",
      visitHeading: "Her finder du os",
    },
    oficio: {
      tagline: "Arbejde gjort ordentligt",
      about:
        "Klare svar, pænt arbejde og respekt for din tid og dit hjem. Fortæl os, hvad du har brug for, så vender vi tilbage.",
      itemsHeading: "Ydelser",
      aboutHeading: "Sådan arbejder vi",
      visitHeading: "Her finder du os",
      galleryHeading: "Vores arbejde",
    },
    vitrine: {
      tagline: "Her for dig",
      about:
        "Personlig betjening, ærlig rådgivning og den omhu, du forventer af folk, der kender deres fag. Kontakt os eller kig forbi.",
      itemsHeading: "Udvalgt",
      aboutHeading: "Om os",
      visitHeading: "Adresse og åbningstider",
    },
  },
);

const da: PreviewDict = {
  call: "Ring",
  callNow: "Ring nu",
  whatsapp: "WhatsApp",
  reviews: "anmeldelser",
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lær ${name}${city ? ` i ${city}` : ""} at kende. Kig gerne forbi.`,
  templates: daTemplates,
};

const frTemplates = templateSet(
  {
    galleryHeading: "Galerie",
    hoursHeading: "Horaires d'ouverture",
    areaHeading: "Zone d'intervention",
    inCity: (city) => `À ${city}`,
    quoteHeading: "Demandez un devis",
    contactHeading: "Contact",
    reserve: "Réserver une table",
    book: "Prendre rendez-vous",
    quote: "Demander un devis",
    email: "Envoyer un e-mail",
    closed: "Fermé",
  },
  {
    mesa: {
      tagline: "Une table dressée avec soin",
      about:
        "Nous soignons chaque détail et vous accueillons comme à la maison. Venez nous voir.",
      itemsHeading: "À la carte",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Où nous trouver",
    },
    estudio: {
      tagline: "Votre temps, bien employé",
      about:
        "Un lieu calme, des mains soigneuses et une attention à ce que vous souhaitez. Réservez votre visite et repartez en vous sentant vous-même.",
      itemsHeading: "Prestations",
      aboutHeading: "Le studio",
      visitHeading: "Où nous trouver",
    },
    oficio: {
      tagline: "Du travail bien fait",
      about:
        "Des réponses claires, un travail propre et le respect de votre temps et de votre maison. Dites-nous ce dont vous avez besoin et nous vous recontacterons.",
      itemsHeading: "Prestations",
      aboutHeading: "Notre façon de travailler",
      visitHeading: "Où nous trouver",
      galleryHeading: "Nos réalisations",
    },
    vitrine: {
      tagline: "À votre écoute",
      about:
        "Une attention personnelle, des conseils honnêtes et le soin que vous attendez de personnes qui connaissent leur métier. Contactez-nous ou passez nous voir.",
      itemsHeading: "À la une",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Adresse et horaires",
    },
  },
);

/**
 * Francês de negócios, vouvoiement — serve a Suíça francófona (Romandia).
 * Não é mercado novo: é o idioma de parte dos leads do mercado CH.
 *
 * TIPOGRAFIA: em francês, `?` `!` `:` `;` levam espaço INSECÁVEL antes. Escreva
 * sempre o escape `\u00A0` na string — nunca o espaço normal (U+0020) e nunca o
 * caractere invisível colado no código. Não é espaço duplo: num email em texto
 * puro com quebra automática, o espaço normal deixa a pontuação cair sozinha no
 * começo da linha, defeito que um leitor romando nota na hora. O apóstrofo fica
 * ASCII (') de propósito, consistente com o resto do repo. Hoje nenhuma linha FR
 * usa essa pontuação; a regra vale para a próxima (teste de guarda em tests/).
 */
const fr: PreviewDict = {
  call: "Appeler",
  callNow: "Appeler maintenant",
  whatsapp: "WhatsApp",
  reviews: "avis",
  phoneLabel: "Téléphone",
  whereLabel: "Où",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Découvrez ${name}${city ? ` à ${city}` : ""}. Venez nous rendre visite.`,
  templates: frTemplates,
};

export const DICTS: Record<Locale, PreviewDict> = { en, nl, sv, no, es, it, pt, de, da, fr };
