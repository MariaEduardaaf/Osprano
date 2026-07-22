import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LANG,
  NAME_PLACEHOLDER,
  PT_PT,
  SIGNAL_TEXT,
  callScriptSystemPrompt,
  detectLocalityClaims,
  emailSystemPrompt,
  fallbackSubject,
  langForLead,
  normalizeNamePlaceholder,
  observationsPrompt,
  signalObservations,
} from "../convex/lib/outreachAi.ts";
import type { Signals } from "../convex/lib/domain.ts";
import { unsubscribePageHtml, optOutFooter, callerNameFrom } from "../convex/lib/compliance.ts";
import { SEARCHABLE_MARKETS } from "../convex/lib/domain.ts";

/** Idioma que garantidamente não existe nos mapas → devolve a copy de fallback (inglês). */
const UNKNOWN = "__idioma_inexistente__";

test("fallbackSubject: idioma desconhecido cai no inglês", () => {
  assert.equal(fallbackSubject(UNKNOWN, "Bar do Zé"), fallbackSubject("English", "Bar do Zé"));
  assert.ok(fallbackSubject(UNKNOWN, "Bar do Zé").includes("Bar do Zé"));
});

test("paridade LANG ↔ assunto de fallback: nenhum mercado recebe assunto em inglês", () => {
  for (const cc of SEARCHABLE_MARKETS) {
    const lang = LANG[cc];
    const subject = fallbackSubject(lang, "Acme");
    assert.ok(subject.includes("Acme"), `assunto de fallback de ${cc} sem o nome do negócio`);
    if (lang === "English") {
      assert.equal(subject, fallbackSubject(UNKNOWN, "Acme"), `${cc} é anglófono`);
    } else {
      assert.notEqual(
        subject,
        fallbackSubject(UNKNOWN, "Acme"),
        `sem assunto de fallback em "${lang}" (${cc}) — o assunto está saindo em inglês`,
      );
    }
  }
});

test("paridade LANG ↔ página de unsubscribe: nenhum mercado aterrissa em inglês", () => {
  const fallbackPage = unsubscribePageHtml(UNKNOWN);
  assert.equal(fallbackPage, unsubscribePageHtml("English"), "o fallback da página é o inglês");
  for (const cc of SEARCHABLE_MARKETS) {
    const lang = LANG[cc];
    const page = unsubscribePageHtml(lang);
    assert.ok(page.startsWith("<!doctype html><html lang="), `HTML malformado para ${cc}`);
    if (lang === "English") {
      assert.equal(page, fallbackPage, `${cc} é anglófono e deveria ver a página em inglês`);
    } else {
      assert.notEqual(
        page,
        fallbackPage,
        `sem página de unsubscribe em "${lang}" (${cc}) — o prospect aterrissa em inglês`,
      );
      assert.ok(!page.includes(`<html lang="en">`), `${cc} servindo <html lang="en">`);
    }
  }
});

test("PT é português EUROPEU em todo o caminho do prospect", () => {
  assert.equal(LANG.PT, PT_PT);
  assert.ok(PT_PT.includes("pt-PT"), "o valor do LANG precisa qualificar pt-PT dentro do prompt");
  assert.ok(!/brazil/i.test(PT_PT), "o idioma do prospect nunca é pt-BR");

  const footer = optOutFooter(LANG.PT, "https://x/u/tok", "Ana");
  assert.ok(footer.includes("subscrição"), "rodapé PT deve ser pt-PT ('subscrição')");
  assert.ok(!footer.includes("nossos emails"), "rodapé PT ainda em pt-BR");

  const page = unsubscribePageHtml(LANG.PT);
  assert.ok(page.includes(`<html lang="pt-PT">`), "a página PT precisa declarar lang=pt-PT");
});

test("o alias 'Portuguese' não cai no inglês (recebe a copy pt-PT)", () => {
  const url = "https://x/u/tok";
  assert.equal(optOutFooter("Portuguese", url, "Ana"), optOutFooter(LANG.PT, url, "Ana"));
  assert.equal(unsubscribePageHtml("Portuguese"), unsubscribePageHtml(LANG.PT));
});

// ---------------------------------------------------------------------------
// Suíça: o idioma é REGIONAL (o país é o único mercado multilíngue da base)
// ---------------------------------------------------------------------------

