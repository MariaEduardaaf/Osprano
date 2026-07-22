import type { Doc } from "../_generated/dataModel";
import type { Signals, SwissLang } from "./domain.ts";
import { swissLanguage } from "./domain.ts";

/**
 * Português EUROPEU, qualificado de propósito. O valor do LANG entra CRU no prompt
 * ("Write in ${lang}"), e o nome simples "Portuguese" ancorava o modelo em pt-BR —
 * pior ainda na chamada do script de ligação, que pede uma tradução pt-BR na MESMA
 * mensagem. Este valor é a fronteira entre o idioma do PROSPECT (pt-PT) e o idioma
 * da USUÁRIA (pt-BR, só na tradução). Paridade com os mapas de copy de
 * convex/lib/compliance.ts é coberta por tests/prospect-lang.test.ts.
 */
export const PT_PT = "European Portuguese (pt-PT)";

/** Outreach language per searchable market (launch + opt-in). */
export const LANG: Record<string, string> = {
  GB: "English",
  IE: "English",
  NL: "Dutch",
  SE: "Swedish",
  NO: "Norwegian",
  // Mercados opt-in (OPTIN-03): idioma do script de ligação.
  ES: "Spanish",
  IT: "Italian",
  PT: PT_PT,
  DE: "German",
  DK: "Danish",
  // Padrão da Suíça GERMANÓFONA (~62% do país), não "o idioma da Suíça": o país tem três
  // regiões linguísticas. A fonte de verdade do idioma de um lead é `langForLead` — que
  // consulta a cidade e devolve French em Genebra e Italian em Lugano. Esta entrada existe
  // porque é o fallback dessa função e a âncora dos testes de paridade LANG ↔ copy.
  CH: "German",
};

/** Nome do idioma (no vocabulário do LANG) por região linguística suíça. */
const SWISS_LANG_NAME: Record<SwissLang, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
};

/**
 * Idioma do prospect — FONTE DE VERDADE do outreach e da compliance.
 *
 * Deriva de (país, cidade) porque a Suíça é o único mercado multilíngue da base: um
 * lead em Genebra recebia script de ligação, email e rodapé de opt-out em alemão.
 * Cidade suíça desconhecida → alemão (fallback deliberado de `swissLanguage`).
 * Todos os outros países continuam derivando o idioma só do countryCode.
 *
 * O nome da cidade chega na forma LOCAL ("Genève", "Zürich"): é o valor do select
 * que `convex/places.ts` grava (`city: args.city`), não o que o Places devolve.
 * Exônimo inglês, caixa, acento e subúrbio são cobertura defensiva de
 * `swissLanguage` — a origem de cada forma está documentada em `convex/lib/domain.ts`.
 */
export function langForLead(lead: { countryCode: string; city?: string | null }): string {
  const cc = (lead.countryCode ?? "").toUpperCase();
  if (cc === "CH") return SWISS_LANG_NAME[swissLanguage(lead.city)];
  return LANG[cc] ?? "English";
}

/**
 * Assunto de emergência quando o JSON do modelo não parseia. Cobre TODO valor de
 * LANG: assunto em inglês em cima de um corpo em alemão queima o lead e denuncia
 * automação. Inglês é o último recurso, só para idioma fora do mapa.
 */
const FALLBACK_SUBJECT: Record<string, (business: string) => string> = {
  English: (b) => `${b} — a quick note about your website`,
  Dutch: (b) => `${b} — een korte opmerking over uw website`,
  Swedish: (b) => `${b} — en kort notis om er webbplats`,
  Norwegian: (b) => `${b} — en kort melding om nettstedet deres`,
  Spanish: (b) => `${b} — una nota rápida sobre su sitio web`,
  Italian: (b) => `${b} — una breve nota sul vostro sito web`,
  [PT_PT]: (b) => `${b} — uma nota rápida sobre o seu site`,
  German: (b) => `${b} — eine kurze Nachricht zu Ihrer Website`,
  Danish: (b) => `${b} — en kort besked om jeres hjemmeside`,
  // Suíça francófona (langForLead): sem esta entrada, o corpo sairia em francês e o
  // assunto em inglês — exatamente o que este mapa existe para evitar.
  French: (b) => `${b} — une note rapide au sujet de votre site web`,
};

/** Assunto de fallback no idioma do prospect (inglês só para idioma desconhecido). */
export function fallbackSubject(lang: string, businessName: string): string {
  const build = FALLBACK_SUBJECT[lang] ?? FALLBACK_SUBJECT.English;
  return build(businessName);
}

