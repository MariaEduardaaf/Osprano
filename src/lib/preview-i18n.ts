// Import relativo e com extensão `.ts` de propósito: os testes rodam em
// `node --experimental-strip-types`, que não lê os `paths` do tsconfig (o alias
// `@convex/*` quebraria) nem resolve import sem extensão.
import { swissLanguage } from "../../convex/lib/domain.ts";

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

export interface PreviewDict {
  call: string;
  callNow: string;
  whatsapp: string;
  reviews: string;
  heroSubtitle: string;
  featureQualityTitle: string;
  featureQualityBody: string;
  featureServiceTitle: string;
  featureServiceBody: string;
  featureLocationTitle: string;
  featureLocationBodyWithCity: (city: string) => string;
  featureLocationBodyNoCity: string;
  visitHeading: string;
  visitBody: (o: { name: string; category: string | null; city: string | null }) => string;
  phoneLabel: string;
  whereLabel: string;
  hoursLabel: string;
  hoursValue: string;
  /**
   * Título da aba do navegador. É o nome do NEGÓCIO, nunca a marca Osprano:
   * o prospect abre o que parece ser o site dele, não uma página do produto.
   */
  metaTitle: (o: { name: string; city: string | null }) => string;
  /** Descrição da aba/preview de link (WhatsApp, messengers), no idioma do lead. */
  metaDescription: (o: { name: string; city: string | null }) => string;
}

const en: PreviewDict = {
  call: "Call",
  callNow: "Call now",
  whatsapp: "WhatsApp",
  reviews: "reviews",
  heroSubtitle:
    "Craft, a warm welcome, and the trust of people who already know us. Book, call, or drop by.",
  featureQualityTitle: "Quality",
  featureQualityBody: "Made with care, from start to finish.",
  featureServiceTitle: "Service",
  featureServiceBody: "Close to you, just the way you like it.",
  featureLocationTitle: "In the heart of the city",
  featureLocationBodyWithCity: (city) => `Right in the centre of ${city}.`,
  featureLocationBodyNoCity: "Easy to reach.",
  visitHeading: "Come and visit us",
  visitBody: ({ name, category, city }) =>
    `${name} is a name to know${category ? ` in ${category}` : " in the neighbourhood"}${city ? `, in ${city}` : ""}. We're ready to welcome you.`,
  phoneLabel: "Phone",
  whereLabel: "Where",
  hoursLabel: "Hours",
  hoursValue: "Mon–Sat · 9am–7pm",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Opening hours, phone and how to find ${name}${city ? ` in ${city}` : ""}. Call us or drop by.`,
};

const nl: PreviewDict = {
  call: "Bellen",
  callNow: "Nu bellen",
  whatsapp: "WhatsApp",
  reviews: "beoordelingen",
  heroSubtitle:
    "Vakmanschap, een warm onthaal en het vertrouwen van wie ons al kent. Reserveer, bel of loop even binnen.",
  featureQualityTitle: "Kwaliteit",
  featureQualityBody: "Met zorg gemaakt, van begin tot eind.",
  featureServiceTitle: "Service",
  featureServiceBody: "Dichtbij, precies zoals u het wilt.",
  featureLocationTitle: "In het hart van de stad",
  featureLocationBodyWithCity: (city) => `Midden in het centrum van ${city}.`,
  featureLocationBodyNoCity: "Makkelijk te bereiken.",
  visitHeading: "Kom langs",
  visitBody: ({ name, category, city }) =>
    `${name} is een begrip${category ? ` in ${category}` : " in de buurt"}${city ? `, in ${city}` : ""}. We heten u graag welkom.`,
  phoneLabel: "Telefoon",
  whereLabel: "Waar",
  hoursLabel: "Openingstijden",
  hoursValue: "Ma–Za · 9.00–19.00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Openingstijden, telefoonnummer en route naar ${name}${city ? ` in ${city}` : ""}. Bel ons of loop even binnen.`,
};