test("langForLead: a Suíça deriva o idioma da cidade, não do país", () => {
  // Nomes LOCAIS (o que a usuária escolhe no select da UI).
  assert.equal(langForLead({ countryCode: "CH", city: "Genève" }), "French");
  assert.equal(langForLead({ countryCode: "CH", city: "Lugano" }), "Italian");
  assert.equal(langForLead({ countryCode: "CH", city: "Zürich" }), "German");
  // Nomes em INGLÊS — cobertura defensiva de criação manual/colagem. NÃO é como o
  // lead de descoberta chega: places.ts grava `city: args.city` (a forma local do
  // select), e o `languageCode:"en"` só afeta displayName/formattedAddress.
  assert.equal(langForLead({ countryCode: "CH", city: "Geneva" }), "French");
  assert.equal(langForLead({ countryCode: "CH", city: "Zurich" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "Berne" }), "German");
});

test("langForLead: cidade suíça desconhecida/ausente cai no alemão (fallback deliberado)", () => {
  assert.equal(langForLead({ countryCode: "CH", city: "Vila Que Não Existe" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: null }), "German");
  assert.equal(langForLead({ countryCode: "CH" }), "German");
  assert.equal(langForLead({ countryCode: "CH", city: "Lugano" }), LANG.IT);
  assert.equal(LANG.CH, "German", "LANG.CH continua sendo o padrão germanófono/fallback");
});

test("langForLead: fora da Suíça o idioma continua vindo só do país", () => {
  // Cidade francófona em país não-suíço não muda nada — a França NÃO virou mercado.
  assert.equal(langForLead({ countryCode: "DE", city: "Genève" }), "German");
  assert.equal(langForLead({ countryCode: "GB", city: "Lugano" }), "English");
  assert.equal(langForLead({ countryCode: "PT", city: "Porto" }), PT_PT);
  assert.equal(langForLead({ countryCode: "XX", city: "Nowhere" }), "English");
  assert.equal(langForLead({ countryCode: "" }), "English");
});

test("o prospect suíço francófono não cai no inglês em NENHUM ponto do caminho", () => {
  const url = "https://x/u/tok";
  const lang = langForLead({ countryCode: "CH", city: "Geneva" });
  assert.equal(lang, "French");

  // 1. assunto de fallback (corpo em francês + assunto em inglês = automação denunciada)
  assert.notEqual(
    fallbackSubject(lang, "Acme"),
    fallbackSubject(UNKNOWN, "Acme"),
    'sem assunto de fallback em "French" — o assunto sairia em inglês',
  );
  assert.ok(fallbackSubject(lang, "Acme").includes("Acme"));

  // 2. rodapé de opt-out
  const footer = optOutFooter(lang, url, "Ana");
  assert.notEqual(
    footer,
    optOutFooter(UNKNOWN, url, "Ana"),
    'FOOTER_COPY não tem entrada própria para "French" — o rodapé cairia no inglês',
  );
  assert.notEqual(footer, optOutFooter("German", url, "Ana"), "o rodapé francês está saindo alemão");
  assert.ok(footer.includes(url), "rodapé francês sem link de opt-out");

  // 3. página de confirmação do unsubscribe
  const page = unsubscribePageHtml(lang);
  assert.notEqual(
    page,
    unsubscribePageHtml(UNKNOWN),
    'sem página de unsubscribe em "French" — o prospect aterrissa em inglês',
  );
  assert.ok(page.includes(`<html lang="fr">`), "a página francesa precisa declarar lang=fr");
});

// ---------------------------------------------------------------------------
// Identidade de quem liga/assina: a IA NÃO inventa nome nem alega ser local
//
// Dois defeitos observados com a IA real, em produção:
//   ES/Valencia → "Mi nombre es Carlos Martín ... aquí en Valencia" (nome inventado + local)
//   CH/Genebra  → "je m'appelle [Prénom Nom] ... ici à Genève"      (placeholder estrangeiro)
// Os prompts são strings puras — dá para travar as regras sem chamar a API.
// ---------------------------------------------------------------------------

/** Os dois prompts carregam as MESMAS regras de identidade/honestidade. */
const PROMPTS: [string, (lang: string, identity?: { callerName?: string }) => string][] = [
  ["callScriptSystemPrompt", callScriptSystemPrompt],
  ["emailSystemPrompt", emailSystemPrompt],
];

