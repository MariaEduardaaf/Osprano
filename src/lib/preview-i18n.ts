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
  /**
   * Só nomeia a cidade, que vem do Places. Não diga "em pleno centro de X": a
   * base não tem endereço nem coordenada que sustente isso, e metade dos leads
   * fica em bairro ou periferia — seria fato inventado sobre o negócio alheio.
   */
  featureLocationBodyWithCity: (city: string) => string;
  featureLocationBodyNoCity: string;
  visitHeading: string;
  visitBody: (o: { name: string; category: string | null; city: string | null }) => string;
  phoneLabel: string;
  whereLabel: string;
  // NÃO EXISTE chave de horário aqui (hoursLabel/hoursValue), e não deve voltar a
  // existir. O bloco de contato da prévia é publicado com o nome do negócio REAL:
  // cada linha dele se apresenta como registro, não como marketing. O Places
  // (convex/places.ts) não pede `regularOpeningHours` no field mask, então não há
  // fonte de verdade — qualquer valor fixo ("Seg–Sáb · 9h–19h") é invenção sobre o
  // negócio de terceiro e pode mandar o cliente dele para uma porta fechada. Se um
  // dia o horário vier do Places por lead, ele volta como DADO opcional em
  // `PreviewContent`, renderizado só quando existir — nunca como string fixa do
  // dicionário. Mesma régua do rodapé de opt-out: a trava mora no código.
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
  featureLocationTitle: "Where to find us",
  featureLocationBodyWithCity: (city) => `You'll find us in ${city}.`,
  featureLocationBodyNoCity: "Easy to reach.",
  visitHeading: "Come and visit us",
  visitBody: ({ name, category, city }) =>
    `${name} is a name to know${category ? ` in ${category}` : " in the neighbourhood"}${city ? `, in ${city}` : ""}. We're ready to welcome you.`,
  phoneLabel: "Phone",
  whereLabel: "Where",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Get to know ${name}${city ? ` in ${city}` : ""}. Come and visit us.`,
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
  featureLocationTitle: "Waar u ons vindt",
  featureLocationBodyWithCity: (city) => `U vindt ons in ${city}.`,
  featureLocationBodyNoCity: "Makkelijk te bereiken.",
  visitHeading: "Kom langs",
  visitBody: ({ name, category, city }) =>
    `${name} is een begrip${category ? ` in ${category}` : " in de buurt"}${city ? `, in ${city}` : ""}. We heten u graag welkom.`,
  phoneLabel: "Telefoon",
  whereLabel: "Waar",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Maak kennis met ${name}${city ? ` in ${city}` : ""}. Kom gerust langs.`,
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
  featureLocationTitle: "Var du hittar oss",
  featureLocationBodyWithCity: (city) => `Du hittar oss i ${city}.`,
  featureLocationBodyNoCity: "Lätt att hitta.",
  visitHeading: "Kom och besök oss",
  visitBody: ({ name, category, city }) =>
    `${name} är ett namn att känna till${category ? ` inom ${category}` : " i området"}${city ? `, i ${city}` : ""}. Vi tar gärna emot dig.`,
  phoneLabel: "Telefon",
  whereLabel: "Var",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lär känna ${name}${city ? ` i ${city}` : ""}. Kom gärna förbi.`,
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
  featureLocationTitle: "Her finner du oss",
  featureLocationBodyWithCity: (city) => `Du finner oss i ${city}.`,
  featureLocationBodyNoCity: "Lett å finne.",
  visitHeading: "Kom og besøk oss",
  visitBody: ({ name, category, city }) =>
    `${name} er et navn å kjenne til${category ? ` innen ${category}` : " i nabolaget"}${city ? `, i ${city}` : ""}. Vi tar gjerne imot deg.`,
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Bli kjent med ${name}${city ? ` i ${city}` : ""}. Kom gjerne innom.`,
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
  featureLocationTitle: "Dónde encontrarnos",
  featureLocationBodyWithCity: (city) => `Nos encontrará en ${city}.`,
  featureLocationBodyNoCity: "Fácil de encontrar.",
  visitHeading: "Venga a visitarnos",
  visitBody: ({ name, category, city }) =>
    `${name} es un nombre a tener en cuenta${category ? ` en ${category}` : " en el barrio"}${city ? `, en ${city}` : ""}. Le esperamos.`,
  phoneLabel: "Teléfono",
  whereLabel: "Dónde",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Conozca ${name}${city ? ` en ${city}` : ""}. Venga a visitarnos.`,
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
  featureLocationTitle: "Dove trovarci",
  featureLocationBodyWithCity: (city) => `Ci trova a ${city}.`,
  featureLocationBodyNoCity: "Facile da raggiungere.",
  visitHeading: "Venga a trovarci",
  visitBody: ({ name, category, city }) =>
    `${name} è un nome da conoscere${category ? ` nel settore ${category}` : " nel quartiere"}${city ? `, a ${city}` : ""}. La aspettiamo.`,
  phoneLabel: "Telefono",
  whereLabel: "Dove",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Scopra ${name}${city ? ` a ${city}` : ""}. Venga a trovarci.`,
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
  featureLocationTitle: "Onde nos encontra",
  featureLocationBodyWithCity: (city) => `Encontra-nos em ${city}.`,
  featureLocationBodyNoCity: "Fácil de encontrar.",
  visitHeading: "Venha visitar-nos",
  visitBody: ({ name, category, city }) =>
    `${name} é um nome a conhecer${category ? ` em ${category}` : " no bairro"}${city ? `, em ${city}` : ""}. Teremos todo o gosto em recebê-lo.`,
  phoneLabel: "Telefone",
  whereLabel: "Onde",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Conheça ${name}${city ? `, em ${city}` : ""}. Venha visitar-nos.`,
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
  featureLocationTitle: "Wo Sie uns finden",
  featureLocationBodyWithCity: (city) => `Sie finden uns in ${city}.`,
  featureLocationBodyNoCity: "Gut zu erreichen.",
  visitHeading: "Besuchen Sie uns",
  visitBody: ({ name, category, city }) =>
    `${name} ist ein Name, den man kennt${category ? ` in der Branche ${category}` : " im Viertel"}${city ? `, in ${city}` : ""}. Wir freuen uns auf Sie.`,
  phoneLabel: "Telefon",
  whereLabel: "Wo",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lernen Sie ${name}${city ? ` in ${city}` : ""} kennen. Besuchen Sie uns.`,
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
  featureLocationTitle: "Sådan finder du os",
  featureLocationBodyWithCity: (city) => `Du finder os i ${city}.`,
  featureLocationBodyNoCity: "Nemt at finde.",
  visitHeading: "Kom og besøg os",
  visitBody: ({ name, category, city }) =>
    `${name} er et navn, man kender${category ? ` inden for ${category}` : " i kvarteret"}${city ? `, i ${city}` : ""}. Vi tager gerne imod dig.`,
  phoneLabel: "Telefon",
  whereLabel: "Hvor",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Lær ${name}${city ? ` i ${city}` : ""} at kende. Kig gerne forbi.`,
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
  featureLocationTitle: "Où nous trouver",
  featureLocationBodyWithCity: (city) => `Vous nous trouvez à ${city}.`,
  // Chave de acessibilidade ("Easy to reach"), não de localização: "d'accès",
  // não "à trouver" — este último repetiria o verbo do título.
  featureLocationBodyNoCity: "Facile d'accès.",
  visitHeading: "Venez nous rendre visite",
  // `en ${category}`: a categoria vem crua do Places ("boulangerie"), e
  // "dans le secteur boulangerie" fica agramatical em francês.
  visitBody: ({ name, category, city }) =>
    `${name} est une adresse à connaître${category ? ` en ${category}` : " dans le quartier"}${city ? `, à ${city}` : ""}. Nous vous attendons.`,
  phoneLabel: "Téléphone",
  whereLabel: "Où",
  metaTitle: ({ name, city }) => (city ? `${name} · ${city}` : name),
  metaDescription: ({ name, city }) =>
    `Découvrez ${name}${city ? ` à ${city}` : ""}. Venez nous rendre visite.`,
};

export const DICTS: Record<Locale, PreviewDict> = { en, nl, sv, no, es, it, pt, de, da, fr };