/**
 * O que cada sinal PROVA — não o diagnóstico que ele sugere.
 *
 * Este mapa é a fronteira entre um dado e uma afirmação dita a um negócio real, num idioma
 * que ninguém aqui lê. A versão anterior traduzia heurística em veredito: `sparseProfile` é
 * `!phone || rating === undefined || reviewsCount < 5` (convex/scoring.ts) e virava "their
 * Google Business profile is incomplete" — um negócio com perfil impecável e 4 avaliações
 * recebia um email dizendo que o perfil dele estava incompleto. Regra desta tabela:
 *
 *   1. cada frase descreve a OBSERVAÇÃO (o que foi checado e o que se viu), não a conclusão;
 *   2. a frase precisa ser verdadeira em TODOS os casos que ligam o sinal — por isso
 *      `sparseProfile` enumera a disjunção em vez de escolher uma das três causas;
 *   3. a frase nomeia a FONTE (a ficha pública do Google, o teste do PageSpeed), porque é
 *      só isso que se olhou: nunca o negócio, nunca a operação dele.
 *
 * ASSUNÇÃO (sinais tri-state, em curso em convex/lib/enrich.ts / convex/scoring.ts): aqui só
 * entra sinal VERIFICADO. `signalObservations` exige `=== true` — "desconhecido" (undefined/
 * null/false) não vira observação nenhuma, e um lead sem nada verificado cai no caminho
 * honesto de `observationsPrompt` (nenhum problema alegado).
 */
export const SIGNAL_TEXT: Record<keyof Signals, string> = {
  noSite: "their public Google Business listing does not link to any website",
  socialOnly:
    "the only link on their public Google Business listing is a social/link-in-bio page, not a website of their own",
  noHttps:
    "their listed website did not load over a secure HTTPS connection when it was checked (browsers label that 'not secure')",
  notMobile: "Google's PageSpeed check did not report their website as mobile-friendly",
  slow: "their website scored below 50 out of 100 on Google's PageSpeed performance test",
  sparseProfile:
    "their public Google Business listing is missing at least one basic item — a phone number, a star rating, or 5 or more reviews (which one, we cannot tell from outside)",
};

/**
 * Observações VERIFICADAS de um lead, na ordem de `SIGNAL_TEXT`. Lista vazia = nada foi
 * verificado (lead sem score) ou nada deu problema — os dois casos são tratados igual, e
 * de propósito: em nenhum deles existe defeito comprovado para citar.
 */
export function signalObservations(signals?: Signals | null): string[] {
  if (!signals) return [];
  return (Object.keys(SIGNAL_TEXT) as (keyof Signals)[])
    .filter((k) => signals[k] === true)
    .map((k) => SIGNAL_TEXT[k]);
}

/**
 * Bloco de fatos da mensagem de usuário — o único lugar de onde a IA pode tirar afirmação
 * sobre a presença online do prospect.
 *
 * Sem sinal verificado, a versão anterior mandava literalmente `Issues noticed: weak online
 * presence` — o sistema INVENTAVA um defeito (inclusive num lead com site rápido, HTTPS ok e
 * perfil completo) e a IA construía a abordagem inteira em cima da invenção.
 *
 * DECISÃO (não recusar a geração): o caminho alternativo era barrar ("lead sem sinal
 * verificado — rode o score primeiro"). Recusar protegeria contra a mentira, mas cobraria um
 * preço que não se paga: (a) a ligação é justamente o canal que sobra quando o email está
 * bloqueado (mercado opt-in), e travá-la por falta de defeito é travar o trabalho legítimo;
 * (b) "não achei defeito" não é motivo para não abordar — a prévia pronta é oferta real e
 * suficiente; (c) o lead sem score não é raro só por descuido (lead criado à mão), e forçar
 * o score não muda a honestidade do texto. Então: gera, sem alegar nada, e devolve o aviso
 * `no-verified-signal` para a UI dizer que rodar o score dá um ângulo mais específico.
 */
export function observationsPrompt(signals?: Signals | null): string {
  const observed = signalObservations(signals);
  if (observed.length === 0) {
    return (
      `Verified observations about their online presence: NONE. Nothing wrong was verified about ` +
      `this business — either every check came back fine, or the checks were never run. You were ` +
      `given NO problem, so there is no problem to name: do NOT claim, imply, hint at or ask about ` +
      `any gap, weakness, mistake, risk or missed opportunity, and do NOT guess what might be wrong. ` +
      `The whole reason for the contact is the free preview website already built for them. `
    );
  }
  return (
    `Verified observations about their online presence — these are the ONLY facts you may reference ` +
    `about it, and you must not state them more strongly than they are written here: ` +
    `${observed.join("; ")}. `
  );
}

/**
 * Marcador para o nome de quem liga/assina quando o deployment não expõe um nome real.
 *
 * Em PORTUGUÊS de propósito, mesmo dentro de um script em espanhol ou francês: a usuária
 * lê em voz alta um idioma que não fala, e um `[Prénom Nom]` francês ou um `[Your name]`
 * inglês passam batidos no meio do texto (o modelo já emitiu os dois). Uma palavra que ela
 * ENTENDE, no meio do que ela não entende, é impossível de ler no automático — é esse o
 * ponto. A alternativa que estava em produção era pior: o modelo inventava um nome
 * completo plausível ("Carlos Martín") e ela se apresentaria com identidade falsa.
 */