const sv: PreviewDict = {
  call: "Ring",
  callNow: "Ring nu",
  whatsapp: "WhatsApp",
  reviews: "omdömen",
  heroSubtitle:
    "Hantverk, ett varmt bemötande och tryggheten hos dem som redan känner oss. Boka, ring eller kom förbi.",
  featureQualityTitle: "Kvalitet",
  featureQualityBody: "Gjort med omsorg, från början till slut.",
  featureServiceTitle: "Service",
  featureServiceBody: "Nära dig, precis som du vill ha det.",
  featureLocationTitle: "Mitt i stan",
  featureLocationBodyWithCity: (city) => `Mitt i centrala ${city}.`,
  featureLocationBodyNoCity: "Lätt att hitta.",
  visitHeading: "Kom och besök oss",
  visitBody: ({ name, category, city }) =>
    `${name} är ett namn att känna till${category ? ` inom ${category}` : " i området"}${city ? `, i ${city}` : ""}. Vi tar gärna emot dig.`,
  phoneLabel: "Telefon",
  whereLabel: "Var",
  hoursLabel: "Öppettider",
  hoursValue: "Mån–Lör · 09.00–19.00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Öppettider, telefonnummer och vägbeskrivning till ${name}${city ? ` i ${city}` : ""}. Ring oss eller kom förbi.`,
};

const no: PreviewDict = {
  call: "Ring",
  callNow: "Ring nå",
  whatsapp: "WhatsApp",
  reviews: "anmeldelser",
  heroSubtitle:
    "Håndverk, en varm velkomst og tryggheten fra dem som allerede kjenner oss. Bestill, ring eller stikk innom.",
  featureQualityTitle: "Kvalitet",
  featureQualityBody: "Laget med omtanke, fra start til slutt.",
  featureServiceTitle: "Service",
  featureServiceBody: "Nær deg, slik du liker det.",
  featureLocationTitle: "Midt i sentrum",
  featureLocationBodyWithCity: (city) => `Midt i sentrum av ${city}.`,
  featureLocationBodyNoCity: "Lett å finne.",
  visitHeading: "Kom og besøk oss",
  visitBody: ({ name, category, city }) =>
    `${name} er et navn å kjenne til${category ? ` innen ${category}` : " i nabolaget"}${city ? `, i ${city}` : ""}. Vi tar gjerne imot deg.`,
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  hoursLabel: "Åpningstider",
  hoursValue: "Man–Lør · 09.00–19.00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Åpningstider, telefonnummer og veibeskrivelse til ${name}${city ? ` i ${city}` : ""}. Ring oss eller stikk innom.`,
};

const es: PreviewDict = {
  call: "Llamar",
  callNow: "Llamar ahora",
  whatsapp: "WhatsApp",
  reviews: "reseñas",
  heroSubtitle:
    "Oficio, una acogida cálida y la confianza de quienes ya nos conocen. Reserve, llame o pásese a vernos.",
  featureQualityTitle: "Calidad",
  featureQualityBody: "Hecho con cuidado, de principio a fin.",
  featureServiceTitle: "Atención",
  featureServiceBody: "Cerca de usted, tal y como le gusta.",
  featureLocationTitle: "En el corazón de la ciudad",
  featureLocationBodyWithCity: (city) => `En pleno centro de ${city}.`,
  featureLocationBodyNoCity: "Fácil de encontrar.",
  visitHeading: "Venga a visitarnos",
  visitBody: ({ name, category, city }) =>
    `${name} es un nombre a tener en cuenta${category ? ` en ${category}` : " en el barrio"}${city ? `, en ${city}` : ""}. Le esperamos.`,
  phoneLabel: "Teléfono",
  whereLabel: "Dónde",
  hoursLabel: "Horario",
  hoursValue: "Lun–Sáb · 9:00–19:00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Horario, teléfono y cómo llegar a ${name}${city ? ` en ${city}` : ""}. Llámenos o pásese a vernos.`,
};

