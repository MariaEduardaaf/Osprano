export type Locale = "en" | "nl" | "sv" | "no";

const LOCALE_BY_COUNTRY: Record<string, Locale> = {
  GB: "en",
  IE: "en",
  NL: "nl",
  SE: "sv",
  NO: "no",
};

export function localeForCountry(countryCode: string): Locale {
  return LOCALE_BY_COUNTRY[countryCode.toUpperCase()] ?? "en";
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
};

export const DICTS: Record<Locale, PreviewDict> = { en, nl, sv, no };
