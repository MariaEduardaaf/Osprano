/**
 * Pure compliance copy — no Convex/server imports, safe to unit test directly.
 */

/**
 * Valor de `LANG.PT` (convex/lib/outreachAi.ts), repetido aqui para este módulo
 * continuar puro (sem importar nada do outreach) e testável direto. A paridade
 * LANG ↔ copy é travada por teste — um typo aqui derruba a suíte, não o prospect.
 * Português EUROPEU: o prospect de Lisboa não lê pt-BR.
 */
const PT_PT = "European Portuguese (pt-PT)";

/** pt-PT: tratamento formal (3.ª pessoa), "e-mails", "subscrição" — não "inscrição". */
const footerPtPt = (s: string, url: string) =>
  `\n\n—\nEnviado por ${s}. Já não pretende receber os nossos e-mails? Cancelar a subscrição: ${url}`;

/** Rodapé de opt-out injetado por código (COMP-03). Copy honesta, sem hype. */
const FOOTER_COPY: Record<string, (sender: string, url: string) => string> = {
  English: (s, url) => `\n\n—\nSent by ${s}. Don't want to hear from us again? Unsubscribe: ${url}`,
  Dutch: (s, url) => `\n\n—\nVerzonden door ${s}. Wilt u niets meer van ons ontvangen? Afmelden: ${url}`,
  Swedish: (s, url) => `\n\n—\nSkickat av ${s}. Vill du inte höra från oss igen? Avregistrera dig: ${url}`,
  Norwegian: (s, url) => `\n\n—\nSendt av ${s}. Vil du ikke høre fra oss igjen? Meld deg av: ${url}`,
  // OPTIN-04: mercados opt-in — o email destravado por consentimento sai no idioma do mercado.
  // ES/IT em tratamento formal (usted / Lei): é B2B, e tutear o dono do negócio destoa.
  Spanish: (s, url) =>
    `\n\n—\nEnviado por ${s}. ¿Prefiere no recibir más correos nuestros? Darse de baja: ${url}`,
  // "Per annullare" (infinitivo), não "Annulla" (imperativo de TU): a primeira
  // frase trata por Lei ("Non desidera"), e o imperativo informal quebrava a forma.
  Italian: (s, url) =>
    `\n\n—\nInviato da ${s}. Non desidera più ricevere le nostre email? Per annullare l'iscrizione: ${url}`,
  [PT_PT]: footerPtPt,
  // Alias defensivo: quem passar o nome simples do idioma recebe pt-PT, nunca o inglês.
  Portuguese: footerPtPt,
  German: (s, url) => `\n\n—\nGesendet von ${s}. Möchten Sie nichts mehr von uns hören? Abmelden: ${url}`,
  Danish: (s, url) => `\n\n—\nSendt af ${s}. Vil du ikke høre fra os igen? Afmeld dig: ${url}`,
  // Suíça francófona (langForLead, convex/lib/outreachAi.ts): o prospect de Genebra lê
  // francês, não alemão. Vouvoiement, como ES/IT — é B2B.
  // `\u00A0` = espaço INSECÁVEL, exigido em francês antes de `?` `!` `:` `;`.
  // Fica como escape de propósito, para ninguém "consertar" achando que é espaço
  // duplo: este rodapé sai em email de TEXTO PURO, e com espaço normal a quebra
  // automática joga o `?` sozinho para o começo da linha seguinte.
  French: (s, url) =>
    `\n\n—\nEnvoyé par ${s}. Vous ne souhaitez plus recevoir nos e-mails\u00A0? Se désabonner\u00A0: ${url}`,
};

export function optOutFooter(lang: string, unsubscribeUrl: string, senderIdentity: string): string {
  const build = FOOTER_COPY[lang] ?? FOOTER_COPY.English;
  return build(senderIdentity, unsubscribeUrl);
}

interface UnsubscribePageCopy {
  /** Valor do atributo `lang` do <html> — tag BCP-47, não o nome do idioma. */
  htmlLang: string;
  title: string;
  heading: string;
  body: string;
}

