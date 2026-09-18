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
/** Título curto e uma frase: os cartões de "valores" e os passos de "como funciona". */
export interface TemplateBlurb {
  title: string;
  body: string;
}

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
  // Adendo 2026-09-18. Os três valores são sobre POSTURA (atenção, acolhimento,
  // clareza), nunca sobre o produto: "ingredientes escolhidos" já seria fato
  // sobre o negócio alheio. Os três passos são o roteiro genérico (contacto,
  // combinar dia e hora, aproveitar), com o tom de cada modelo. Os títulos não
  // repetem o `about` padrão: sem dado, as duas seções ficam vizinhas.
  whyHeading: string; // título da seção de valores
  values: readonly [TemplateBlurb, TemplateBlurb, TemplateBlurb];
  howHeading: string; // "como funciona" (ofício: "como trabalhamos")
  steps: readonly [TemplateBlurb, TemplateBlurb, TemplateBlurb];
  mapTitle: string; // `title` do iframe do mapa (leitor de tela), ex. "Mapa"
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
  | "mapTitle"
>;
type TemplateOwn = Pick<
  TemplateDict,
  "tagline" | "about" | "itemsHeading" | "aboutHeading" | "visitHeading" | "whyHeading" | "values" | "howHeading" | "steps"
> &
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
    mapTitle: "Map",
  },
  {
    mesa: {
      tagline: "A table set with care",
      about:
        "We take care of every detail and welcome you the way we would at home. Come and see us.",
      itemsHeading: "From the menu",
      aboutHeading: "About us",
      visitHeading: "Where to find us",
      whyHeading: "What matters to us",
      values: [
        { title: "Attention to every detail", body: "From the way the table is set to the way you are welcomed, nothing is left to chance." },
        { title: "A place to feel at ease", body: "Come as you are and make yourself at home, for a quick bite or a long evening." },
        { title: "Close to you", body: "A familiar place, a warm welcome and time to enjoy it." },
      ],
      howHeading: "How it works",
      steps: [
        { title: "Get in touch", body: "Call or write to us and tell us when you would like to come." },
        { title: "Pick a day and time", body: "Tell us the day and time that suit you." },
        { title: "Sit down and enjoy", body: "Leave the rest to us." },
      ],
    },
    estudio: {
      tagline: "Your time, well spent",
      about:
        "A calm space, careful hands and attention to what you want. Book your visit and leave feeling like yourself again.",
      itemsHeading: "Services",
      aboutHeading: "About the studio",
      visitHeading: "Where to find us",
      whyHeading: "What we value",
      values: [
        { title: "Time for you", body: "No rush and no interruptions: your appointment is your moment." },
        { title: "Done with care", body: "We listen first and work with care, so you leave happy with the result." },
        { title: "Room to breathe", body: "Welcoming, unhurried and set up for you to relax." },
      ],
      howHeading: "How it works",
      steps: [
        { title: "Get in touch", body: "Message or call and tell us what you have in mind." },
        { title: "Choose your time", body: "We will find a day and time that work for you." },
        { title: "Enjoy your visit", body: "Arrive, settle in and leave feeling like yourself again." },
      ],
    },
    oficio: {
      tagline: "Work done right",
      about:
        "Clear answers, tidy work and respect for your time and your home. Tell us what you need and we will get back to you.",
      itemsHeading: "Services",
      aboutHeading: "How we work",
      visitHeading: "Where to find us",
      whyHeading: "What you can count on",
      values: [
        { title: "Clear from the start", body: "Plain words and no jargon, so you understand what we propose and why." },
        { title: "Respect for your home", body: "We work carefully and leave everything tidy when we are done." },
        { title: "No surprises", body: "What we agree is what we do, from the first call to the last check." },
      ],
      howHeading: "How we work",
      steps: [
        { title: "Tell us what you need", body: "Describe the job by phone or message and we will take it from there." },
        { title: "We agree on the details", body: "You get a clear picture of the work before anything starts." },
        { title: "We get it done", body: "Careful work, and we go over everything with you at the end." },
      ],
      galleryHeading: "Our work",
    },
    vitrine: {
      tagline: "Here for you",
      about:
        "Personal attention, honest advice and the care you would expect from people who know their trade. Get in touch or come and see us.",
      itemsHeading: "Highlights",
      aboutHeading: "About us",
      visitHeading: "Location and hours",
      whyHeading: "What to expect",
      values: [
        { title: "You come first", body: "You deal with people who know their trade and take the time to listen." },
        { title: "Straight answers", body: "We tell you what we would tell a friend." },
        { title: "Easy to reach", body: "Get in touch the way that suits you and we will get back to you." },
      ],
      howHeading: "How it works",
      steps: [
        { title: "Get in touch", body: "Call or write to us and tell us what you are looking for." },
        { title: "Arrange a visit", body: "We will set a time that suits you." },
        { title: "We take it from there", body: "Personal attention from the first contact to the last detail." },
      ],
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
    mapTitle: "Kaart",
  },
  {
    mesa: {
      tagline: "Een tafel met zorg gedekt",
      about:
        "We letten op elk detail en ontvangen u zoals we dat thuis zouden doen. Kom gerust langs.",
      itemsHeading: "Van de kaart",
      aboutHeading: "Over ons",
      visitHeading: "Waar u ons vindt",
      whyHeading: "Waar wij om geven",
      values: [
        { title: "Oog voor elk detail", body: "Van de gedekte tafel tot het welkom: niets wordt aan het toeval overgelaten." },
        { title: "Een plek om u thuis te voelen", body: "Kom zoals u bent en maak het uzelf gemakkelijk, voor een snelle hap of een lange avond." },
        { title: "Dicht bij u", body: "Een vertrouwde plek, een warm welkom en de tijd om ervan te genieten." },
      ],
      howHeading: "Zo werkt het",
      steps: [
        { title: "Neem contact op", body: "Bel of schrijf ons en laat weten wanneer u wilt komen." },
        { title: "Kies een dag en tijd", body: "Zeg ons welke dag en tijd u goed uitkomen." },
        { title: "Ga zitten en geniet", body: "De rest laat u aan ons over." },
      ],
    },
    estudio: {
      tagline: "Uw tijd, goed besteed",
      about:
        "Een rustige ruimte, zorgvuldige handen en aandacht voor wat u wilt. Boek uw bezoek en ga weer helemaal uzelf naar huis.",
      itemsHeading: "Diensten",
      aboutHeading: "Over de studio",
      visitHeading: "Waar u ons vindt",
      whyHeading: "Wat wij belangrijk vinden",
      values: [
        { title: "Tijd voor u", body: "Geen haast en geen onderbrekingen: uw afspraak is uw moment." },
        { title: "Met zorg gedaan", body: "We luisteren eerst en werken met aandacht, zodat u tevreden naar huis gaat." },
        { title: "Ruimte om op adem te komen", body: "Gastvrij, zonder haast en ingericht om u te laten ontspannen." },
      ],
      howHeading: "Zo werkt het",
      steps: [
        { title: "Neem contact op", body: "Stuur een bericht of bel en vertel ons wat u in gedachten heeft." },
        { title: "Kies uw moment", body: "We vinden samen een dag en tijd die u past." },
        { title: "Geniet van uw bezoek", body: "Kom binnen, neem plaats en ga weer helemaal uzelf naar huis." },
      ],
    },
    oficio: {
      tagline: "Werk dat goed gedaan is",
      about:
        "Duidelijke antwoorden, net werk en respect voor uw tijd en uw huis. Vertel ons wat u nodig heeft en we nemen contact met u op.",
      itemsHeading: "Diensten",
      aboutHeading: "Zo werken wij",
      visitHeading: "Waar u ons vindt",
      whyHeading: "Waar u op kunt rekenen",
      values: [
        { title: "Duidelijk vanaf het begin", body: "Gewone taal, geen jargon: u begrijpt wat we voorstellen en waarom." },
        { title: "Respect voor uw huis", body: "We werken zorgvuldig en laten alles netjes achter als we klaar zijn." },
        { title: "Geen verrassingen", body: "Wat we afspreken, doen we ook, van het eerste telefoontje tot de laatste controle." },
      ],
      howHeading: "Zo werken wij",
      steps: [
        { title: "Vertel ons wat u nodig heeft", body: "Beschrijf de klus per telefoon of bericht en wij pakken het op." },
        { title: "We stemmen de details af", body: "U krijgt een duidelijk beeld van het werk voordat er iets begint." },
        { title: "Wij voeren het uit", body: "Zorgvuldig werk, en aan het eind lopen we alles samen met u na." },
      ],
      galleryHeading: "Ons werk",
    },
    vitrine: {
      tagline: "Voor u klaar",
      about:
        "Persoonlijke aandacht, eerlijk advies en de zorg die u mag verwachten van mensen die hun vak verstaan. Neem contact op of kom langs.",
      itemsHeading: "Uitgelicht",
      aboutHeading: "Over ons",
      visitHeading: "Locatie en openingstijden",
      whyHeading: "Wat u kunt verwachten",
      values: [
        { title: "U staat voorop", body: "U heeft te maken met mensen die hun vak verstaan en de tijd nemen om te luisteren." },
        { title: "Eerlijke antwoorden", body: "We vertellen u wat we een vriend zouden vertellen." },
        { title: "Makkelijk bereikbaar", body: "Neem contact op zoals het u uitkomt en we komen bij u terug." },
      ],
      howHeading: "Zo werkt het",
      steps: [
        { title: "Neem contact op", body: "Bel of schrijf ons en vertel wat u zoekt." },
        { title: "Plan een bezoek", body: "We prikken een moment dat u uitkomt." },
        { title: "Wij nemen het over", body: "Persoonlijke aandacht van het eerste contact tot het laatste detail." },
      ],
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
    mapTitle: "Karta",
  },
  {
    mesa: {
      tagline: "Ett bord dukat med omsorg",
      about:
        "Vi bryr oss om varje detalj och tar emot dig som hemma. Kom gärna förbi.",
      itemsHeading: "Ur menyn",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit",
      whyHeading: "Det här bryr vi oss om",
      values: [
        { title: "Omsorg om varje detalj", body: "Från det dukade bordet till välkomnandet: inget lämnas åt slumpen." },
        { title: "En plats att trivas på", body: "Kom som du är och känn dig som hemma, för en snabb bit eller en lång kväll." },
        { title: "Nära dig", body: "En välbekant plats, ett varmt välkomnande och tid att njuta av det." },
      ],
      howHeading: "Så fungerar det",
      steps: [
        { title: "Hör av dig", body: "Ring eller skriv till oss och berätta när du vill komma." },
        { title: "Välj dag och tid", body: "Berätta vilken dag och tid som passar dig." },
        { title: "Slå dig ner och njut", body: "Resten sköter vi." },
      ],
    },
    estudio: {
      tagline: "Din tid, väl använd",
      about:
        "En lugn plats, varsamma händer och uppmärksamhet på vad du vill ha. Boka ditt besök och gå hem som dig själv igen.",
      itemsHeading: "Tjänster",
      aboutHeading: "Om studion",
      visitHeading: "Hitta hit",
      whyHeading: "Det här värdesätter vi",
      values: [
        { title: "Tid för dig", body: "Ingen stress och inga avbrott: din bokade tid är din stund." },
        { title: "Gjort med omsorg", body: "Vi lyssnar först och arbetar med omsorg, så att du går hem nöjd med resultatet." },
        { title: "Utrymme att andas", body: "Välkomnande, utan stress och inredd för att du ska kunna slappna av." },
      ],
      howHeading: "Så fungerar det",
      steps: [
        { title: "Hör av dig", body: "Skicka ett meddelande eller ring och berätta vad du har i tankarna." },
        { title: "Välj din tid", body: "Vi hittar en dag och en tid som passar dig." },
        { title: "Njut av besöket", body: "Kom in, slå dig ner och gå hem som dig själv igen." },
      ],
    },
    oficio: {
      tagline: "Arbete som blir rätt gjort",
      about:
        "Tydliga svar, snyggt utfört arbete och respekt för din tid och ditt hem. Berätta vad du behöver så hör vi av oss.",
      itemsHeading: "Tjänster",
      aboutHeading: "Så arbetar vi",
      visitHeading: "Hitta hit",
      whyHeading: "Det här kan du räkna med",
      values: [
        { title: "Tydligt från början", body: "Enkla ord och ingen fackjargong, så att du förstår vad vi föreslår och varför." },
        { title: "Respekt för ditt hem", body: "Vi arbetar noggrant och lämnar allt i ordning när vi är klara." },
        { title: "Inga överraskningar", body: "Det vi kommer överens om är det vi gör, från första samtalet till sista kontrollen." },
      ],
      howHeading: "Så arbetar vi",
      steps: [
        { title: "Berätta vad du behöver", body: "Beskriv jobbet per telefon eller meddelande så tar vi det därifrån." },
        { title: "Vi kommer överens om detaljerna", body: "Du får en tydlig bild av arbetet innan något påbörjas." },
        { title: "Vi utför jobbet", body: "Noggrant arbete, och på slutet går vi igenom allt tillsammans med dig." },
      ],
      galleryHeading: "Vårt arbete",
    },
    vitrine: {
      tagline: "Här för dig",
      about:
        "Personligt bemötande, ärliga råd och den omsorg du kan förvänta dig av människor som kan sitt hantverk. Hör av dig eller kom förbi.",
      itemsHeading: "I fokus",
      aboutHeading: "Om oss",
      visitHeading: "Hitta hit och öppettider",
      whyHeading: "Det här kan du förvänta dig",
      values: [
        { title: "Du kommer först", body: "Du har att göra med människor som kan sitt hantverk och tar sig tid att lyssna." },
        { title: "Raka svar", body: "Vi säger det vi skulle säga till en vän." },
        { title: "Lätt att nå", body: "Hör av dig på det sätt som passar dig så återkommer vi." },
      ],
      howHeading: "Så fungerar det",
      steps: [
        { title: "Hör av dig", body: "Ring eller skriv till oss och berätta vad du söker." },
        { title: "Boka ett besök", body: "Vi hittar en tid som passar dig." },
        { title: "Vi tar det därifrån", body: "Personligt bemötande från första kontakten till sista detaljen." },
      ],
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
    mapTitle: "Kart",
  },
  {
    mesa: {
      tagline: "Et bord dekket med omhu",
      about:
        "Vi tar vare på hver detalj og tar imot deg som hjemme. Kom gjerne innom.",
      itemsHeading: "Fra menyen",
      aboutHeading: "Om oss",
      visitHeading: "Her finner du oss",
      whyHeading: "Dette bryr vi oss om",
      values: [
        { title: "Omtanke for hver detalj", body: "Fra det dekkede bordet til velkomsten: ingenting overlates til tilfeldighetene." },
        { title: "Et sted å trives", body: "Kom som du er og føl deg som hjemme, for en rask matbit eller en lang kveld." },
        { title: "Nær deg", body: "Et kjent sted, en varm velkomst og tid til å nyte det." },
      ],
      howHeading: "Slik fungerer det",
      steps: [
        { title: "Ta kontakt", body: "Ring eller skriv til oss og fortell når du vil komme." },
        { title: "Velg dag og tid", body: "Fortell oss hvilken dag og tid som passer deg." },
        { title: "Sett deg ned og nyt", body: "Resten tar vi oss av." },
      ],
    },
    estudio: {
      tagline: "Din tid, godt brukt",
      about:
        "Et rolig sted, varsomme hender og oppmerksomhet på det du ønsker. Bestill ditt besøk og gå hjem som deg selv igjen.",
      itemsHeading: "Tjenester",
      aboutHeading: "Om studioet",
      visitHeading: "Her finner du oss",
      whyHeading: "Dette er viktig for oss",
      values: [
        { title: "Tid til deg", body: "Ingen stress og ingen avbrytelser: timen din er din stund." },
        { title: "Gjort med omhu", body: "Vi lytter først og jobber med omhu, så du går hjem fornøyd med resultatet." },
        { title: "Rom til å puste", body: "Imøtekommende, uten hastverk og innredet for at du skal kunne slappe av." },
      ],
      howHeading: "Slik fungerer det",
      steps: [
        { title: "Ta kontakt", body: "Send en melding eller ring og fortell hva du har i tankene." },
        { title: "Velg tidspunkt", body: "Vi finner en dag og et tidspunkt som passer deg." },
        { title: "Nyt besøket", body: "Kom inn, slå deg ned og gå hjem som deg selv igjen." },
      ],
    },
    oficio: {
      tagline: "Arbeid gjort riktig",
      about:
        "Klare svar, ryddig arbeid og respekt for tiden din og hjemmet ditt. Fortell oss hva du trenger, så tar vi kontakt.",
      itemsHeading: "Tjenester",
      aboutHeading: "Slik jobber vi",
      visitHeading: "Her finner du oss",
      whyHeading: "Dette kan du regne med",
      values: [
        { title: "Klart fra starten", body: "Enkle ord og ingen fagsjargong, så du forstår hva vi foreslår og hvorfor." },
        { title: "Respekt for hjemmet ditt", body: "Vi jobber nøye og etterlater alt ryddig når vi er ferdige." },
        { title: "Ingen overraskelser", body: "Det vi blir enige om, er det vi gjør, fra første samtale til siste sjekk." },
      ],
      howHeading: "Slik jobber vi",
      steps: [
        { title: "Fortell hva du trenger", body: "Beskriv jobben per telefon eller melding, så tar vi det derfra." },
        { title: "Vi blir enige om detaljene", body: "Du får et klart bilde av arbeidet før noe settes i gang." },
        { title: "Vi gjør jobben", body: "Nøye arbeid, og til slutt går vi gjennom alt sammen med deg." },
      ],
      galleryHeading: "Vårt arbeid",
    },
    vitrine: {
      tagline: "Her for deg",
      about:
        "Personlig oppfølging, ærlige råd og omsorgen du forventer av folk som kan faget sitt. Ta kontakt eller stikk innom.",
      itemsHeading: "Utvalgt",
      aboutHeading: "Om oss",
      visitHeading: "Adresse og åpningstider",
      whyHeading: "Dette kan du forvente",
      values: [
        { title: "Du kommer først", body: "Du har med folk å gjøre som kan faget sitt og tar seg tid til å lytte." },
        { title: "Ærlige svar", body: "Vi sier det vi ville sagt til en venn." },
        { title: "Lett å nå", body: "Ta kontakt slik det passer deg, så kommer vi tilbake til deg." },
      ],
      howHeading: "Slik fungerer det",
      steps: [
        { title: "Ta kontakt", body: "Ring eller skriv til oss og fortell hva du ser etter." },
        { title: "Avtal et besøk", body: "Vi finner et tidspunkt som passer deg." },
        { title: "Vi tar det derfra", body: "Personlig oppfølging fra første kontakt til siste detalj." },
      ],
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
    mapTitle: "Mapa",
  },
  {
    mesa: {
      tagline: "Una mesa puesta con cariño",
      about:
        "Cuidamos cada detalle y le recibimos como en casa. Venga a conocernos.",
      itemsHeading: "De la carta",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Dónde encontrarnos",
      whyHeading: "Lo que nos importa",
      values: [
        { title: "Atención a cada detalle", body: "De la mesa puesta al recibimiento: nada se deja al azar." },
        { title: "Un lugar para estar a gusto", body: "Venga como es y siéntase como en casa, para un bocado rápido o una velada larga." },
        { title: "Cerca de usted", body: "Un lugar familiar, un recibimiento cálido y tiempo para disfrutarlo." },
      ],
      howHeading: "Cómo funciona",
      steps: [
        { title: "Póngase en contacto", body: "Llámenos o escríbanos y díganos cuándo le gustaría venir." },
        { title: "Elija día y hora", body: "Díganos el día y la hora que le vienen bien." },
        { title: "Siéntese y disfrute", body: "Del resto nos encargamos nosotros." },
      ],
    },
    estudio: {
      tagline: "Su tiempo, bien aprovechado",
      about:
        "Un espacio tranquilo, manos cuidadosas y atención a lo que usted quiere. Reserve su visita y salga sintiéndose usted de nuevo.",
      itemsHeading: "Servicios",
      aboutHeading: "Sobre el estudio",
      visitHeading: "Dónde encontrarnos",
      whyHeading: "Lo que valoramos",
      values: [
        { title: "Tiempo para usted", body: "Sin prisas ni interrupciones: su cita es su momento." },
        { title: "Hecho con cuidado", body: "Primero escuchamos y luego trabajamos con cuidado, para que salga contento con el resultado." },
        { title: "Espacio para respirar", body: "Acogedor, sin prisas y pensado para que se relaje." },
      ],
      howHeading: "Cómo funciona",
      steps: [
        { title: "Póngase en contacto", body: "Escríbanos o llámenos y cuéntenos qué tiene en mente." },
        { title: "Elija su momento", body: "Buscamos un día y una hora que le vengan bien." },
        { title: "Disfrute de su visita", body: "Llegue, póngase cómodo y salga sintiéndose usted de nuevo." },
      ],
    },
    oficio: {
      tagline: "Trabajo bien hecho",
      about:
        "Respuestas claras, trabajo limpio y respeto por su tiempo y su casa. Cuéntenos qué necesita y le responderemos.",
      itemsHeading: "Servicios",
      aboutHeading: "Cómo trabajamos",
      visitHeading: "Dónde encontrarnos",
      whyHeading: "Con lo que puede contar",
      values: [
        { title: "Claridad de entrada", body: "Palabras claras y sin tecnicismos, para que entienda qué proponemos y por qué." },
        { title: "Respeto por su casa", body: "Trabajamos con cuidado y lo dejamos todo recogido al terminar." },
        { title: "Sin sorpresas", body: "Lo que acordamos es lo que hacemos, de la primera llamada a la última revisión." },
      ],
      howHeading: "Cómo trabajamos",
      steps: [
        { title: "Cuéntenos qué necesita", body: "Describa el trabajo por teléfono o mensaje y nosotros nos ocupamos." },
        { title: "Acordamos los detalles", body: "Tendrá una idea clara del trabajo antes de que empiece nada." },
        { title: "Lo hacemos", body: "Trabajo cuidadoso, y al final lo repasamos todo con usted." },
      ],
      galleryHeading: "Nuestro trabajo",
    },
    vitrine: {
      tagline: "Aquí para usted",
      about:
        "Atención personal, consejo honesto y el cuidado que espera de quien conoce su oficio. Escríbanos o venga a vernos.",
      itemsHeading: "Destacados",
      aboutHeading: "Sobre nosotros",
      visitHeading: "Ubicación y horario",
      whyHeading: "Qué esperar",
      values: [
        { title: "Usted es lo primero", body: "Trata con personas que conocen su oficio y se toman el tiempo de escuchar." },
        { title: "Respuestas sinceras", body: "Le decimos lo que le diríamos a un amigo." },
        { title: "Fácil de contactar", body: "Escríbanos como le resulte más cómodo y le responderemos." },
      ],
      howHeading: "Cómo funciona",
      steps: [
        { title: "Póngase en contacto", body: "Llámenos o escríbanos y cuéntenos qué busca." },
        { title: "Concierte una visita", body: "Buscamos una hora que le venga bien." },
        { title: "Nosotros nos ocupamos", body: "Atención personal del primer contacto al último detalle." },
      ],
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
    mapTitle: "Mappa",
  },
  {
    mesa: {
      tagline: "Una tavola apparecchiata con cura",
      about:
        "Curiamo ogni dettaglio e La accogliamo come a casa. Venga a trovarci.",
      itemsHeading: "Dal menù",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove trovarci",
      whyHeading: "Ciò che conta per noi",
      values: [
        { title: "Attenzione a ogni dettaglio", body: "Dalla tavola apparecchiata all'accoglienza: nulla è lasciato al caso." },
        { title: "Un posto in cui sentirsi a proprio agio", body: "Venga come è e si senta a casa, per un boccone veloce o una lunga serata." },
        { title: "Vicino a Lei", body: "Un posto familiare, un'accoglienza calorosa e il tempo per godersela." },
      ],
      howHeading: "Come funziona",
      steps: [
        { title: "Ci contatti", body: "Ci chiami o ci scriva e ci dica quando vorrebbe venire." },
        { title: "Scelga giorno e ora", body: "Ci indichi il giorno e l'ora che preferisce." },
        { title: "Si sieda e si goda il momento", body: "Al resto pensiamo noi." },
      ],
    },
    estudio: {
      tagline: "Il Suo tempo, speso bene",
      about:
        "Uno spazio tranquillo, mani attente e cura per ciò che desidera. Prenoti la Sua visita e torni a sentirsi al meglio.",
      itemsHeading: "Servizi",
      aboutHeading: "Lo studio",
      visitHeading: "Dove trovarci",
      whyHeading: "Ciò a cui teniamo",
      values: [
        { title: "Tempo per Lei", body: "Nessuna fretta e nessuna interruzione: il Suo appuntamento è il Suo momento." },
        { title: "Fatto con cura", body: "Prima ascoltiamo, poi lavoriamo con cura, perché esca soddisfatto del risultato." },
        { title: "Spazio per respirare", body: "Accogliente, senza fretta e pensato per farLa rilassare." },
      ],
      howHeading: "Come funziona",
      steps: [
        { title: "Ci contatti", body: "Ci scriva o ci chiami e ci racconti cosa ha in mente." },
        { title: "Scelga il Suo momento", body: "Troviamo insieme un giorno e un'ora che Le vadano bene." },
        { title: "Si goda la visita", body: "Arrivi, si metta comodo e torni a casa sentendosi di nuovo Lei." },
      ],
    },
    oficio: {
      tagline: "Lavoro fatto bene",
      about:
        "Risposte chiare, lavoro pulito e rispetto per il Suo tempo e la Sua casa. Ci dica di cosa ha bisogno e La ricontatteremo.",
      itemsHeading: "Servizi",
      aboutHeading: "Come lavoriamo",
      visitHeading: "Dove trovarci",
      whyHeading: "Su cosa può contare",
      values: [
        { title: "Chiarezza fin dall'inizio", body: "Parole semplici e niente gergo tecnico, perché capisca cosa proponiamo e perché." },
        { title: "Rispetto per la Sua casa", body: "Lavoriamo con cura e lasciamo tutto in ordine quando abbiamo finito." },
        { title: "Nessuna sorpresa", body: "Quello che concordiamo è quello che facciamo, dalla prima chiamata all'ultimo controllo." },
      ],
      howHeading: "Come lavoriamo",
      steps: [
        { title: "Ci dica di cosa ha bisogno", body: "Descriva il lavoro per telefono o messaggio e ce ne occupiamo noi." },
        { title: "Concordiamo i dettagli", body: "Avrà un quadro chiaro del lavoro prima che inizi qualsiasi cosa." },
        { title: "Lo realizziamo", body: "Lavoro accurato, e alla fine ripassiamo tutto insieme a Lei." },
      ],
      galleryHeading: "I nostri lavori",
    },
    vitrine: {
      tagline: "Qui per Lei",
      about:
        "Attenzione personale, consigli onesti e la cura che si aspetta da chi conosce il proprio mestiere. Ci contatti o venga a trovarci.",
      itemsHeading: "In evidenza",
      aboutHeading: "Chi siamo",
      visitHeading: "Dove siamo e orari",
      whyHeading: "Cosa aspettarsi",
      values: [
        { title: "Lei viene prima di tutto", body: "Ha a che fare con persone che conoscono il proprio mestiere e si prendono il tempo di ascoltare." },
        { title: "Risposte sincere", body: "Le diciamo quello che diremmo a un amico." },
        { title: "Facile da contattare", body: "Ci contatti nel modo che preferisce e Le risponderemo." },
      ],
      howHeading: "Come funziona",
      steps: [
        { title: "Ci contatti", body: "Ci chiami o ci scriva e ci racconti cosa cerca." },
        { title: "Fissi una visita", body: "Troviamo un momento che Le vada bene." },
        { title: "Al resto pensiamo noi", body: "Attenzione personale dal primo contatto all'ultimo dettaglio." },
      ],
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
    mapTitle: "Mapa",
  },
  {
    mesa: {
      tagline: "Uma mesa posta com cuidado",
      about:
        "Fazemos tudo com atenção a cada detalhe e recebemo-lo como em casa. Venha conhecer-nos.",
      itemsHeading: "Da ementa",
      aboutHeading: "Sobre nós",
      visitHeading: "Onde estamos",
      whyHeading: "O que nos importa",
      values: [
        { title: "Atenção a cada detalhe", body: "Da mesa posta à forma como o recebemos: nada fica ao acaso." },
        { title: "Um lugar para ficar à vontade", body: "Venha como é e sinta-se em casa, para uma refeição rápida ou um serão demorado." },
        { title: "Perto de si", body: "Um lugar familiar, um acolhimento caloroso e tempo para aproveitar." },
      ],
      howHeading: "Como funciona",
      steps: [
        { title: "Entre em contacto", body: "Ligue-nos ou escreva-nos e diga-nos quando gostaria de vir." },
        { title: "Escolha o dia e a hora", body: "Diga-nos o dia e a hora que lhe dão jeito." },
        { title: "Sente-se e aproveite", body: "Do resto tratamos nós." },
      ],
    },
    estudio: {
      tagline: "O seu tempo, bem passado",
      about:
        "Um espaço tranquilo, mãos cuidadosas e atenção ao que pretende. Marque a sua visita e saia a sentir-se de novo como gosta.",
      itemsHeading: "Serviços",
      aboutHeading: "O estúdio",
      visitHeading: "Onde estamos",
      whyHeading: "O que valorizamos",
      values: [
        { title: "Tempo para si", body: "Sem pressas nem interrupções: a sua marcação é o seu momento." },
        { title: "Feito com cuidado", body: "Primeiro ouvimos, depois trabalhamos com cuidado, para que saia satisfeito com o resultado." },
        { title: "Espaço para respirar", body: "Acolhedor, sem pressa e pensado para que possa relaxar." },
      ],
      howHeading: "Como funciona",
      steps: [
        { title: "Entre em contacto", body: "Escreva-nos ou ligue-nos e conte-nos o que tem em mente." },
        { title: "Escolha o seu momento", body: "Encontramos um dia e uma hora que lhe convenham." },
        { title: "Aproveite a visita", body: "Chegue, instale-se e saia a sentir-se de novo como gosta." },
      ],
    },
    oficio: {
      tagline: "Trabalho bem feito",
      about:
        "Respostas claras, trabalho limpo e respeito pelo seu tempo e pela sua casa. Diga-nos do que precisa e entraremos em contacto.",
      itemsHeading: "Serviços",
      aboutHeading: "Como trabalhamos",
      visitHeading: "Onde estamos",
      whyHeading: "Com o que pode contar",
      values: [
        { title: "Clareza logo à partida", body: "Palavras simples e sem jargão, para que perceba o que propomos e porquê." },
        { title: "Respeito pela sua casa", body: "Trabalhamos com cuidado e deixamos tudo arrumado quando terminamos." },
        { title: "Sem surpresas", body: "O que combinamos é o que fazemos, da primeira chamada à última verificação." },
      ],
      howHeading: "Como trabalhamos",
      steps: [
        { title: "Diga-nos do que precisa", body: "Descreva o trabalho por telefone ou mensagem e nós tratamos do resto." },
        { title: "Combinamos os detalhes", body: "Fica com uma ideia clara do trabalho antes de qualquer coisa começar." },
        { title: "Fazemos o trabalho", body: "Trabalho cuidadoso e, no fim, revemos tudo consigo." },
      ],
      galleryHeading: "O nosso trabalho",
    },
    vitrine: {
      tagline: "Aqui para si",
      about:
        "Atenção pessoal, conselhos honestos e o cuidado que espera de quem conhece o seu ofício. Contacte-nos ou venha visitar-nos.",
      itemsHeading: "Destaques",
      aboutHeading: "Sobre nós",
      visitHeading: "Localização e horário",
      whyHeading: "O que pode esperar",
      values: [
        { title: "Atenção a quem nos procura", body: "Lida com pessoas que conhecem o seu ofício e têm tempo para ouvir." },
        { title: "Respostas sinceras", body: "Dizemos-lhe o que diríamos a um amigo." },
        { title: "Fácil de contactar", body: "Contacte-nos da forma que lhe for mais cómoda e responderemos." },
      ],
      howHeading: "Como funciona",
      steps: [
        { title: "Entre em contacto", body: "Ligue-nos ou escreva-nos e conte-nos o que procura." },
        { title: "Marque uma visita", body: "Encontramos uma hora que lhe dê jeito." },
        { title: "Nós tratamos do resto", body: "Atenção pessoal do primeiro contacto ao último detalhe." },
      ],
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
    mapTitle: "Karte",
  },
  {
    mesa: {
      tagline: "Ein Tisch, mit Sorgfalt gedeckt",
      about:
        "Wir achten auf jedes Detail und empfangen Sie wie zu Hause. Schauen Sie vorbei.",
      itemsHeading: "Aus der Karte",
      aboutHeading: "Über uns",
      visitHeading: "So finden Sie uns",
      whyHeading: "Was uns wichtig ist",
      values: [
        { title: "Liebe zum Detail", body: "Vom gedeckten Tisch bis zum Empfang: nichts bleibt dem Zufall überlassen." },
        { title: "Ein Ort zum Wohlfühlen", body: "Kommen Sie, wie Sie sind, und fühlen Sie sich wie zu Hause, für einen kurzen Bissen oder einen langen Abend." },
        { title: "Nah bei Ihnen", body: "Ein vertrauter Ort, ein warmer Empfang und Zeit, es zu genießen." },
      ],
      howHeading: "So funktioniert es",
      steps: [
        { title: "Melden Sie sich", body: "Rufen Sie an oder schreiben Sie uns, wann Sie kommen möchten." },
        { title: "Tag und Zeit wählen", body: "Sagen Sie uns, welcher Tag und welche Zeit Ihnen passen." },
        { title: "Platz nehmen und genießen", body: "Um den Rest kümmern wir uns." },
      ],
    },
    estudio: {
      tagline: "Ihre Zeit, gut verbracht",
      about:
        "Ein ruhiger Ort, sorgfältige Hände und ein offenes Ohr für Ihre Wünsche. Buchen Sie Ihren Besuch und gehen Sie wieder ganz als Sie selbst nach Hause.",
      itemsHeading: "Leistungen",
      aboutHeading: "Das Studio",
      visitHeading: "So finden Sie uns",
      whyHeading: "Was uns ausmacht",
      values: [
        { title: "Zeit für Sie", body: "Keine Eile und keine Unterbrechungen: Ihr Termin ist Ihr Moment." },
        { title: "Mit Sorgfalt gemacht", body: "Wir hören erst zu und arbeiten dann mit Sorgfalt, damit Sie zufrieden nach Hause gehen." },
        { title: "Raum zum Durchatmen", body: "Einladend, ohne Hektik und so eingerichtet, dass Sie entspannen können." },
      ],
      howHeading: "So funktioniert es",
      steps: [
        { title: "Melden Sie sich", body: "Schreiben Sie uns oder rufen Sie an und sagen Sie uns, was Sie sich vorstellen." },
        { title: "Wählen Sie Ihren Termin", body: "Wir finden einen Tag und eine Zeit, die Ihnen passen." },
        { title: "Genießen Sie Ihren Besuch", body: "Kommen Sie an, machen Sie es sich bequem und gehen Sie wieder ganz als Sie selbst nach Hause." },
      ],
    },
    oficio: {
      tagline: "Arbeit, die richtig gemacht ist",
      about:
        "Klare Antworten, saubere Arbeit und Respekt vor Ihrer Zeit und Ihrem Zuhause. Sagen Sie uns, was Sie brauchen, und wir melden uns bei Ihnen.",
      itemsHeading: "Leistungen",
      aboutHeading: "So arbeiten wir",
      visitHeading: "So finden Sie uns",
      whyHeading: "Worauf Sie sich verlassen können",
      values: [
        { title: "Klar von Anfang an", body: "Einfache Worte und kein Fachjargon, damit Sie verstehen, was wir vorschlagen und warum." },
        { title: "Respekt vor Ihrem Zuhause", body: "Wir arbeiten sorgfältig und hinterlassen alles ordentlich, wenn wir fertig sind." },
        { title: "Keine Überraschungen", body: "Was wir vereinbaren, machen wir auch, vom ersten Anruf bis zur letzten Kontrolle." },
      ],
      howHeading: "So arbeiten wir",
      steps: [
        { title: "Sagen Sie uns, was Sie brauchen", body: "Beschreiben Sie die Arbeit per Telefon oder Nachricht, wir kümmern uns darum." },
        { title: "Wir klären die Details", body: "Sie bekommen ein klares Bild von der Arbeit, bevor etwas beginnt." },
        { title: "Wir erledigen es", body: "Sorgfältige Arbeit, und am Ende gehen wir alles gemeinsam mit Ihnen durch." },
      ],
      galleryHeading: "Unsere Arbeit",
    },
    vitrine: {
      tagline: "Für Sie da",
      about:
        "Persönliche Betreuung, ehrliche Beratung und die Sorgfalt, die Sie von Menschen erwarten, die ihr Handwerk verstehen. Melden Sie sich oder schauen Sie vorbei.",
      itemsHeading: "Highlights",
      aboutHeading: "Über uns",
      visitHeading: "Standort und Öffnungszeiten",
      whyHeading: "Was Sie erwartet",
      values: [
        { title: "Sie stehen im Mittelpunkt", body: "Sie haben es mit Menschen zu tun, die ihr Handwerk verstehen und sich Zeit nehmen zuzuhören." },
        { title: "Ehrliche Antworten", body: "Wir sagen Ihnen, was wir einem Freund sagen würden." },
        { title: "Leicht zu erreichen", body: "Melden Sie sich, wie es Ihnen passt, und wir kommen auf Sie zurück." },
      ],
      howHeading: "So funktioniert es",
      steps: [
        { title: "Melden Sie sich", body: "Rufen Sie an oder schreiben Sie uns und sagen Sie uns, was Sie suchen." },
        { title: "Vereinbaren Sie einen Besuch", body: "Wir finden eine Zeit, die Ihnen passt." },
        { title: "Wir übernehmen den Rest", body: "Persönliche Betreuung vom ersten Kontakt bis zum letzten Detail." },
      ],
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
    mapTitle: "Kort",
  },
  {
    mesa: {
      tagline: "Et bord dækket med omhu",
      about:
        "Vi går op i hver detalje og tager imod dig som derhjemme. Kig gerne forbi.",
      itemsHeading: "Fra menuen",
      aboutHeading: "Om os",
      visitHeading: "Her finder du os",
      whyHeading: "Det går vi op i",
      values: [
        { title: "Sans for hver detalje", body: "Fra det dækkede bord til velkomsten: intet overlades til tilfældighederne." },
        { title: "Et sted at føle sig hjemme", body: "Kom som du er og føl dig hjemme, til en hurtig bid eller en lang aften." },
        { title: "Tæt på dig", body: "Et velkendt sted, en varm velkomst og tid til at nyde det." },
      ],
      howHeading: "Sådan fungerer det",
      steps: [
        { title: "Kontakt os", body: "Ring eller skriv til os og fortæl, hvornår du gerne vil komme." },
        { title: "Vælg dag og tidspunkt", body: "Fortæl os, hvilken dag og hvilket tidspunkt der passer dig." },
        { title: "Sæt dig ned og nyd det", body: "Resten tager vi os af." },
      ],
    },
    estudio: {
      tagline: "Din tid, godt brugt",
      about:
        "Et roligt sted, omhyggelige hænder og opmærksomhed på det, du ønsker. Book dit besøg og gå hjem som dig selv igen.",
      itemsHeading: "Ydelser",
      aboutHeading: "Om studiet",
      visitHeading: "Her finder du os",
      whyHeading: "Det lægger vi vægt på",
      values: [
        { title: "Tid til dig", body: "Ingen hast og ingen afbrydelser: din aftale er dit øjeblik." },
        { title: "Gjort med omhu", body: "Vi lytter først og arbejder med omhu, så du går hjem tilfreds med resultatet." },
        { title: "Plads til at trække vejret", body: "Imødekommende, uden hastværk og indrettet, så du kan slappe af." },
      ],
      howHeading: "Sådan fungerer det",
      steps: [
        { title: "Kontakt os", body: "Send en besked eller ring og fortæl, hvad du har i tankerne." },
        { title: "Vælg dit tidspunkt", body: "Vi finder en dag og et tidspunkt, der passer dig." },
        { title: "Nyd besøget", body: "Kom ind, sæt dig til rette og gå hjem som dig selv igen." },
      ],
    },
    oficio: {
      tagline: "Arbejde gjort ordentligt",
      about:
        "Klare svar, pænt arbejde og respekt for din tid og dit hjem. Fortæl os, hvad du har brug for, så vender vi tilbage.",
      itemsHeading: "Ydelser",
      aboutHeading: "Sådan arbejder vi",
      visitHeading: "Her finder du os",
      whyHeading: "Det kan du regne med",
      values: [
        { title: "Klart fra starten", body: "Almindelige ord og ingen fagsprog, så du forstår, hvad vi foreslår og hvorfor." },
        { title: "Respekt for dit hjem", body: "Vi arbejder omhyggeligt og efterlader alt ryddeligt, når vi er færdige." },
        { title: "Ingen overraskelser", body: "Det, vi aftaler, er det, vi gør, fra første opkald til sidste tjek." },
      ],
      howHeading: "Sådan arbejder vi",
      steps: [
        { title: "Fortæl, hvad du har brug for", body: "Beskriv opgaven pr. telefon eller besked, så tager vi den derfra." },
        { title: "Vi aftaler detaljerne", body: "Du får et klart billede af arbejdet, før noget går i gang." },
        { title: "Vi udfører opgaven", body: "Omhyggeligt arbejde, og til sidst gennemgår vi det hele sammen med dig." },
      ],
      galleryHeading: "Vores arbejde",
    },
    vitrine: {
      tagline: "Her for dig",
      about:
        "Personlig betjening, ærlig rådgivning og den omhu, du forventer af folk, der kender deres fag. Kontakt os eller kig forbi.",
      itemsHeading: "Udvalgt",
      aboutHeading: "Om os",
      visitHeading: "Adresse og åbningstider",
      whyHeading: "Det kan du forvente",
      values: [
        { title: "Du kommer først", body: "Du har med folk at gøre, der kender deres fag og tager sig tid til at lytte." },
        { title: "Ærlige svar", body: "Vi siger det, vi ville sige til en ven." },
        { title: "Nem at få fat på", body: "Kontakt os, som det passer dig, så vender vi tilbage." },
      ],
      howHeading: "Sådan fungerer det",
      steps: [
        { title: "Kontakt os", body: "Ring eller skriv til os og fortæl, hvad du leder efter." },
        { title: "Aftal et besøg", body: "Vi finder et tidspunkt, der passer dig." },
        { title: "Vi tager den derfra", body: "Personlig betjening fra første kontakt til sidste detalje." },
      ],
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
    mapTitle: "Carte",
  },
  {
    mesa: {
      tagline: "Une table dressée avec soin",
      about:
        "Nous soignons chaque détail et vous accueillons comme à la maison. Venez nous voir.",
      itemsHeading: "À la carte",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Où nous trouver",
      whyHeading: "Ce qui compte pour nous",
      values: [
        { title: "Le souci du détail", body: "De la table dressée à l'accueil, rien n'est laissé au hasard." },
        { title: "Un lieu où l'on se sent bien", body: "Venez comme vous êtes et faites comme chez vous, pour une bouchée rapide ou une longue soirée." },
        { title: "Près de vous", body: "Un lieu familier, un accueil chaleureux et le temps d'en profiter." },
      ],
      howHeading: "Comment ça marche",
      steps: [
        { title: "Contactez-nous", body: "Appelez-nous ou écrivez-nous et dites-nous quand vous souhaitez venir." },
        { title: "Choisissez le jour et l'heure", body: "Indiquez-nous le jour et l'heure qui vous conviennent." },
        { title: "Installez-vous et profitez", body: "Nous nous occupons du reste." },
      ],
    },
    estudio: {
      tagline: "Votre temps, bien employé",
      about:
        "Un lieu calme, des mains soigneuses et une attention à ce que vous souhaitez. Réservez votre visite et repartez en vous sentant vous-même.",
      itemsHeading: "Prestations",
      aboutHeading: "Le studio",
      visitHeading: "Où nous trouver",
      whyHeading: "Ce à quoi nous tenons",
      values: [
        { title: "Du temps pour vous", body: "Pas de précipitation ni d'interruption, votre rendez-vous est votre moment." },
        { title: "Fait avec soin", body: "Nous écoutons d'abord, puis nous travaillons avec soin, pour que vous repartiez satisfait du résultat." },
        { title: "De l'espace pour respirer", body: "Accueillant, sans hâte et pensé pour que vous puissiez vous détendre." },
      ],
      howHeading: "Comment ça marche",
      steps: [
        { title: "Contactez-nous", body: "Écrivez-nous ou appelez-nous et dites-nous ce que vous avez en tête." },
        { title: "Choisissez votre moment", body: "Nous trouvons un jour et une heure qui vous conviennent." },
        { title: "Profitez de votre visite", body: "Arrivez, installez-vous et repartez en vous sentant vous-même." },
      ],
    },
    oficio: {
      tagline: "Du travail bien fait",
      about:
        "Des réponses claires, un travail propre et le respect de votre temps et de votre maison. Dites-nous ce dont vous avez besoin et nous vous recontacterons.",
      itemsHeading: "Prestations",
      aboutHeading: "Notre façon de travailler",
      visitHeading: "Où nous trouver",
      whyHeading: "Ce sur quoi vous pouvez compter",
      values: [
        { title: "Clair dès le départ", body: "Des mots simples et pas de jargon, pour que vous compreniez ce que nous proposons et pourquoi." },
        { title: "Le respect de votre maison", body: "Nous travaillons avec soin et laissons tout en ordre une fois le travail terminé." },
        { title: "Pas de surprise", body: "Ce que nous convenons est ce que nous faisons, du premier appel à la dernière vérification." },
      ],
      howHeading: "Notre façon de travailler",
      steps: [
        { title: "Dites-nous ce dont vous avez besoin", body: "Décrivez le travail par téléphone ou par message et nous nous en occupons." },
        { title: "Nous convenons des détails", body: "Vous avez une idée claire du travail avant que quoi que ce soit ne commence." },
        { title: "Nous le réalisons", body: "Un travail soigné, et à la fin nous passons tout en revue avec vous." },
      ],
      galleryHeading: "Nos réalisations",
    },
    vitrine: {
      tagline: "À votre écoute",
      about:
        "Une attention personnelle, des conseils honnêtes et le soin que vous attendez de personnes qui connaissent leur métier. Contactez-nous ou passez nous voir.",
      itemsHeading: "À la une",
      aboutHeading: "Qui sommes-nous",
      visitHeading: "Adresse et horaires",
      whyHeading: "Ce qui vous attend",
      values: [
        { title: "Vous d'abord", body: "Vous avez affaire à des personnes qui connaissent leur métier et prennent le temps d'écouter." },
        { title: "Des réponses franches", body: "Nous vous disons ce que nous dirions à un ami." },
        { title: "Facile à joindre", body: "Contactez-nous comme vous le souhaitez et nous vous répondrons." },
      ],
      howHeading: "Comment ça marche",
      steps: [
        { title: "Contactez-nous", body: "Appelez-nous ou écrivez-nous et dites-nous ce que vous cherchez." },
        { title: "Convenez d'une visite", body: "Nous trouvons un moment qui vous convient." },
        { title: "Nous nous occupons du reste", body: "Une attention personnelle du premier contact au dernier détail." },
      ],
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