test("o marcador de nome é PORTUGUÊS de propósito (impossível de ler no automático)", () => {
  assert.equal(NAME_PLACEHOLDER, "[seu nome]");
  assert.ok(/^\[.+\]$/.test(NAME_PLACEHOLDER), "o marcador precisa ser visivelmente um marcador");
});

for (const [nome, build] of PROMPTS) {
  test(`${nome}: com callerName, usa EXATAMENTE esse nome e não emite marcador`, () => {
    const prompt = build("Spanish", { callerName: "Duda" });
    assert.ok(prompt.includes('"Duda"'), "o nome real precisa entrar literal no prompt");
    assert.ok(/EXACTLY/.test(prompt), "o prompt precisa exigir o nome exato");
    assert.ok(
      !prompt.includes(NAME_PLACEHOLDER),
      "com nome real, o marcador não pode aparecer — a IA escolheria entre dois",
    );
    assert.ok(/[Nn]ever invent any other personal name/.test(prompt));
  });

  test(`${nome}: sem callerName, emite o marcador pt-BR e proíbe inventar nome`, () => {
    const prompt = build("French");
    assert.ok(prompt.includes(NAME_PLACEHOLDER), "sem nome real, o marcador é obrigatório");
    assert.ok(/NEVER invent one/.test(prompt), "o prompt precisa proibir inventar um nome");
    assert.ok(/EVERY output field/.test(prompt), "o marcador vale nos DOIS campos de saída");
    // As formas que a IA real emitiu/inventou ficam proibidas por nome.
    for (const ruim of ["[Your name]", "[Prénom Nom]", "[Nombre]", "Carlos Martín"]) {
      assert.ok(prompt.includes(ruim), `o prompt precisa vetar explicitamente ${ruim}`);
    }
    // Chamada sem identidade e com identidade vazia são o mesmo caso.
    assert.equal(build("French", {}), prompt);
    assert.equal(build("French", { callerName: "   " }), prompt, "nome só de espaço = sem nome");
  });

  test(`${nome}: proíbe alegar localidade/nacionalidade em qualquer variante`, () => {
    for (const identity of [undefined, { callerName: "Duda" }]) {
      const prompt = build("Spanish", identity);
      assert.ok(/REMOTE, foreign/.test(prompt), "o prompt precisa declarar que a pessoa é remota");
      assert.ok(/NEVER claim to be local/.test(prompt));
      assert.ok(prompt.includes('"here in <city>"'), "a frase-problema precisa estar vetada");
      // Exatamente as construções que saíram na IA real (ES e FR).
      assert.ok(prompt.includes('"aquí en <city>"') && prompt.includes('"ici à <city>"'));
      assert.ok(/NEVER claim a nationality/.test(prompt));
      assert.ok(/never been there/.test(prompt), "nunca esteve no país do prospect");
      assert.ok(/walked past, visited, eaten at/.test(prompt), "não conhece o estabelecimento");
    }
  });

  test(`${nome}: proíbe inventar fatos não fornecidos, e diz o que PODE afirmar`, () => {
    const prompt = build("Italian", { callerName: "Duda" });
    assert.ok(/NEVER invent any fact you were not given/.test(prompt));
    for (const fato of ["years of experience", "portfolio", "awards", "referred by anyone"]) {
      assert.ok(prompt.includes(fato), `o prompt precisa vetar inventar ${fato}`);
    }
    assert.ok(/do not guess a plausible one/.test(prompt), "sem preencher lacuna com plausível");
    assert.ok(
      /may state ONLY what the (caller|sender) does/.test(prompt),
      "o prompt precisa listar o que É permitido afirmar",
    );
  });

  test(`${nome}: não exige mais nomear um defeito, e proíbe inventar um`, () => {
    const prompt = build("Spanish", { callerName: "Duda" });
    // A exigência antiga ("name the SPECIFIC gap noticed") era impossível de cumprir sem
    // mentir num lead sem defeito — o modelo inventava o defeito para obedecer.
    assert.ok(!/SPECIFIC gap/.test(prompt), "o prompt não pode mais exigir um defeito específico");
    assert.ok(/OBSERVATIONS/.test(prompt), "o prompt precisa da regra de observações");
    assert.ok(/NO problem was verified/.test(prompt), "o caso 'nada verificado' precisa estar coberto");
    assert.ok(/name NO problem at all/.test(prompt));
    assert.ok(/not even as a question or a soft hint/.test(prompt), "nem em forma de pergunta");
    assert.ok(/you must not sharpen them/.test(prompt), "proibido endurecer a observação");
    assert.ok(/losing customers, money or ranking/.test(prompt), "dano não medido é proibido");
  });

  test(`${nome}: o idioma do prospect continua entrando cru no prompt`, () => {
    for (const cc of SEARCHABLE_MARKETS) {
      const lang = LANG[cc];
      assert.ok(build(lang).includes(lang), `${cc}: prompt sem o idioma do prospect`);
    }
    assert.ok(build(PT_PT).includes("pt-PT"), "PT continua qualificado como europeu");
  });
}

