import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LANG,
  NAME_PLACEHOLDER,
  PT_PT,
  callScriptSystemPrompt,
  emailSystemPrompt,
  fallbackSubject,
  langForLead,
} from "../convex/lib/outreachAi.ts";
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

test("emailSystemPrompt: o corpo se identifica pelo nome e mantém o opt-out", () => {
  const prompt = emailSystemPrompt("Dutch");
  assert.ok(/identify the sender by name/.test(prompt));
  assert.ok(/one-line opt-out/.test(prompt), "o corpo continua exigindo opt-out");
  assert.ok(/ENTIRE email \(subject included\) in Dutch/.test(prompt));
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