const it: PreviewDict = {
  call: "Chiama",
  callNow: "Chiama ora",
  whatsapp: "WhatsApp",
  reviews: "recensioni",
  heroSubtitle:
    "Artigianato, un'accoglienza calorosa e la fiducia di chi ci conosce già. Prenoti, chiami o passi a trovarci.",
  featureQualityTitle: "Qualità",
  featureQualityBody: "Fatto con cura, dall'inizio alla fine.",
  featureServiceTitle: "Servizio",
  // Lei/Le maiúsculos: forma de cortesia, igual a "La aspettiamo" e "Ci chiami"
  // no mesmo dicionário — minúsculo aqui era alternância de tratamento.
  featureServiceBody: "Vicino a Lei, proprio come Le piace.",
  featureLocationTitle: "Nel cuore della città",
  featureLocationBodyWithCity: (city) => `In pieno centro a ${city}.`,
  featureLocationBodyNoCity: "Facile da raggiungere.",
  visitHeading: "Venga a trovarci",
  visitBody: ({ name, category, city }) =>
    `${name} è un nome da conoscere${category ? ` nel settore ${category}` : " nel quartiere"}${city ? `, a ${city}` : ""}. La aspettiamo.`,
  phoneLabel: "Telefono",
  whereLabel: "Dove",
  hoursLabel: "Orari",
  hoursValue: "Lun–Sab · 9:00–19:00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Orari, telefono e come raggiungere ${name}${city ? ` a ${city}` : ""}. Ci chiami o passi a trovarci.`,
};

/** Português europeu (PT), não pt-BR: é a língua do prospect, não da usuária. */
const pt: PreviewDict = {
  call: "Ligar",
  callNow: "Ligar agora",
  whatsapp: "WhatsApp",
  reviews: "avaliações",
  heroSubtitle:
    "Ofício, um acolhimento caloroso e a confiança de quem já nos conhece. Reserve, ligue ou passe por cá.",
  featureQualityTitle: "Qualidade",
  featureQualityBody: "Feito com cuidado, do início ao fim.",
  featureServiceTitle: "Atendimento",
  featureServiceBody: "Perto de si, tal como gosta.",
  featureLocationTitle: "No coração da cidade",
  featureLocationBodyWithCity: (city) => `Mesmo no centro de ${city}.`,
  featureLocationBodyNoCity: "Fácil de encontrar.",
  visitHeading: "Venha visitar-nos",
  visitBody: ({ name, category, city }) =>
    `${name} é um nome a conhecer${category ? ` em ${category}` : " no bairro"}${city ? `, em ${city}` : ""}. Teremos todo o gosto em recebê-lo.`,
  phoneLabel: "Telefone",
  whereLabel: "Onde",
  hoursLabel: "Horário",
  hoursValue: "Seg–Sáb · 9h00–19h00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Horário, telefone e como chegar a ${name}${city ? `, em ${city}` : ""}. Ligue-nos ou passe por cá.`,
};

