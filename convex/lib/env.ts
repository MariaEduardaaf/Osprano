/**
 * Pré-condições de AMBIENTE que viram TEXTO NO EMAIL DO PROSPECT.
 *
 * Módulo puro (sem imports do servidor Convex — `convex/values` é só valores, roda em Node),
 * testável direto — porque a trava tem que morar no código, não no prompt nem na memória de
 * quem configurou o deployment.
 *
 * REGRA DA CASA: variável de ambiente cujo valor é lido pelo prospect NÃO tem default.
 * Um default silencioso aqui não degrada a experiência — ele MENTE:
 *   - `APP_URL ?? "http://localhost:3000"` prometia ao prospect europeu uma prévia pronta
 *     num link que só abre na máquina da remetente;
 *   - `${CONVEX_SITE_URL}/unsubscribe` sem a variável saía literalmente
 *     `undefined/unsubscribe?token=...` no rodapé E no header `List-Unsubscribe` — ou seja,
 *     o caminho de opt-out obrigatório (COMP-02/COMP-03) simplesmente não existia.
 * Mesma forma de `ANTHROPIC_API_KEY` em convex/outreach.ts: falta a variável → erro em
 * pt-BR dizendo QUAL falta e ONDE configurar, antes de qualquer efeito colateral.
 */

import { userError } from "./errors.ts";

/**
 * DESENVOLVIMENTO só quando declarado. Mesmo precedente (e mesmo motivo) de `isDemoEnabled`
 * em convex/model/tenant.ts: DEFAULT-DENY, porque `NODE_ENV` é fixado em "production" pelo
 * bundler do Convex em TODO deployment e não serve para distinguir ambiente. Env esquecida =
 * tratado como produção = exige configuração explícita. O erro cai em cima da usuária (que
 * consegue consertar), nunca em cima do prospect (que receberia o link quebrado).
 */
export function isDevEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CONVEX_ENV === "development";
}

/** Único default legítimo do arquivo: o Next local, e só quando CONVEX_ENV=development. */
const DEV_APP_URL = "http://localhost:3000";

const CONFIG_HINT = "Configure com `npx convex env set` no deployment Convex (ver SETUP.md).";

/** Hosts que só resolvem na máquina de quem desenvolve — inúteis na caixa de entrada alheia. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

function parseHttpUrl(raw: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw userError(
      `${name} inválida ("${raw}"): precisa ser uma URL absoluta, com http:// ou https://. ${CONFIG_HINT}`,
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw userError(
      `${name} inválida ("${raw}"): precisa começar com http:// ou https://. ${CONFIG_HINT}`,
    );
  }
  return url;
}

/** Sem barra no fim: quem concatena aqui já escreve `/p/...` e `/unsubscribe`. */
function baseUrlOf(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

function isLocalHost(url: URL): boolean {
  return LOCAL_HOSTS.has(url.hostname.toLowerCase());
}

/**
 * Base pública do app, para o link da prévia que vai NO CORPO do email.
 *
 * Fora de desenvolvimento a variável é obrigatória E não pode apontar para localhost:
 * `APP_URL=http://localhost:3000` configurada em produção quebra do mesmo jeito que a
 * variável ausente — o prospect recebe um link morto.
 */
export function requireAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const dev = isDevEnv(env);
  const raw = env.APP_URL?.trim();
  if (!raw) {
    if (dev) return DEV_APP_URL;
    throw userError(
      "APP_URL não configurada no deployment Convex. Sem ela o link da prévia sairia como " +
        `${DEV_APP_URL}/p/... no email do prospect — um endereço que só abre na sua máquina. ` +
        `${CONFIG_HINT}`,
    );
  }
  const url = parseHttpUrl(raw, "APP_URL");
  if (!dev && isLocalHost(url)) {
    throw userError(
      `APP_URL aponta para um endereço local ("${raw}") fora de desenvolvimento. O link da ` +
        "prévia no email do prospect não abriria. Configure a URL pública do app. " +
        `${CONFIG_HINT}`,
    );
  }
  return baseUrlOf(url);
}

