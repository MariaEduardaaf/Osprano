/**
 * Pure compliance copy — no Convex/server imports, safe to unit test directly.
 */

/** Rodapé de opt-out injetado por código (COMP-03). Copy honesta, sem hype. */
const FOOTER_COPY: Record<string, (sender: string, url: string) => string> = {
  English: (s, url) => `\n\n—\nSent by ${s}. Don't want to hear from us again? Unsubscribe: ${url}`,
  Dutch: (s, url) => `\n\n—\nVerzonden door ${s}. Wilt u niets meer van ons ontvangen? Afmelden: ${url}`,
  Swedish: (s, url) => `\n\n—\nSkickat av ${s}. Vill du inte höra från oss igen? Avregistrera dig: ${url}`,
  Norwegian: (s, url) => `\n\n—\nSendt av ${s}. Vil du ikke høre fra oss igjen? Meld deg av: ${url}`,
};

export function optOutFooter(lang: string, unsubscribeUrl: string, senderIdentity: string): string {
  const build = FOOTER_COPY[lang] ?? FOOTER_COPY.English;
  return build(senderIdentity, unsubscribeUrl);
}

/** "Quem enviou" para o rodapé. RESEND_FROM é "Nome <email>" ou email cru. */
export function senderIdentityFrom(resendFrom: string): string {
  const trimmed = resendFrom.trim();
  const m = trimmed.match(/^(.+?)\s*<.+>$/);
  return (m ? m[1] : trimmed).trim();
}