test("callScriptSystemPrompt: a tradução pt-BR e o papel de 'caller' seguem intactos", () => {
  const prompt = callScriptSystemPrompt("German", { callerName: "Duda" });
  assert.ok(/Brazilian\s+Portuguese \(pt-BR\)/.test(prompt), "a tradução da usuária é pt-BR");
  assert.ok(/identifying the caller BY NAME/.test(prompt));
  assert.ok(/permission to send it by email or WhatsApp/.test(prompt), "o fecho de consentimento");
  assert.ok(prompt.includes(`"script" stays in German`), "script no idioma do prospect");
});

test("emailSystemPrompt: o corpo se identifica pelo nome e delega o opt-out ao rodapé", () => {
  const prompt = emailSystemPrompt("Dutch");
  assert.ok(/identify the sender by name/.test(prompt));
  assert.ok(/ENTIRE email \(subject included\) in Dutch/.test(prompt));
  // A regra de opt-out continua no prompt — invertida: quem escreve o opt-out é o CÓDIGO
  // (optOutFooter, anexado em convex/outreach.ts), não a IA.
  assert.ok(/OPT-OUT/.test(prompt), "a regra de opt-out precisa continuar no prompt");
  assert.ok(
    /appends its own opt-out footer in Dutch/.test(prompt),
    "o prompt precisa dizer que o rodapé é injetado (e no idioma do prospect)",
  );
  assert.ok(
    /do NOT write any opt-out/.test(prompt),
    "o corpo não pode escrever o próprio opt-out — duplicaria o rodapé",
  );
});

// ---------------------------------------------------------------------------
// INVARIANTE: nenhum prompt pode prometer uma AÇÃO POR RESPOSTA DE EMAIL
//
// Não existe handler de email de entrada no projeto — o webhook de inbound do Resend é
// backlog (GDPR-02, .planning/REQUIREMENTS.md). O prompt do email pedia literalmente
// `end with a one-line opt-out (e.g. reply "stop" to not be contacted again)`: o prospect
// que respondesse "stop" cairia numa caixa pessoal, sem supressão nenhuma, achando que
// tinha saído da lista. Opt-out é obrigação legal (COMP-03), então esta trava fica.
// Se um dia existir inbound processado, é ESTE teste que se atualiza primeiro.
// ---------------------------------------------------------------------------

/** Corte grosseiro em frases (ponto final + espaço) — basta para checar o escopo da negação. */
function sentences(prompt: string): string[] {
  return prompt.split(/(?<=\.)\s+/).filter((s) => s.trim().length > 0);
}

for (const [nome, build] of PROMPTS) {
  test(`${nome}: nenhuma frase manda o prospect responder (não há inbound que processe)`, () => {
    for (const identity of [undefined, { callerName: "Duda" }]) {
      for (const cc of SEARCHABLE_MARKETS) {
        const prompt = build(LANG[cc], identity);
        for (const frase of sentences(prompt)) {
          if (!/\brepl(?:y|ies|ying)\b/i.test(frase)) continue;
          // Negação FORTE de propósito: um "to not be contacted again" solto (a redação
          // antiga) não conta como proibição — ali "reply" ainda era uma INSTRUÇÃO.
          assert.match(
            frase,
            /\b(?:NEVER|never|do NOT|must NOT|must not|are NOT|is NOT)\b/,
            `${cc}: frase manda o prospect responder — não existe handler de email de ` +
              `entrada que processe isso (GDPR-02): "${frase}"`,
          );
        }
      }
    }
  });
}