/** Alemão padrão (Hochdeutsch) — serve DE e CH (B2B suíço usa alemão padrão). */
const de: PreviewDict = {
  call: "Anrufen",
  callNow: "Jetzt anrufen",
  whatsapp: "WhatsApp",
  reviews: "Bewertungen",
  heroSubtitle:
    "Handwerk, ein herzlicher Empfang und das Vertrauen derer, die uns schon kennen. Reservieren Sie, rufen Sie an oder schauen Sie vorbei.",
  featureQualityTitle: "Qualität",
  featureQualityBody: "Mit Sorgfalt gemacht, von Anfang bis Ende.",
  featureServiceTitle: "Service",
  featureServiceBody: "Nah bei Ihnen, ganz wie Sie es mögen.",
  featureLocationTitle: "Im Herzen der Stadt",
  featureLocationBodyWithCity: (city) => `Mitten im Zentrum von ${city}.`,
  featureLocationBodyNoCity: "Gut zu erreichen.",
  visitHeading: "Besuchen Sie uns",
  visitBody: ({ name, category, city }) =>
    `${name} ist ein Name, den man kennt${category ? ` in der Branche ${category}` : " im Viertel"}${city ? `, in ${city}` : ""}. Wir freuen uns auf Sie.`,
  phoneLabel: "Telefon",
  whereLabel: "Wo",
  hoursLabel: "Öffnungszeiten",
  hoursValue: "Mo–Sa · 9–19 Uhr",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Öffnungszeiten, Telefonnummer und Anfahrt zu ${name}${city ? ` in ${city}` : ""}. Rufen Sie uns an oder schauen Sie vorbei.`,
};

const da: PreviewDict = {
  call: "Ring",
  callNow: "Ring nu",
  whatsapp: "WhatsApp",
  reviews: "anmeldelser",
  heroSubtitle:
    "Håndværk, en varm velkomst og tilliden fra dem, der allerede kender os. Book, ring eller kig forbi.",
  featureQualityTitle: "Kvalitet",
  featureQualityBody: "Lavet med omhu, fra start til slut.",
  featureServiceTitle: "Service",
  featureServiceBody: "Tæt på dig, præcis som du vil have det.",
  featureLocationTitle: "Midt i byen",
  featureLocationBodyWithCity: (city) => `Midt i centrum af ${city}.`,
  featureLocationBodyNoCity: "Nemt at finde.",
  visitHeading: "Kom og besøg os",
  visitBody: ({ name, category, city }) =>
    `${name} er et navn, man kender${category ? ` inden for ${category}` : " i kvarteret"}${city ? `, i ${city}` : ""}. Vi tager gerne imod dig.`,
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  hoursLabel: "Åbningstider",
  hoursValue: "Man–Lør · 9.00–19.00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Åbningstider, telefonnummer og vejvisning til ${name}${city ? ` i ${city}` : ""}. Ring til os, eller kig forbi.`,
};

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
  heroSubtitle:
    "Un savoir-faire, un accueil chaleureux et la confiance de ceux qui nous connaissent déjà. Réservez, appelez ou passez nous voir.",
  featureQualityTitle: "Qualité",
  featureQualityBody: "Fait avec soin, du début à la fin.",
  featureServiceTitle: "Service",
  featureServiceBody: "Près de vous, comme vous l'entendez.",
  featureLocationTitle: "Au cœur de la ville",
  featureLocationBodyWithCity: (city) => `En plein centre de ${city}.`,
  // Chave de acessibilidade ("Easy to reach"), não de localização: "d'accès",
  // não "à trouver" — este último repetiria a ideia do título.
  featureLocationBodyNoCity: "Facile d'accès.",
  visitHeading: "Venez nous rendre visite",
  // `en ${category}`: a categoria vem crua do Places ("boulangerie"), e
  // "dans le secteur boulangerie" fica agramatical em francês.
  visitBody: ({ name, category, city }) =>
    `${name} est une adresse à connaître${category ? ` en ${category}` : " dans le quartier"}${city ? `, à ${city}` : ""}. Nous vous attendons.`,
  phoneLabel: "Téléphone",
  whereLabel: "Où",
  hoursLabel: "Horaires",
  hoursValue: "Lun–Sam · 9h00–19h00",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  // "itinéraire VERS": em francês o destino pede `vers`/`jusqu'à`, não `pour`.
  metaDescription: ({ name, city }) =>
    `Horaires, téléphone et itinéraire vers ${name}${city ? ` à ${city}` : ""}. Appelez-nous ou passez nous voir.`,
};

export const DICTS: Record<Locale, PreviewDict> = { en, nl, sv, no, es, it, pt, de, da, fr };