/**
 * Base do backend HTTP do Convex, onde vive o endpoint `/unsubscribe` (convex/http.ts).
 *
 * SEM fallback de desenvolvimento, ao contrário de APP_URL: o Convex injeta
 * `CONVEX_SITE_URL` automaticamente em todo deployment (inclusive `npx convex dev`), então
 * exigir não quebra fluxo local nenhum — e não existe default honesto para um link que É a
 * obrigação legal de opt-out. Melhor não gerar o rascunho do que gerar um opt-out falso.
 */
export function requireUnsubscribeBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.CONVEX_SITE_URL?.trim();
  if (!raw) {
    throw userError(
      "CONVEX_SITE_URL não configurada no deployment Convex. Sem ela o link de descadastro " +
        "sairia como `undefined/unsubscribe?token=...` no rodapé e no header List-Unsubscribe " +
        "— um caminho de opt-out quebrado equivale a não ter opt-out (COMP-02/COMP-03). " +
        `${CONFIG_HINT}`,
    );
  }
  return baseUrlOf(parseHttpUrl(raw, "CONVEX_SITE_URL"));
}

/** Caminho + token: parte da URL que não depende de env, e por isso serve de marcador. */
function unsubscribePath(token: string): string {
  return `/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** URL completa de opt-out. Único lugar do app que monta essa string. */
export function unsubscribeUrlFrom(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${requireUnsubscribeBaseUrl(env)}${unsubscribePath(token)}`;
}

/**
 * Idempotência do rodapé: "este corpo já tem o link de opt-out deste token?".
 *
 * Casa pelo caminho+token, NÃO pela URL inteira, porque a base pode ter mudado de forma
 * entre o rascunho e o envio (barra no fim de CONVEX_SITE_URL, domínio trocado). Com a URL
 * inteira como marcador, uma diferença cosmética faz o `send` anexar um SEGUNDO rodapé, e o
 * prospect recebe dois blocos de descadastro.
 */
export function hasUnsubscribeLink(body: string, token: string): boolean {
  return body.includes(unsubscribePath(token));
}

/**
 * Identidade de quem envia, para o rodapé de compliance ("Enviado por ...").
 *
 * Mesmo critério: o valor é LIDO pelo prospect e é exigência legal de identificação do
 * remetente, então o antigo `RESEND_FROM ?? "Osprano"` afirmava uma identidade que ninguém
 * verificou (e que fica GRAVADA no rascunho, já que o rodapé é persistido no `upsertDraft`
 * e o `send` não reescreve um rodapé já presente). Fora de desenvolvimento, exigir —
 * `send` já exige RESEND_FROM de qualquer forma, então isso não bloqueia nenhum envio que
 * antes funcionava: só antecipa o erro para antes do rascunho.
 */
export function requireSenderFrom(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.RESEND_FROM?.trim();
  if (raw) return raw;
  if (isDevEnv(env)) return "Osprano";
  throw userError(
    "RESEND_FROM não configurada no deployment Convex. Ela identifica quem envia no rodapé " +
      'de opt-out do prospect ("Enviado por ..."), e adivinhar esse nome seria afirmar uma ' +
      `identidade não verificada. Formato: "Seu Nome <voce@dominio.com>". ${CONFIG_HINT}`,
  );
}

/**
 * Último portão antes do `fetch` para o Resend: o corpo JÁ PERSISTIDO pode ter sido escrito
 * antes destas travas existirem (rascunhos gravados com `undefined/unsubscribe` continuam no
 * banco) ou num deployment de desenvolvimento. Reenviar um desses é exatamente o que estas
 * travas existem para impedir — e o `send` só ANEXA um rodapé novo quando o correto está
 * ausente, ou seja, o rodapé quebrado antigo iria junto.
 *
 * Devolve a mensagem do problema, ou `null` quando o corpo está limpo.
 */
export function draftLinkIssue(body: string, env: NodeJS.ProcessEnv = process.env): string | null {
  if (body.includes("undefined/unsubscribe")) {
    return "Este rascunho foi gravado sem CONVEX_SITE_URL e contém um link de descadastro quebrado (`undefined/unsubscribe`). Gere a abordagem novamente antes de enviar.";
  }
  if (!isDevEnv(env) && /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(body)) {
    return "Este rascunho contém um link de desenvolvimento (localhost), que não abre para o prospect. Gere a abordagem novamente antes de enviar.";
  }
  return null;
}