test("emailSystemPrompt: a instrução de opt-out por resposta não volta", () => {
  const prompt = emailSystemPrompt("Spanish", { callerName: "Duda" });
  // A frase exata que estava em produção, e a forma genérica dela.
  assert.ok(!/one-line opt-out/.test(prompt), 'o prompt não pode mais pedir "a one-line opt-out"');
  assert.ok(
    !/end with a one-line opt-out/i.test(prompt),
    "a exigência antiga de fechar o email com opt-out próprio não pode voltar",
  );
  // E a proibição precisa ser explícita: o modelo só obedece o que está escrito.
  assert.ok(/NEVER tell them to reply to this email/.test(prompt));
  assert.ok(
    /incoming replies are NOT processed by any system/.test(prompt),
    "o prompt precisa dizer POR QUE a promessa é falsa",
  );
  // As palavras-gatilho aparecem no prompt apenas dentro da PROIBIÇÃO.
  for (const palavra of ["stop", "unsubscribe", "remove"]) {
    assert.ok(prompt.includes(`"${palavra}"`), `a palavra "${palavra}" precisa estar vetada`);
  }
});

test("callerNameFrom: só um nome HUMANO chega ao prompt (email cru vira marcador)", () => {
  assert.equal(callerNameFrom("Duda <duda@osprano.com>"), "Duda");
  assert.equal(callerNameFrom("  Team Osprano  <hi@osprano.com> "), "Team Osprano");
  // Sem display name o RESEND_FROM é um endereço: dizer isso em voz alta como "meu nome"
  // é pior que o marcador — então vira undefined e o prompt cai no `[seu nome]`.
  assert.equal(callerNameFrom("contato@osprano.com"), undefined);
  assert.equal(callerNameFrom("<contato@osprano.com>"), undefined);
  assert.equal(callerNameFrom(""), undefined);
  assert.equal(callerNameFrom("   "), undefined);
  assert.equal(callerNameFrom(undefined), undefined);
  assert.equal(callerNameFrom(null), undefined);
});

test("as três regiões suíças têm copy própria e distinta entre si", () => {
  const url = "https://x/u/tok";
  const langs = ["Geneva", "Lugano", "Zurich", "Cidade Desconhecida"].map((city) =>
    langForLead({ countryCode: "CH", city }),
  );
  assert.deepEqual(langs, ["French", "Italian", "German", "German"]);

  const pages = new Set(langs.map(unsubscribePageHtml));
  assert.equal(pages.size, 3, "as três regiões precisam de páginas distintas (fr/it/de)");
  for (const lang of langs) {
    assert.notEqual(unsubscribePageHtml(lang), unsubscribePageHtml(UNKNOWN), `${lang} em inglês`);
    assert.notEqual(optOutFooter(lang, url, "Ana"), optOutFooter(UNKNOWN, url, "Ana"), lang);
  }
});

// ---------------------------------------------------------------------------
// Só se afirma o que se verificou
//
// Dois defeitos que saíam para negócios REAIS:
//   • sem `pains`, a mensagem mandava literalmente "Issues noticed: weak online presence" —
//     um defeito INVENTADO num negócio com site rápido, HTTPS ok e perfil completo;
//   • `sparseProfile` (= sem telefone OU sem rating OU < 5 avaliações, convex/scoring.ts)
//     virava "their Google Business profile is incomplete" — veredito que o dado não sustenta.
// ---------------------------------------------------------------------------

const NO_SIGNALS: Signals = {
  noSite: false,
  socialOnly: false,
  noHttps: false,
  notMobile: false,
  slow: false,
  sparseProfile: false,
};
const withSignals = (over: Partial<Signals>): Signals => ({ ...NO_SIGNALS, ...over });

