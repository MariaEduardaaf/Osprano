/**
 * Links para abrir o e-mail já escrito no webmail ou app padrão do cliente (SEND-02).
 * Puro, sem imports. Não usar a API de parâmetros de URL do navegador: ela troca
 * espaço por "+", que o Outlook mostra literal; por isso encodeURIComponent à mão.
 */
// ponytail: limite único de 6000 sem medição por navegador (não há limite conhecido e confiável por cliente); o checkpoint 13-06 registra o tamanho real de um e-mail ES/DE; ajustar se aparecer caso real
export const COMPOSE_URL_MAX = 6000;

export interface ComposeLinks {
  gmail: string | null;
  outlook: string | null;
  mailto: string | null;
}

const enc = encodeURIComponent;

export function composeLinks(m: { to: string; subject: string; body: string }): ComposeLinks {
  // Link longo demais vira null: a UI oferece Copiar com aviso (13-CONTEXT).
  const cap = (url: string) => (url.length > COMPOSE_URL_MAX ? null : url);
  return {
    gmail: cap(`https://mail.google.com/mail/?view=cm&fs=1&to=${enc(m.to)}&su=${enc(m.subject)}&body=${enc(m.body)}`),
    outlook: cap(
      `https://outlook.office.com/mail/deeplink/compose?to=${enc(m.to)}&subject=${enc(m.subject)}&body=${enc(m.body)}`,
    ),
    // RFC 6068: quebras de linha CRLF, "@" do destinatário sem codificar.
    mailto: cap(
      `mailto:${enc(m.to).replace(/%40/g, "@")}?subject=${enc(m.subject)}&body=${enc(m.body.replace(/\r?\n/g, "\r\n"))}`,
    ),
  };
}