/**
 * Página de confirmação do unsubscribe (COMP-02): o FIM do caminho de opt-out.
 * Mora aqui, ao lado do FOOTER_COPY, porque é a mesma fonte de verdade de idioma —
 * quem clica em "Afmeld dig" não pode aterrissar numa página em inglês.
 * Chaveada pelos MESMOS valores de LANG usados no rodapé (paridade testada).
 */
const UNSUBSCRIBE_PAGE_COPY: Record<string, UnsubscribePageCopy> = {
  English: {
    htmlLang: "en",
    title: "Unsubscribed",
    heading: "You've been unsubscribed",
    body: "You won't hear from us again.",
  },
  Dutch: {
    htmlLang: "nl",
    title: "Afgemeld",
    heading: "U bent afgemeld",
    body: "U hoort niets meer van ons.",
  },
  Swedish: {
    htmlLang: "sv",
    title: "Avregistrerad",
    heading: "Du är avregistrerad",
    body: "Du kommer inte att höra från oss igen.",
  },
  Norwegian: {
    htmlLang: "nb",
    title: "Avmeldt",
    heading: "Du er meldt av",
    body: "Du vil ikke høre fra oss igjen.",
  },
  Spanish: {
    htmlLang: "es",
    title: "Baja confirmada",
    heading: "Se ha dado de baja",
    body: "No volverá a recibir correos nuestros.",
  },
  Italian: {
    htmlLang: "it",
    title: "Iscrizione annullata",
    heading: "La sua iscrizione è stata annullata",
    body: "Non riceverà più nostre email.",
  },
  [PT_PT]: {
    htmlLang: "pt-PT",
    title: "Subscrição cancelada",
    heading: "A sua subscrição foi cancelada",
    body: "Não voltará a receber os nossos e-mails.",
  },
  Portuguese: {
    htmlLang: "pt-PT",
    title: "Subscrição cancelada",
    heading: "A sua subscrição foi cancelada",
    body: "Não voltará a receber os nossos e-mails.",
  },
  German: {
    htmlLang: "de",
    title: "Abgemeldet",
    heading: "Sie wurden abgemeldet",
    body: "Sie erhalten keine weiteren E-Mails von uns.",
  },
  Danish: {
    htmlLang: "da",
    title: "Afmeldt",
    heading: "Du er afmeldt",
    body: "Du hører ikke fra os igen.",
  },
  // Suíça francófona: quem clicou em "Se désabonner" aterrissa em francês.
  // Formulação sem marca de gênero ("désabonné(e)") de propósito. Se algum dia
  // esta copy ganhar `?` `!` `:` `;`, vale a mesma regra do rodapé French acima:
  // espaço insecável (`\u00A0`) antes da pontuação, nunca espaço normal.
  French: {
    htmlLang: "fr",
    title: "Désabonnement confirmé",
    heading: "Votre désabonnement est confirmé",
    body: "Vous ne recevrez plus d'e-mails de notre part.",
  },
};

/**
 * HTML da página de confirmação, no idioma do prospect. Mesma estrutura e mesmo
 * status para qualquer entrada: só o idioma varia (inglês quando o token não
 * resolve um lead). Só interpola constantes — nada vindo do request.
 */
export function unsubscribePageHtml(lang: string): string {
  const c = UNSUBSCRIBE_PAGE_COPY[lang] ?? UNSUBSCRIBE_PAGE_COPY.English;
  return (
    `<!doctype html><html lang="${c.htmlLang}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${c.title}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#0f172a">` +
    `<h1 style="font-size:1.5rem">${c.heading}</h1>` +
    `<p style="color:#475569">${c.body}</p></body></html>`
  );
}

/** "Quem enviou" para o rodapé. RESEND_FROM é "Nome <email>" ou email cru. */
export function senderIdentityFrom(resendFrom: string): string {
  const trimmed = resendFrom.trim();
  const m = trimmed.match(/^(.+?)\s*<.+>$/);
  return (m ? m[1] : trimmed).trim();
}