test("SIGNAL_TEXT descreve a OBSERVAÇÃO, nunca o diagnóstico", () => {
  const entries = Object.entries(SIGNAL_TEXT);
  assert.equal(entries.length, Object.keys(NO_SIGNALS).length, "todo sinal precisa de texto");
  for (const [key, texto] of entries) {
    assert.ok(
      !/\b(incomplete|weak|poor|bad|outdated|unprofessional|losing|broken)\b/i.test(texto),
      `SIGNAL_TEXT.${key} está diagnosticando ("${texto}")`,
    );
    assert.ok(texto.trim().length > 20, `SIGNAL_TEXT.${key} vago demais`);
  }
  // O caso que motivou a rodada: o sinal é uma DISJUNÇÃO, então a frase enumera as três
  // causas em vez de escolher uma (um negócio com 4 avaliações não tem "perfil incompleto").
  assert.match(SIGNAL_TEXT.sparseProfile, /phone number/);
  assert.match(SIGNAL_TEXT.sparseProfile, /rating/);
  assert.match(SIGNAL_TEXT.sparseProfile, /reviews/);
  assert.ok(
    !/profile is incomplete/i.test(SIGNAL_TEXT.sparseProfile),
    "o veredito 'perfil incompleto' não pode voltar",
  );
  // "no website at all" afirmava mais do que se checou: o que se viu é a ficha do Google.
  assert.ok(!/no website at all/i.test(SIGNAL_TEXT.noSite));
  assert.match(SIGNAL_TEXT.noSite, /Google Business listing/);
  // Sinais medidos por ferramenta citam a ferramenta (é ela que sustenta a frase).
  assert.match(SIGNAL_TEXT.slow, /PageSpeed/);
  assert.match(SIGNAL_TEXT.notMobile, /PageSpeed/);
});

test("signalObservations: só entra sinal VERIFICADO (true), na ordem de SIGNAL_TEXT", () => {
  assert.deepEqual(signalObservations(undefined), [], "lead sem score não observou nada");
  assert.deepEqual(signalObservations(null), []);
  assert.deepEqual(signalObservations(NO_SIGNALS), [], "tudo ok = nenhuma observação");
  assert.deepEqual(signalObservations(withSignals({ sparseProfile: true })), [
    SIGNAL_TEXT.sparseProfile,
  ]);
  assert.deepEqual(signalObservations(withSignals({ slow: true, noHttps: true })), [
    SIGNAL_TEXT.noHttps,
    SIGNAL_TEXT.slow,
  ]);
});

test("observationsPrompt: sem sinal verificado, NENHUM defeito é alegado", () => {
  const semSinal = observationsPrompt(undefined);
  // A string que o sistema mandava sozinho — a fabricação que originou o achado.
  assert.ok(!/weak online presence/i.test(semSinal), "o defeito inventado não pode voltar");
  assert.ok(!/issues noticed/i.test(semSinal), "não há 'issues' a noticiar");
  assert.match(semSinal, /NONE/);
  assert.match(semSinal, /do NOT claim, imply, hint at or ask about/);
  assert.match(semSinal, /free preview website already built/, "o ângulo honesto é a prévia");
  // Lead não scorado e lead sem nenhum problema são o MESMO caso: nada verificado, nada a alegar.
  assert.equal(observationsPrompt(NO_SIGNALS), semSinal);
  assert.equal(observationsPrompt(null), semSinal);
});

test("observationsPrompt: com sinal, entrega só o que foi verificado", () => {
  const p = observationsPrompt(withSignals({ slow: true }));
  assert.ok(p.includes(SIGNAL_TEXT.slow), "a observação verificada precisa entrar");
  assert.ok(!p.includes(SIGNAL_TEXT.noSite), "sinal não verificado não vira observação");
  assert.match(p, /ONLY facts/);
  assert.match(p, /not state them more strongly than they are written/);
  assert.ok(!/NONE/.test(p), "com sinal, não é o caminho do 'nada verificado'");
});

// ---------------------------------------------------------------------------
// Trava EM CÓDIGO (o prompt não segura): marcador de nome + alegação de localidade
//
// Com IA REAL, o modelo desobedeceu as duas regras mais duras do prompt: emitiu `[Nombre]`
// (forma vetada por nome no prompt) e manteve "aquí en Valencia".
// ---------------------------------------------------------------------------