export const NAME_PLACEHOLDER = "[seu nome]";

/** Identidade de quem fala/assina. Objeto (e não parâmetro posicional) porque `writeEmail`
 *  já leva 3 posicionais e a regra tende a crescer (telefone/empresa/assinatura). */
export interface OutreachIdentity {
  /** Nome real de quem liga/assina. Ausente → o prompt emite `NAME_PLACEHOLDER`. */
  callerName?: string;
}

/**
 * Regras de IDENTIDADE do prompt: ou o nome exato, ou o marcador — nunca um nome inventado.
 * `role` entra na frase ("caller"/"sender") só para o texto ficar natural nos dois prompts.
 */
function identityRules(role: "caller" | "sender", callerName?: string): string {
  const name = callerName?.trim();
  if (name) {
    return (
      `IDENTITY — the ${role}'s name is EXACTLY "${name}". ` +
      `Use that exact spelling when introducing the ${role}. Do NOT translate it, localize it, ` +
      `abbreviate it, add a surname to it, or replace it with any other name. ` +
      `Never invent any other personal name anywhere in the output. `
    );
  }
  return (
    `IDENTITY — you were NOT told the ${role}'s name and you must NEVER invent one. ` +
    `Wherever the name would go, output the literal placeholder ${NAME_PLACEHOLDER} — exactly ` +
    `those characters, in Brazilian Portuguese, in EVERY output field, even though the rest of the ` +
    `text is in another language. Do NOT translate, localize or adapt the placeholder, and do NOT ` +
    `substitute any other bracketed form for it (no "[Your name]", "[Prénom Nom]", "[Nombre]", ` +
    `"[Name]", "XXX", initials, or a made-up name like "Carlos Martín"). ` +
    `The human reader replaces ${NAME_PLACEHOLDER} by hand before using the text. `
  );
}

/**
 * Regras de HONESTIDADE do prompt (as mesmas para ligação e email).
 *
 * Quem prospecta é brasileira, remota, e nunca esteve no país do prospect. O modelo, sem
 * esta trava, escrevia "aquí en Valencia" / "ici à Genève": uma afirmação factual FALSA,
 * dita ao prospect, no idioma que ela não fala — ela não teria como notar.
 */
function honestyRules(role: "caller" | "sender", lang: string): string {
  return (
    `HARD FACTUAL LIMITS — the ${role} is a REMOTE, foreign, independent web professional. ` +
    `They are NOT in the prospect's city, region or country, have never been there, and have only ` +
    `seen the business's ONLINE profile. Therefore: ` +
    `(a) NEVER claim to be local, nearby, "here in <city>", based in the city/region/country, ` +
    `to have a local office, or to be part of the local community — and never the ${lang} ` +
    `equivalent of any of that (e.g. "aquí en <city>", "ici à <city>", "hier in <city>", ` +
    `"qui a <city>"); ` +
    `(b) NEVER claim a nationality, nor to be a native speaker of ${lang}; ` +
    `(c) NEVER claim to know the area, to have walked past, visited, eaten at, shopped at, or been ` +
    `a customer of this business, nor to have been referred by anyone; ` +
    `(d) NEVER invent any fact you were not given: years of experience, number or names of clients, ` +
    `clients in that country, portfolio, agency/company name, team, awards, prices, or availability; ` +
    `(e) you may state ONLY what the ${role} does (independent web professional), what was observed ` +
    `on the business's public online presence, and the free preview site already built for them. ` +
    `If a detail was not given to you, leave it out — do not guess a plausible one. `
  );
}

/**
 * Regras de OBSERVAÇÃO do prompt (as mesmas para ligação e email).
 *
 * Par obrigatório de `observationsPrompt`: a mensagem de usuário diz o que foi verificado
 * (ou que não foi verificado nada) e esta regra diz o que fazer com isso. O prompt antigo
 * exigia "name the SPECIFIC gap noticed" — uma exigência que, num lead sem defeito, só podia
 * ser cumprida inventando um.
 */
function observationRules(): string {
  return (
    `OBSERVATIONS — the user message lists what was actually CHECKED about this business's online ` +
    `presence. Those observations are the ONLY things you may say about it, and you must not ` +
    `sharpen them: report each one as something noticed from the outside, never as a diagnosis, a ` +
    `verdict on their business, or a number you were not given (do not turn "fewer than 5 reviews" ` +
    `into "no reviews", "no website linked on their listing" into "you have no online presence", or ` +
    `a missing item into "your profile is incomplete"). Never say or imply that they are losing ` +
    `customers, money or ranking — that was not measured. If the user message says NO problem was ` +
    `verified, then you must name NO problem at all: no gap, no weakness, no "I noticed that...", ` +
    `not even as a question or a soft hint. In that case the entire angle is that a free preview ` +
    `website was already built for them and they are being offered a look at it — that alone is the ` +
    `reason for the contact, and it is enough. `
  );
}