test("normalizeNamePlaceholder: todo marcador de nome vira o marcador canônico", () => {
  const emitidos = [
    "[Nombre]",
    "[Name]",
    "[NOME]",
    "[Prénom Nom]",
    "[Your name]",
    "[Your Name Here]",
    "[Ihr Name]",
    "[Uw naam]",
    "[Ditt namn]",
    "[Dit navn]",
    "[Il tuo nome]",
    "[Votre nom]",
    "[Nombre y apellido]",
    "[Vorname Nachname]",
    "[seu nome]",
  ];
  for (const marcador of emitidos) {
    const saida = normalizeNamePlaceholder(`Buenos días, me llamo ${marcador} y le escribo.`);
    assert.ok(
      saida.includes(NAME_PLACEHOLDER),
      `${marcador} não foi normalizado para ${NAME_PLACEHOLDER}`,
    );
    assert.ok(!/\[(?!seu nome\])/.test(saida), `sobrou outro marcador em "${saida}"`);
  }
});

test("normalizeNamePlaceholder: com nome real conhecido, resolve para o nome", () => {
  const saida = normalizeNamePlaceholder("Mi nombre es [Nombre].", "Duda");
  assert.equal(saida, "Mi nombre es Duda.");
  // Nome só de espaço = sem nome (mesma regra do prompt).
  assert.equal(normalizeNamePlaceholder("Ich bin [Ihr Name].", "  "), `Ich bin ${NAME_PLACEHOLDER}.`);
  assert.equal(normalizeNamePlaceholder("Ich bin [Ihr Name].", undefined), `Ich bin ${NAME_PLACEHOLDER}.`);
});

test("normalizeNamePlaceholder: marcador que NÃO é de pessoa fica intacto", () => {
  const casos = [
    "Sobre [nombre del negocio], vi su ficha.",
    "About [business name] — a quick note.",
    "Em [nome do negócio], na [cidade].",
    "Veja [link] e [website].",
    "Sobre [il nome dell'azienda].",
  ];
  for (const texto of casos) {
    assert.equal(normalizeNamePlaceholder(texto), texto, `marcador alheio foi trocado: ${texto}`);
    assert.equal(normalizeNamePlaceholder(texto, "Duda"), texto);
  }
});

test("normalizeNamePlaceholder: idempotente e cobre todas as ocorrências", () => {
  const uma = normalizeNamePlaceholder("Sou [Nombre]. Atenciosamente, [Your name]");
  assert.equal(uma, `Sou ${NAME_PLACEHOLDER}. Atenciosamente, ${NAME_PLACEHOLDER}`);
  assert.equal(normalizeNamePlaceholder(uma), uma, "rodar de novo não muda nada");
  assert.equal(normalizeNamePlaceholder(""), "");
});

test("detectLocalityClaims: pega a alegação de local em cada idioma do mercado", () => {
  const casos: [string, string, string][] = [
    ["Spanish", "Buenos días, le llamo aquí en Valencia para hablar de su web.", "Valencia"],
    ["French", "Bonjour, je travaille ici à Genève avec des commerces.", "Genève"],
    ["English", "Hi — I'm based in Dublin and noticed your listing.", "Dublin"],
    ["German", "Guten Tag, ich bin hier in Zürich unterwegs.", "Zürich"],
    ["Italian", "Buongiorno, sono qui a Milano e ho visto il vostro profilo.", "Milano"],
    [PT_PT, "Bom dia, estou aqui em Lisboa e vi a vossa página.", "Lisboa"],
    ["Dutch", "Goedendag, ik zit in Amsterdam en zag uw vermelding.", "Amsterdam"],
    ["Danish", "Hej, jeg arbejder her i København med hjemmesider.", "København"],
    ["Norwegian", "Hei, jeg er i Oslo og så oppføringen deres.", "Oslo"],
    ["Swedish", "Hej, jag jobbar här i Stockholm med webbplatser.", "Stockholm"],
  ];
  for (const [lang, texto, city] of casos) {
    const avisos = detectLocalityClaims(texto, { lang, city, field: "script" });
    assert.equal(avisos.length, 1, `${lang}: esperava 1 aviso, veio ${avisos.length} — "${texto}"`);
    const [aviso] = avisos;
    assert.equal(aviso.code, "locality-claim");
    assert.equal(aviso.field, "script");
    assert.ok(aviso.excerpt && aviso.excerpt.length > 0, `${lang}: aviso sem trecho`);
    assert.ok(aviso.message.includes("no script da ligação"), `${lang}: mensagem sem o campo`);
    assert.ok(/Brasil/.test(aviso.message), `${lang}: a mensagem precisa dizer o fato`);
    // NUNCA reescreve: quem não lê o idioma não pode editar o texto do prospect.
    assert.ok(!("text" in aviso), "o detector não devolve texto corrigido");
  }
});