/**
 * Regra de OPT-OUT do email — o corpo NÃO escreve opt-out nenhum.
 *
 * O único opt-out que existe de fato é o rodapé injetado por CÓDIGO (`optOutFooter`,
 * convex/lib/compliance.ts), anexado nos dois pontos de escrita do email em
 * convex/outreach.ts (`withOptOutFooter` no rascunho e a mesma injeção no envio): link
 * único por lead, no idioma do prospect, que grava na tabela de supressão — mais os
 * headers `List-Unsubscribe` / one-click do envio.
 *
 * A versão anterior desta regra mandava a IA `end with a one-line opt-out (e.g. reply
 * "stop" to not be contacted again)`, ou seja, prometia um SEGUNDO caminho de saída que
 * ninguém percorre: não existe handler de email de ENTRADA no projeto (webhook de inbound
 * do Resend é backlog — GDPR-02 em .planning/REQUIREMENTS.md). Quem respondesse "stop"
 * cairia na caixa pessoal de quem enviou, sem supressão nenhuma, achando que tinha se
 * descadastrado — e continuaria recebendo email. Opt-out é obrigação legal (COMP-03): uma
 * promessa quebrada aqui é pior do que não prometer nada.
 *
 * DECISÃO (o corpo não aponta nem para o rodapé): a alternativa era pedir uma linha do
 * tipo "se preferir não receber mais, use o link abaixo". Seria verdadeira — o rodapé está
 * mesmo logo abaixo, e já no idioma do prospect —, mas repete em ~120 palavras o que a
 * linha seguinte diz melhor, e reintroduz o risco de o modelo parafrasear o mecanismo
 * errado. O rodapé se explica sozinho. Se um dia existir handler de inbound (GDPR-02), é
 * esta função que muda — não o corpo do email.
 */
function optOutRules(lang: string): string {
  return (
    `OPT-OUT — do NOT write any opt-out, unsubscribe or "how to stop hearing from me" line ` +
    `yourself, and do not reference one: the system appends its own opt-out footer in ${lang} ` +
    `directly below your text, with the only unsubscribe link that actually works. ` +
    `NEVER tell them to reply to this email — or to reply with a word such as "stop", ` +
    `"unsubscribe" or "remove", or the ${lang} equivalent of any of those — in order to be ` +
    `removed, and never promise that answering, writing back or "just letting me know" will ` +
    `take them off any list: incoming replies are NOT processed by any system, so that ` +
    `promise would be false. `
  );
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

/**
 * System prompt do email — puro e exportado para ser testável sem chamar a API.
 * `lang` é o idioma do PROSPECT (`langForLead`).
 */
export function emailSystemPrompt(lang: string, identity: OutreachIdentity = {}): string {
  return (
    `You write SHORT, honest, compliant B2B cold emails for an independent web ` +
    `professional reaching a local business about their online presence. ` +
    `Write the ENTIRE email (subject included) in ${lang} — the prospect's language, ` +
    `never a related variety of it. Max ~120 words. Professional, no hype, no fake urgency. ` +
    identityRules("sender", identity.callerName) +
    honestyRules("sender", lang) +
    observationRules() +
    optOutRules(lang) +
    `The email MUST: (1) identify the sender by name (see IDENTITY) as an independent web professional, ` +
    `(2) briefly say why you're contacting them (relevant to their business), ` +
    `(3) stay inside the OBSERVATIONS rule above, (4) include the preview link exactly once and ` +
    `end there — the opt-out is not yours to write (see OPT-OUT). ` +
    `Return STRICT JSON only: {"subject": string, "body": string}. No markdown.`
  );
}

/**
 * System prompt do script de ligação — puro e exportado para ser testável sem chamar a API.
 * `lang` é o idioma do PROSPECT; a tradução sai sempre em pt-BR (a usuária).
 */
export function callScriptSystemPrompt(lang: string, identity: OutreachIdentity = {}): string {
  return (
    `You write a SHORT spoken cold-call opening script (~150 words) for an independent web ` +
    `professional calling a local business about their online presence, in a market where cold ` +
    `EMAIL is not legally usable without prior consent but a B2B phone call is. ` +
    `The two output fields have two DIFFERENT audiences and two DIFFERENT languages — never mix them: ` +
    `"script" is what the caller says OUT LOUD to the prospect and MUST be written in ${lang} ` +
    `(the prospect's language, not a related variety of it); "translation" is a faithful Brazilian ` +
    `Portuguese (pt-BR) rendering of that same script, written only so the Brazilian caller understands ` +
    `what they are reading aloud. Even when the prospect's language is itself a form of Portuguese, ` +
    `"script" stays in ${lang} and only "translation" is pt-BR. ` +
    identityRules("caller", identity.callerName) +
    honestyRules("caller", lang) +
    observationRules() +
    `The call MUST: (1) open by identifying the caller BY NAME (see IDENTITY), (2) stay inside the ` +
    `OBSERVATIONS rule above, (3) mention a free preview website already built for them, (4) end by ` +
    `EXPLICITLY asking for permission to send it by email or WhatsApp. ` +
    `Return STRICT JSON only: {"script": string, "translation": string}. No markdown.`
  );
}

// ---------------------------------------------------------------------------
// Trava EM CÓDIGO sobre a saída do modelo (o prompt não é controle)
//
// O teste com IA REAL mostrou desobediência às duas regras mais duras do prompt: o modelo
// emitiu `[Nombre]` (uma das formas vetadas por nome no prompt) e manteve "aquí en Valencia"
// (localidade explicitamente proibida). Mesma régua da Fase 2, em que o rodapé de opt-out é
// injetado por código: o que não se pode confiar ao modelo, verifica-se depois dele.
//
// Duas ações com nível de intervenção DIFERENTE, de propósito:
//   • marcador de nome  → NORMALIZA (determinístico, sem risco: troca um marcador por outro);
//   • alegação de local → só AVISA. Reescrever automaticamente uma frase em idioma que
//     ninguém no time lê é pior que sinalizar — a correção errada sai assinada por ela, no
//     idioma do prospect, sem ninguém capaz de revisar. Quem decide é a humana.
// ---------------------------------------------------------------------------

/** Campo de saída onde o aviso foi detectado. `null` = aviso sobre a geração, não sobre o texto. */
export type OutreachField = "subject" | "body" | "script" | "translation";

/**
 * Código do aviso. `locality-claim`: o texto parece afirmar presença local (falso — quem
 * escreve está no Brasil). `no-verified-signal`: gerado sem nenhum sinal verificado, então
 * NÃO alega problema nenhum (a UI pode sugerir rodar o score para um ângulo mais específico).
 */
export type OutreachWarningCode = "locality-claim" | "no-verified-signal";

/** Aviso estruturado devolvido junto do texto, para a UI mostrar (nunca some silenciosamente). */
export interface OutreachWarning {
  code: OutreachWarningCode;
  /** Onde apareceu; `null` para avisos que não vêm de um trecho de texto. */
  field: OutreachField | null;
  /** Trecho literal que disparou o aviso, com contexto, para a UI destacar. `null` se não houver. */
  excerpt: string | null;
  /** Mensagem pronta em pt-BR, auto-contida (não repete o `excerpt`). */
  message: string;
}

const FIELD_LABEL_PT: Record<OutreachField, string> = {
  subject: "no assunto do email",
  body: "no corpo do email",
  script: "no script da ligação",
  translation: "na tradução em pt-BR",
};

// --- (i) Marcador de nome: normalização determinística -----------------------

/**
 * Palavras que identificam um marcador de NOME DE PESSOA, nos idiomas dos mercados
 * (comparadas sem acento e em minúsculas). "[Ihr Name]", "[Prénom Nom]", "[Nombre]",
 * "[Your name]", "[Uw naam]", "[Ditt namn]" — todas caem aqui.
 */
const NAME_PLACEHOLDER_WORDS = new Set([
  "name",
  "names",
  "firstname",
  "lastname",
  "fullname",
  "vorname",
  "nachname",
  "nome",
  "nomes",
  "nomi",
  "sobrenome",
  "cognome",
  "nombre",
  "nombres",
  "apellido",
  "apellidos",
  "nom",
  "noms",
  "prenom",
  "prenoms",
  "naam",
  "namen",
  "voornaam",
  "achternaam",
  "navn",
  "fornavn",
  "etternavn",
  "efternavn",
  "namn",
  "fornamn",
  "efternamn",
]);

/**
 * Palavras que VETAM a troca mesmo havendo palavra de nome: o marcador é de outra coisa.
 * Sem isto, "[nombre del negocio]" / "[business name]" — marcador legítimo do nome do
 * PROSPECT — viraria a assinatura de quem liga.
 */
const NOT_A_PERSON_WORDS = new Set([
  "business",
  "company",
  "brand",
  "shop",
  "restaurant",
  "product",
  "service",
  "city",
  "address",
  "phone",
  "email",
  "link",
  "url",
  "site",
  "website",
  "webseite",
  "domain",
  "date",
  "negocio",
  "negocios",
  "empresa",
  "empresas",
  "companhia",
  "marca",
  "loja",
  "tienda",
  "restaurante",
  "ristorante",
  "azienda",
  "entreprise",
  "societe",
  "bedrijf",
  "firma",
  "virksomhed",
  "foretag",
  "geschaft",
  "unternehmen",
  "cidade",
  "ciudad",
  "ville",
  "stadt",
  "stad",
  "produto",
  "producto",
  "servico",
  "servicio",
  "endereco",
  "direccion",
  "telefone",
  "telefono",
  "dominio",
  "sitio",
  "cliente",
  "client",
  "data",
  "dia",
  "hora",
]);

/** Minúsculas + sem acento, para comparar palavra a palavra (só em contexto sem índice). */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** O conteúdo de `[...]` é um marcador de nome de PESSOA? */
function isPersonNamePlaceholder(inner: string): boolean {
  const words = fold(inner)
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (words.some((w) => NOT_A_PERSON_WORDS.has(w))) return false;
  return words.some((w) => NAME_PLACEHOLDER_WORDS.has(w));
}

/**
 * Normaliza QUALQUER marcador de nome entre colchetes para uma única forma.
 *
 * Com `callerName` conhecido, resolve para o nome real: o dado existe e é verificado, e o
 * modelo emitir marcador nesse caso é só desobediência — não há motivo para devolver
 * trabalho manual à usuária. Sem `callerName`, cai em `NAME_PLACEHOLDER` (`[seu nome]`), que
 * é português no meio de um texto estrangeiro justamente para ser impossível de ler no
 * automático. Nada mais é tocado: um marcador que não é de pessoa fica como está.
 */
export function normalizeNamePlaceholder(text: string, callerName?: string): string {
  const replacement = callerName?.trim() || NAME_PLACEHOLDER;
  return text.replace(/\[([^[\]\n]{1,60})\]/g, (full, inner: string) =>
    isPersonNamePlaceholder(inner) ? replacement : full,
  );
}

// --- (ii) Alegação de localidade: detecção (nunca reescrita) ------------------

/**
 * Construções de PRIMEIRA PESSOA + lugar, por idioma do texto.
 *
 * Escopadas por idioma de propósito: o italiano "qui a" ("aqui em") é, em francês, o pronome
 * relativo mais comum da língua ("un site qui a besoin"). Um detector global dispararia em
 * todo email francês, e um aviso que dispara sempre é um aviso que ninguém lê. Os acentos
 * entram como classe ([íi]) em vez de normalização porque o índice do match vira o trecho
 * mostrado à usuária — dobrar o texto mudaria as posições.
 */
const LOCALITY_PATTERNS: Record<string, RegExp[]> = {
  English: [
    /\bhere in\b/gi,
    /\bbased (?:in|here|near)\b/gi,
    /\bi(?:'m| am) (?:local|based|here|nearby)\b/gi,
    /\b(?:near|local to) you\b/gi,
    /\bin (?:your|the) area\b/gi,
  ],
  Spanish: [
    /\baqu[íi] (?:en|cerca|mismo)\b/gi,
    /\bestoy en\b/gi,
    /\bsoy (?:de|local)\b/gi,
    /\bpor aqu[íi]\b/gi,
    /\bcerca de (?:usted|ustedes|ti|vosotros)\b/gi,
    /\ben (?:su|tu) (?:zona|barrio|ciudad|[áa]rea)\b/gi,
    /\b(?:afincad[oa]|con sede) en\b/gi,
  ],
  Italian: [
    /\bqui (?:a|in|da voi|vicino)\b/gi,
    /\bsono (?:a(?! disposizione)|in|di)\b/gi,
    /\bnella vostra (?:zona|citt[àa]|area)\b/gi,
    /\bcon sede a\b/gi,
    /\bdalle vostre parti\b/gi,
  ],
  French: [
    /\bici (?:[àa]|en|au|dans)\b/gi,
    /\bje suis (?:[àa]|dans|du coin)\b/gi,
    /\bbas[ée]e? [àa]\b/gi,
    /\bimplant[ée]e? [àa]\b/gi,
    /\bpr[èe]s de chez vous\b/gi,
    /\bdans votre (?:r[ée]gion|ville|quartier)\b/gi,
  ],
  German: [
    /\bhier (?:in|bei)\b/gi,
    /\bich bin in\b/gi,
    /\bans[äa]ssig in\b/gi,
    /\bin Ihrer N[äa]he\b/gi,
    /\bvor Ort\b/gi,
  ],
  Dutch: [
    /\bhier (?:in|bij)\b/gi,
    /\bik (?:zit|ben|woon) in\b/gi,
    /\bgevestigd in\b/gi,
    /\bbij u in de buurt\b/gi,
    /\bin uw (?:buurt|regio|omgeving)\b/gi,
  ],
  Danish: [
    /\bher i\b/gi,
    /\bjeg er i\b/gi,
    /\bbaseret i\b/gi,
    /\bi n[æa]rheden\b/gi,
    /\bi jeres omr[åa]de\b/gi,
  ],
  Norwegian: [
    /\bher i\b/gi,
    /\bjeg er i\b/gi,
    /\bbasert i\b/gi,
    /\bi n[æa]rheten\b/gi,
    /\bi omr[åa]det deres\b/gi,
  ],
  Swedish: [
    /\bh[äa]r i\b/gi,
    /\bjag [äa]r i\b/gi,
    /\bbaserad i\b/gi,
    /\bi n[äa]rheten\b/gi,
    /\bi ert omr[åa]de\b/gi,
  ],
  [PT_PT]: [
    /\baqui (?:em|n[oa]s?|perto)\b/gi,
    /\bc[áa] (?:em|n[oa]s?)\b/gi,
    /\bestou (?:em|n[oa]s?|aqui)\b/gi,
    /\bsou (?:de|d[oa]s?|daqui)\b/gi,
    /\bsediad[oa] em\b/gi,
    /\bperto (?:de si|de voc[êe]|daqui)\b/gi,
  ],
};

/**
 * Marcador de primeira pessoa/proximidade imediatamente ANTES do nome da cidade do lead —
 * a rede que pega o caso real ("aquí en Valencia", "ici à Genève") mesmo se a construção
 * exata não estiver na lista do idioma. `[^.!?]{0,25}$` prende o marcador à mesma frase.
 */
const CITY_PROXIMITY_MARKER =
  /\b(?:here|aqui|aqu[íi]|c[áa]|ici|hier|qui|her|h[äa]r|based|bas[ée]e?|sediad[oa]|afincad[oa]|ans[äa]ssig|gevestigd|baseret|basert|baserad|estou|sou|soy|estoy|i am|i'm|je suis|ich bin|sono|ik zit|ik ben|jeg er|jag [äa]r|local|lokal)\b[^.!?]{0,25}$/i;

/** Trecho com contexto para a UI destacar (fronteira em espaço, com reticências). */
function excerptAround(text: string, start: number, end: number): string {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, end + 40);
  const raw = text.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${raw}${to < text.length ? "…" : ""}`;
}

/**
 * Procura alegações de presença local no texto do modelo. NÃO altera nada — devolve avisos.
 *
 * `lang` é o idioma DO TEXTO analisado (para a tradução pt-BR passe `PT_PT`), e `city` é a
 * cidade do lead, que entra na busca por proximidade. Trechos sobrepostos colapsam: uma frase
 * que casa com o padrão do idioma E com a cidade vira um aviso só.
 */
export function detectLocalityClaims(
  text: string,
  opts: { lang: string; city?: string | null; field: OutreachField },
): OutreachWarning[] {
  if (!text.trim()) return [];
  const hits: { start: number; end: number }[] = [];

  for (const pattern of LOCALITY_PATTERNS[opts.lang] ?? []) {
    for (const m of text.matchAll(pattern)) {
      if (m.index !== undefined) hits.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  const city = opts.city?.trim();
  if (city) {
    const cityRe = new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    for (const m of text.matchAll(cityRe)) {
      if (m.index === undefined) continue;
      const before = text.slice(Math.max(0, m.index - 45), m.index);
      if (CITY_PROXIMITY_MARKER.test(before)) {
        hits.push({ start: Math.max(0, m.index - 45), end: m.index + m[0].length });
      }
    }
  }

  // Um aviso por TRECHO: "aquí en Valencia" casa com o padrão do espanhol E com a busca por
  // cidade. Dois avisos para a mesma frase é ruído — colapsa por sobreposição de intervalo.
  const warnings: OutreachWarning[] = [];
  let lastEnd = -1;
  for (const hit of hits.sort((a, b) => a.start - b.start)) {
    if (hit.start < lastEnd) continue;
    lastEnd = hit.end;
    const excerpt = excerptAround(text, hit.start, hit.end);
    warnings.push({
      code: "locality-claim",
      field: opts.field,
      excerpt,
      message:
        `Possível alegação de presença local ${FIELD_LABEL_PT[opts.field]}. ` +
        `Quem assina está no Brasil e nunca esteve na cidade do prospect — leia o trecho e ` +
        `reescreva ou apague antes de usar (o texto NÃO foi alterado automaticamente).`,
    });
    if (warnings.length >= 5) break; // teto: aviso demais vira ruído e ninguém lê nenhum
  }
  return warnings;
}

/** Aviso de "nada verificado" — a mensagem foi escrita sem alegar problema nenhum. */
function noVerifiedSignalWarning(): OutreachWarning {
  return {
    code: "no-verified-signal",
    field: null,
    excerpt: null,
    message:
      "Nenhum sinal verificado neste lead: o texto foi escrito SEM apontar qualquer problema " +
      "(o ângulo é só a prévia pronta). Rode o score do lead para uma abordagem mais específica.",
  };
}

/** Cabeçalho factual do lead na mensagem de usuário (nome, cidade, categoria — nada inferido). */
function businessLine(lead: Doc<"leads">): string {
  return (
    `Business: ${lead.name}` +
    `${lead.city ? ` in ${lead.city}` : ""}` +
    `${lead.category ? `, a ${lead.category.replace(/_/g, " ")}` : ""}. `
  );
}

/**
 * Draft a short, compliant B2B cold email via Claude. Compliant-by-design:
 * sender identity, relevance-to-business, only VERIFIED observations and the preview link.
 * Returns { subject, body, warnings }.
 *
 * O OPT-OUT não sai daqui: o corpo é proibido de prometer qualquer forma de saída
 * (ver `optOutRules`) e quem anexa o caminho real — o rodapé com link de unsubscribe — é
 * o código, em `convex/outreach.ts`.
 *
 * `identity.callerName` = quem assina. O rodapé de opt-out já carrega a identidade por
 * CÓDIGO (`optOutFooter`), mas o CORPO é escrito pela IA — sem esta trava o modelo
 * inventava nome e alegava ser local, exatamente como no script de ligação.
 *
 * `warnings` NUNCA pode ser descartado pelo chamador: é o que sobra do que o prompt não
 * conseguiu impedir (ver a seção de trava em código acima).
 */
export async function writeEmail(
  apiKey: string,
  lead: Doc<"leads">,
  previewUrl: string,
  identity: OutreachIdentity = {},
): Promise<{ subject: string; body: string; warnings: OutreachWarning[] }> {
  const lang = langForLead(lead);
  const observations = observationsPrompt(lead.signals);

  const system = emailSystemPrompt(lang, identity);

  const user =
    businessLine(lead) +
    observations +
    `I already built a free preview website for them: ${previewUrl}. Write the email.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = (data.content ?? []).map((b) => b.text ?? "").join("").trim();

  let subject: string;
  let body: string;
  try {
    const parsed = JSON.parse(text) as { subject: string; body: string };
    if (parsed.subject && parsed.body) {
      subject = parsed.subject;
      body = parsed.body;
    } else {
      throw new Error("campos ausentes");
    }
  } catch {
    // Fallback de parse: o corpo cru veio no idioma do prospect — o assunto TEM que
    // acompanhar, senão o alemão recebe assunto em inglês com corpo em alemão.
    subject = fallbackSubject(lang, lead.name);
    body = text;
  }

  // A trava roda no caminho normal E no de fallback: o texto cru é justamente o menos revisado.
  subject = normalizeNamePlaceholder(subject, identity.callerName);
  body = normalizeNamePlaceholder(body, identity.callerName);

  const warnings: OutreachWarning[] = [
    ...(signalObservations(lead.signals).length === 0 ? [noVerifiedSignalWarning()] : []),
    ...detectLocalityClaims(subject, { lang, city: lead.city, field: "subject" }),
    ...detectLocalityClaims(body, { lang, city: lead.city, field: "body" }),
  ];

  return { subject, body, warnings };
}

/**
 * Gera um script de ligação B2B curto (~150 palavras) no idioma do mercado + tradução pt-BR.
 * O fecho pede EXPLICITAMENTE consentimento para enviar a prévia por email/WhatsApp.
 *
 * `identity.callerName` é o nome que a usuária dirá em voz alta. Sem ele o prompt emite
 * `NAME_PLACEHOLDER` nos dois campos — nunca um nome inventado pelo modelo.
 *
 * `warnings` NUNCA pode ser descartado pelo chamador: aqui vale dobrado, porque a usuária lê
 * o script EM VOZ ALTA num idioma que não fala — se o texto alegar ser local, ela diz isso.
 */
export async function writeCallScript(
  apiKey: string,
  lead: Doc<"leads">,
  identity: OutreachIdentity = {},
): Promise<{ script: string; translation: string; warnings: OutreachWarning[] }> {
  const lang = langForLead(lead);
  const observations = observationsPrompt(lead.signals);

  const system = callScriptSystemPrompt(lang, identity);

  const user =
    businessLine(lead) + observations + `Write the call script and its pt-BR translation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = (data.content ?? []).map((b) => b.text ?? "").join("").trim();

  let script: string;
  let translation: string;
  try {
    const parsed = JSON.parse(text) as { script: string; translation: string };
    if (parsed.script && parsed.translation) {
      script = parsed.script;
      translation = parsed.translation;
    } else {
      throw new Error("campos ausentes");
    }
  } catch {
    // Fallback de parse: devolve o texto cru como script, mas a tradução fica VAZIA de propósito.
    // Repetir o texto estrangeiro na coluna "Tradução (pt-BR)" seria uma tradução falsa — e como
    // quem liga não fala o idioma, isso é pior que não ter tradução. "" = tradução indisponível
    // (a UI trata esse caso); nunca finja que traduziu.
    script = text;
    translation = "";
  }

  script = normalizeNamePlaceholder(script, identity.callerName);
  translation = normalizeNamePlaceholder(translation, identity.callerName);

  // A tradução é analisada com os padrões PORTUGUESES (ela sai em pt-BR, não no idioma do
  // prospect) — e é o campo que a usuária realmente entende: um "aqui em Valência" ali é o
  // aviso mais acionável dos dois.
  const warnings: OutreachWarning[] = [
    ...(signalObservations(lead.signals).length === 0 ? [noVerifiedSignalWarning()] : []),
    ...detectLocalityClaims(script, { lang, city: lead.city, field: "script" }),
    ...detectLocalityClaims(translation, { lang: PT_PT, city: lead.city, field: "translation" }),
  ];

  return { script, translation, warnings };
}