test("detectLocalityClaims: o par exato que a IA real produziu dispara aviso", () => {
  // ES/Valencia e CH/Genebra — os dois casos observados em produção.
  assert.equal(
    detectLocalityClaims("Mi nombre es [seu nome] y estoy aquí en Valencia.", {
      lang: "Spanish",
      city: "Valencia",
      field: "body",
    }).length,
    1,
  );
  assert.equal(
    detectLocalityClaims("Je m'appelle [seu nome], ici à Genève.", {
      lang: "French",
      city: "Genève",
      field: "script",
    }).length,
    1,
  );
});

test("detectLocalityClaims: a cidade sozinha não é alegação de local", () => {
  const semAviso = [
    ["Spanish", "Le escribo sobre su restaurante en Valencia.", "Valencia"],
    ["English", "I noticed your listing for your shop in Dublin.", "Dublin"],
    [PT_PT, "Vi a página do vosso restaurante em Lisboa.", "Lisboa"],
    ["German", "Ich habe Ihren Eintrag in Zürich gesehen.", "Zürich"],
  ] as const;
  for (const [lang, texto, city] of semAviso) {
    assert.deepEqual(
      detectLocalityClaims(texto, { lang, city, field: "body" }),
      [],
      `falso positivo em ${lang}: "${texto}"`,
    );
  }
});

test("detectLocalityClaims: os padrões são por idioma (senão o aviso vira ruído)", () => {
  // "qui a" é o pronome relativo mais comum do francês — se o padrão italiano valesse para
  // todo idioma, TODO email francês dispararia e ninguém leria mais nenhum aviso.
  assert.deepEqual(
    detectLocalityClaims("Un site qui a besoin d'une mise à jour, comme le vôtre.", {
      lang: "French",
      city: "Genève",
      field: "body",
    }),
    [],
  );
  // "Sono a disposizione" é fórmula de cortesia italiana, não "estou em".
  assert.deepEqual(
    detectLocalityClaims("Resto sono a disposizione per qualsiasi domanda.", {
      lang: "Italian",
      city: "Milano",
      field: "script",
    }),
    [],
  );
  // Idioma sem padrões cadastrados: ainda assim a cidade + marcador é pega.
  const desconhecido = detectLocalityClaims("Estou aqui em Faro, junto ao mercado.", {
    lang: "__idioma_inexistente__",
    city: "Faro",
    field: "translation",
  });
  assert.equal(desconhecido.length, 1);
  assert.ok(desconhecido[0].message.includes("na tradução em pt-BR"));
});

test("detectLocalityClaims: um aviso por trecho, com teto (aviso demais é aviso nenhum)", () => {
  // A mesma frase casa com o padrão do espanhol E com a busca por cidade — um aviso só.
  const um = detectLocalityClaims(
    "Hola. Le llamo porque estoy aquí en Valencia esta semana y vi su ficha.",
    { lang: "Spanish", city: "Valencia", field: "body" },
  );
  assert.equal(um.length, 1);

  const muitos = detectLocalityClaims(
    Array.from({ length: 12 }, (_, i) => `Frase ${i}: aquí en Valencia trabajamos así.`).join(" "),
    { lang: "Spanish", city: "Valencia", field: "body" },
  );
  assert.ok(muitos.length <= 5, `teto de avisos furado: ${muitos.length}`);
  assert.ok(muitos.length > 0);
});

test("detectLocalityClaims: texto vazio ou lead sem cidade não quebra", () => {
  assert.deepEqual(detectLocalityClaims("", { lang: "Spanish", city: "Valencia", field: "body" }), []);
  assert.deepEqual(detectLocalityClaims("   ", { lang: "Spanish", field: "body" }), []);
  assert.equal(
    detectLocalityClaims("Le llamo aquí en su ciudad.", { lang: "Spanish", city: null, field: "body" })
      .length,
    1,
    "sem cidade em mãos, o padrão do idioma ainda vale",
  );
});
