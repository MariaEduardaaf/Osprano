import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyWebsite,
  computeScore,
  tierFromScore,
  isEmailable,
  isSearchableMarket,
  canContactByEmail,
  inferLegalForm,
  inferContactType,
  emailFields,
  normalizeInstagram,
  normalizeFacebook,
  clampDiscoveryCount,
  normalizeEmail,
  hasWaOptIn,
  MARKETS,
  OPT_IN_MARKETS,
  LAUNCH_MARKETS,
  SEARCHABLE_MARKETS,
  CITIES_BY_COUNTRY,
  swissLanguage,
  isKnownSwissCity,
  SWISS_DEFAULT_LANGUAGE,
  normalizeCategoryText,
  leadCategoryMatchesSearch,
  type Signals,
  type SwissLang,
} from "../convex/lib/domain.ts";

const NONE: Signals = {
  noSite: false,
  socialOnly: false,
  noHttps: false,
  notMobile: false,
  slow: false,
  sparseProfile: false,
};

test("classifyWebsite: real site", () => {
  const r = classifyWebsite("https://www.padaria-central.co.uk");
  assert.equal(r.hasRealSite, true);
  assert.equal(r.socialOnly, false);
  assert.equal(r.host, "padaria-central.co.uk");
});

test("classifyWebsite: Instagram = social-only", () => {
  const r = classifyWebsite("https://instagram.com/barbeariax");
  assert.equal(r.hasRealSite, false);
  assert.equal(r.socialOnly, true);
});

test("classifyWebsite: Linktree = social-only", () => {
  assert.equal(classifyWebsite("https://linktr.ee/x").socialOnly, true);
});

test("classifyWebsite: delivery link = social-only", () => {
  assert.equal(classifyWebsite("https://lieferando.de/restaurant-x").socialOnly, true);
});

test("classifyWebsite: empty = no site, not social", () => {
  const r = classifyWebsite("");
  assert.equal(r.hasRealSite, false);
  assert.equal(r.socialOnly, false);
});

test("computeScore: no signals = 0", () => {
  assert.equal(computeScore(NONE), 0);
});

test("computeScore: noSite is the heaviest single signal", () => {
  assert.equal(computeScore({ ...NONE, noSite: true }), 55);
  // no-site + a secondary signal reaches the "hot" tier
  assert.equal(tierFromScore(computeScore({ ...NONE, noSite: true, sparseProfile: true })), "hot");
});

test("computeScore: caps at 100", () => {
  const all: Signals = {
    noSite: true,
    socialOnly: true,
    noHttps: true,
    notMobile: true,
    slow: true,
    sparseProfile: true,
  };
  assert.equal(computeScore(all), 100);
});

test("tierFromScore thresholds", () => {
  assert.equal(tierFromScore(80), "hot");
  assert.equal(tierFromScore(70), "hot");
  assert.equal(tierFromScore(50), "warm");
  assert.equal(tierFromScore(40), "warm");
  assert.equal(tierFromScore(10), "cold");
});

test("isEmailable: needs positive evidence (incorporated or role inbox)", () => {
  // bare launch market, no evidence → not defensible
  assert.equal(isEmailable({ countryCode: "GB" }), false);
  assert.equal(isEmailable({ countryCode: "NL" }), false);
  // positive evidence unlocks it
  assert.equal(isEmailable({ countryCode: "GB", legalForm: "incorporated" }), true);
  assert.equal(isEmailable({ countryCode: "NL", contactType: "role" }), true);
});

test("isEmailable: opt-in market always blocked", () => {
  assert.equal(isEmailable({ countryCode: "DE", legalForm: "incorporated" }), false);
  assert.equal(isEmailable({ countryCode: "CH", contactType: "role" }), false);
});

test("isEmailable: TODO mercado opt-in nasce bloqueado, mesmo na combinação mais favorável", () => {
  // Critério de sucesso nº 1 da fase: nenhum lead de mercado opt-in pode nascer emailable.
  // "incorporated" + inbox de função (role) é a combinação MAIS defensável que existe —
  // se nem ela passa, nenhuma outra passa. Se alguém mover um destes para LAUNCH_MARKETS,
  // este teste quebra (é exatamente o ponto).
  for (const cc of OPT_IN_MARKETS) {
    assert.equal(
      isEmailable({ countryCode: cc, legalForm: "incorporated", contactType: "role" }),
      false,
      `mercado opt-in ${cc} não pode ser emailable`,
    );
  }
});

test("isEmailable: sole-trader trap", () => {
  assert.equal(isEmailable({ countryCode: "GB", legalForm: "sole_trader" }), false);
  assert.equal(isEmailable({ countryCode: "GB", contactType: "named" }), false);
  // named individual beats incorporation (a person = opt-in)
  assert.equal(
    isEmailable({ countryCode: "GB", legalForm: "incorporated", contactType: "named" }),
    false,
  );
  assert.equal(
    isEmailable({ countryCode: "GB", legalForm: "incorporated", contactType: "role" }),
    true,
  );
});

test("inferLegalForm: name suffix", () => {
  assert.equal(inferLegalForm("Smith & Sons Ltd", "GB"), "incorporated");
  assert.equal(inferLegalForm("Jansen B.V.", "NL"), "incorporated");
  assert.equal(inferLegalForm("Nordic Bygg AS", "NO"), "incorporated");
  assert.equal(inferLegalForm("The Corner Café", "GB"), "unknown");
  assert.equal(inferLegalForm("Padaria X", "PT"), "unknown"); // non-launch market
});

test("inferContactType: role vs named", () => {
  assert.equal(inferContactType("info@x.co.uk"), "role");
  assert.equal(inferContactType("bookings2024@x.com"), "role");
  assert.equal(inferContactType("john.smith@x.com"), "named");
  assert.equal(inferContactType("maria@x.com"), "named");
  assert.equal(inferContactType(undefined), "unknown");
  assert.equal(inferContactType("x1y2z3@x.com"), "unknown");
});

test("emailFields: role inbox vira contactType role e destrava emailable no launch market", () => {
  const r = emailFields({ countryCode: "GB", legalForm: "unknown" }, "info@negocio.co.uk");
  assert.equal(r.email, "info@negocio.co.uk");
  assert.equal(r.contactType, "role");
  assert.equal(r.emailable, true);
});

test("emailFields: endereço nomeado vira contactType named e NÃO destrava emailable", () => {
  const r = emailFields({ countryCode: "GB", legalForm: "unknown" }, "joao@negocio.co.uk");
  assert.equal(r.contactType, "named");
  assert.equal(r.emailable, false);
});

test("emailFields: email undefined vira contactType unknown", () => {
  const r = emailFields({ countryCode: "GB", legalForm: "unknown" }, undefined);
  assert.equal(r.email, undefined);
  assert.equal(r.contactType, "unknown");
  assert.equal(r.emailable, false);
});

test("emailFields: lead incorporado no Reino Unido — role inbox abordável, named não", () => {
  // Mesmo cenário do lead do Reino Unido que motivou a feature.
  const role = emailFields({ countryCode: "GB", legalForm: "incorporated" }, "info@negocio.co.uk");
  assert.equal(role.emailable, true);
  const named = emailFields({ countryCode: "GB", legalForm: "incorporated" }, "joao@negocio.co.uk");
  assert.equal(named.emailable, false);
});

// ---------------------------------------------------------------------------
// normalizeInstagram / normalizeFacebook
// ---------------------------------------------------------------------------

test("normalizeInstagram: handle simples baixa a caixa", () => {
  assert.equal(normalizeInstagram("PadariaCentral"), "padariacentral");
});

test("normalizeInstagram: tira @ inicial", () => {
  assert.equal(normalizeInstagram("@padaria.central"), "padaria.central");
});

test("normalizeInstagram: tira o prefixo de URL, com ou sem www, e a barra final", () => {
  assert.equal(normalizeInstagram("https://instagram.com/padaria/"), "padaria");
  assert.equal(normalizeInstagram("https://www.instagram.com/padaria"), "padaria");
  assert.equal(normalizeInstagram("http://www.instagram.com/padaria/"), "padaria");
});

test("normalizeInstagram: trim e vazio viram undefined", () => {
  assert.equal(normalizeInstagram("  "), undefined);
  assert.equal(normalizeInstagram(""), undefined);
  assert.equal(normalizeInstagram(undefined), undefined);
  assert.equal(normalizeInstagram("  @Padaria  "), "padaria");
});

test("normalizeFacebook: slug vira URL completa", () => {
  assert.equal(normalizeFacebook("minha.padaria"), "https://www.facebook.com/minha.padaria");
});

test("normalizeFacebook: URL já pronta fica intacta", () => {
  assert.equal(
    normalizeFacebook("https://www.facebook.com/minha.padaria"),
    "https://www.facebook.com/minha.padaria",
  );
});

test("normalizeFacebook: URL sem esquema ganha https://", () => {
  assert.equal(
    normalizeFacebook("facebook.com/minha.padaria"),
    "https://facebook.com/minha.padaria",
  );
  assert.equal(
    normalizeFacebook("www.facebook.com/minha.padaria"),
    "https://www.facebook.com/minha.padaria",
  );
});

test("normalizeFacebook: tira @ inicial de um slug", () => {
  assert.equal(normalizeFacebook("@minhapadaria"), "https://www.facebook.com/minhapadaria");
});

test("normalizeFacebook: trim e vazio viram undefined", () => {
  assert.equal(normalizeFacebook("  "), undefined);
  assert.equal(normalizeFacebook(""), undefined);
  assert.equal(normalizeFacebook(undefined), undefined);
});

test("clampDiscoveryCount: default when undefined", () => {
  assert.equal(clampDiscoveryCount(undefined), 20);
});

test("clampDiscoveryCount: floor at 1 for negative/zero", () => {
  assert.equal(clampDiscoveryCount(-5), 1);
  assert.equal(clampDiscoveryCount(0), 1);
});

test("clampDiscoveryCount: non-finite falls back to default", () => {
  assert.equal(clampDiscoveryCount(Number.NaN), 20);
});

test("clampDiscoveryCount: rounds decimals", () => {
  assert.equal(clampDiscoveryCount(3.6), 4);
});

test("clampDiscoveryCount: ceiling at 50", () => {
  assert.equal(clampDiscoveryCount(999), 50);
});

test("clampDiscoveryCount: exact boundaries", () => {
  assert.equal(clampDiscoveryCount(1), 1);
  assert.equal(clampDiscoveryCount(50), 50);
});

test("normalizeEmail: trims and lowercases", () => {
  assert.equal(normalizeEmail("  Info@Business.COM "), "info@business.com");
  assert.equal(normalizeEmail("a@b.com"), "a@b.com");
});

test("hasWaOptIn: only true with a positive timestamp", () => {
  assert.equal(hasWaOptIn({}), false);
  assert.equal(hasWaOptIn({ waOptInAt: undefined }), false);
  assert.equal(hasWaOptIn({ waOptInAt: 0 }), false);
  assert.equal(hasWaOptIn({ waOptInAt: 1700000000000 }), true);
});

test("isSearchableMarket: launch + opt-in markets are searchable, others are not", () => {
  assert.equal(isSearchableMarket("GB"), true); // launch
  assert.equal(isSearchableMarket("ES"), true); // opt-in
  assert.equal(isSearchableMarket("PT"), true); // opt-in, new
  assert.equal(isSearchableMarket("FR"), false); // deferred market, not in either list
});

test("canContactByEmail: emailable=true always wins; contactOptInAt overrides regardless of market", () => {
  assert.equal(canContactByEmail({ emailable: true }), true);
  assert.equal(canContactByEmail({ emailable: false }), false);
  assert.equal(canContactByEmail({ emailable: false, contactOptInAt: Date.now() }), true);
  assert.equal(canContactByEmail({}), false);
});

test("hasWaOptIn: generalized to accept either waOptInAt or contactOptInAt", () => {
  assert.equal(hasWaOptIn({ waOptInAt: Date.now() }), true); // legacy field still works
  assert.equal(hasWaOptIn({ contactOptInAt: Date.now() }), true); // new field also unlocks WhatsApp
  assert.equal(hasWaOptIn({}), false);
});

test("MARKETS.PT existe como mercado opt-in com estado de revisão jurídica", () => {
  assert.equal(MARKETS.PT.coldEmail, "opt_in");
  // O VALOR ("pending" vs "validated") muda quando o país for validado — o que não
  // pode mudar é existir um estado. O valor de hoje está no teste de estado atual abaixo.
  assert.ok(
    MARKETS.PT.legalReview === "pending" || MARKETS.PT.legalReview === "validated",
    "PT é opt-in, logo precisa de um estado de revisão jurídica",
  );
});

test("invariante: todo mercado opt-in carrega um estado de revisão jurídica; nenhum launch carrega", () => {
  // O que se trava aqui é o MECANISMO, não o dado: um mercado opt-in SEM estado jurídico
  // (legalReview undefined) é o bug de verdade — a UI deriva o aviso jurídico desse campo,
  // então um undefined vira "sem aviso" silencioso num país onde cold email é ilegal.
  // Marcar um país como "validated" (OPTIN-06) é evolução esperada e NÃO pode quebrar a suíte.
  for (const cc of OPT_IN_MARKETS) {
    const market = MARKETS[cc];
    assert.ok(market, `mercado opt-in ${cc} precisa existir em MARKETS`);
    assert.equal(market.coldEmail, "opt_in", `${cc} está em OPT_IN_MARKETS mas não é coldEmail=opt_in`);
    assert.ok(
      market.legalReview === "pending" || market.legalReview === "validated",
      `mercado opt-in ${cc} precisa de legalReview ("pending" ou "validated"), veio ${String(market.legalReview)}`,
    );
  }
  // Mercados launch são opt-out/conditional por regime: revisão jurídica não se aplica.
  for (const cc of LAUNCH_MARKETS) {
    const market = MARKETS[cc];
    assert.ok(market, `mercado launch ${cc} precisa existir em MARKETS`);
    assert.notEqual(market.coldEmail, "opt_in", `${cc} está em LAUNCH_MARKETS mas é coldEmail=opt_in`);
    assert.equal(
      market.legalReview,
      undefined,
      `mercado launch ${cc} não deveria carregar legalReview`,
    );
  }
});

test("invariante: todo código de SEARCHABLE_MARKETS existe como chave em MARKETS", () => {
  // Um código pesquisável sem entrada em MARKETS quebra bandeira, nome e aviso jurídico na UI.
  for (const cc of SEARCHABLE_MARKETS) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(MARKETS, cc),
      `mercado pesquisável ${cc} não existe em MARKETS`,
    );
    assert.equal(isSearchableMarket(cc), true, `${cc} deveria ser pesquisável`);
  }
});

// ---------------------------------------------------------------------------
// Suíça multilíngue
// ---------------------------------------------------------------------------

test("swissLanguage: as três regiões resolvem pela forma LOCAL", () => {
  assert.equal(swissLanguage("Genève"), "fr");
  assert.equal(swissLanguage("Zürich"), "de");
  assert.equal(swissLanguage("Lugano"), "it");
});

test("swissLanguage: forma INGLESA também resolve (cobertura defensiva, não a origem principal)", () => {
  // Correção de fato: o Places NÃO é a origem do nome da cidade — convex/places.ts
  // grava `city: args.city` (a forma local escolhida no select), e o `languageCode: "en"`
  // só afeta displayName/formattedAddress. Estas formas inglesas cobrem criação
  // manual (texto livre) e colagem de endereço, não o fluxo de descoberta.
  assert.equal(swissLanguage("Geneva"), "fr");
  assert.equal(swissLanguage("Zurich"), "de");
  assert.equal(swissLanguage("Basle"), "de");
  assert.equal(swissLanguage("Berne"), "de");
  assert.equal(swissLanguage("Lucerne"), "de");
  assert.equal(swissLanguage("Neuchatel"), "fr");
});

test("swissLanguage: insensível a caixa, acento e espaço em volta", () => {
  for (const form of ["GENEVE", "geneve", "Genève", "  genÈve  ", "GENÈVE"]) {
    assert.equal(swissLanguage(form), "fr", `"${form}" deveria resolver para francês`);
  }
  assert.equal(swissLanguage("ZURICH"), "de");
  assert.equal(swissLanguage("lugano"), "it");
});

test("swissLanguage: abreviação e separadores ('St. Gallen' vs 'Sankt Gallen' vs 'St Gallen')", () => {
  assert.equal(swissLanguage("St. Gallen"), "de");
  assert.equal(swissLanguage("Sankt Gallen"), "de");
  assert.equal(swissLanguage("St Gallen"), "de");
  assert.equal(swissLanguage("Saint Gallen"), "de");
  assert.equal(isKnownSwissCity("Saint Gallen"), true); // reconhecida, não fallback
  assert.equal(swissLanguage("Yverdon-les-Bains"), "fr");
  assert.equal(swissLanguage("yverdon les bains"), "fr");
  assert.equal(swissLanguage("La Chaux-de-Fonds"), "fr");
});

test("swissLanguage: entrada não reconhecida cai no ALEMÃO — fallback explícito", () => {
  assert.equal(SWISS_DEFAULT_LANGUAGE, "de");
  assert.equal(swissLanguage("Cidade Que Não Existe"), "de");
  assert.equal(swissLanguage(""), "de");
  assert.equal(swissLanguage("   "), "de");
  assert.equal(swissLanguage(undefined), "de");
  assert.equal(swissLanguage(null), "de");
});

test("swissLanguage: cidades oficialmente bilíngues seguem a maioria linguística", () => {
  // Aproximação deliberada: Fribourg ~63% francófona, Biel/Bienne ~55% germanófona.
  assert.equal(swissLanguage("Fribourg"), "fr");
  assert.equal(swissLanguage("Freiburg"), "fr"); // forma alemã da MESMA cidade suíça
  assert.equal(isKnownSwissCity("Freiburg"), true);
  assert.equal(swissLanguage("Biel/Bienne"), "de");
  assert.equal(swissLanguage("Biel"), "de");
  assert.equal(swissLanguage("Bienne"), "de");
});

test("isKnownSwissCity: distingue 'reconhecida' de 'caiu no fallback'", () => {
  // Sem isto, um alemão acidental é indistinguível de um alemão correto.
  assert.equal(isKnownSwissCity("Zürich"), true);
  assert.equal(isKnownSwissCity("Geneva"), true);
  assert.equal(isKnownSwissCity("Cidade Que Não Existe"), false);
  assert.equal(isKnownSwissCity(""), false);
  assert.equal(isKnownSwissCity(undefined), false);
  assert.equal(isKnownSwissCity(null), false);
});

test("invariante: toda cidade do select suíço está NO mapa (nenhuma cai no fallback por acidente)", () => {
  // O bug que isto trava: acrescentar "Locarno" ao select e esquecer do mapa —
  // swissLanguage devolveria "de" sem erro nenhum, e o prospect de Ticino
  // receberia ligação, email e site em alemão.
  const cities = CITIES_BY_COUNTRY.CH;
  assert.ok(cities && cities.length > 0, "CH precisa ter cidades no select");
  for (const city of cities) {
    assert.equal(
      isKnownSwissCity(city),
      true,
      `"${city}" está no select de CH mas não no mapa linguístico — cairia no fallback alemão`,
    );
  }
});

test("swissLanguage: subúrbio francófono da aglomeração de Genebra não cai no fallback", () => {
  // O risco REAL: convex/foursquare.ts grava `p.location?.locality ?? args.city`.
  // A locality vem do provedor e costuma ser a comuna, não a cidade-núcleo — sem
  // mapa, um lead de Chêne-Bougeries (100% francófono) sairia em alemão, calado.
  assert.equal(swissLanguage("Chêne-Bougeries"), "fr");
  assert.equal(swissLanguage("Plan-les-Ouates"), "fr");
  assert.equal(swissLanguage("Le Grand-Saconnex"), "fr");
  assert.equal(isKnownSwissCity("Prégny-Chambésy"), true);
  // Lausanne e Neuchâtel têm a mesma exposição
  assert.equal(swissLanguage("Chavannes-près-Renens"), "fr");
  assert.equal(swissLanguage("Peseux"), "fr");
});

test("swissLanguage: comune da aglomeração de Lugano/Locarno resolve para italiano", () => {
  assert.equal(swissLanguage("Paradiso"), "it");
  assert.equal(swissLanguage("Pregassona"), "it");
  assert.equal(swissLanguage("Muralto"), "it");
  assert.equal(isKnownSwissCity("Gambarogno"), true);
});

test("swissLanguage: subúrbio germanófono resolve para alemão POR MAPA, não por fallback", () => {
  // A distinção importa: aqui "de" é uma resposta, não a ausência de resposta.
  for (const city of ["Oerlikon", "Riehen", "Wallisellen", "Ostermundigen"]) {
    assert.equal(swissLanguage(city), "de", `${city} deveria ser alemão`);
    assert.equal(isKnownSwissCity(city), true, `${city} deveria estar no mapa, não no fallback`);
  }
});

test("swissLanguage: exônimo alemão de cidade francófona mapeia para a REGIÃO, não para a língua do nome", () => {
  // "Genf" é alemão, mas Genebra é francófona: o idioma sai da região, não da grafia.
  assert.equal(swissLanguage("Genf"), "fr");
  assert.equal(swissLanguage("Neuenburg"), "fr"); // Neuchâtel
  assert.equal(swissLanguage("Sitten"), "fr"); // Sion
});

test("swissLanguage: exônimo italiano de cidade germanófona mapeia para alemão", () => {
  assert.equal(swissLanguage("Zurigo"), "de");
  assert.equal(swissLanguage("Basilea"), "de");
  assert.equal(swissLanguage("San Gallo"), "de");
  // e o italiano de cidade francófona continua francês
  assert.equal(swissLanguage("Ginevra"), "fr");
  assert.equal(swissLanguage("Losanna"), "fr");
});

test("swissLanguage: exônimo francês de cidade germanófona mapeia para alemão", () => {
  assert.equal(swissLanguage("Bâle"), "de");
  assert.equal(swissLanguage("Bale"), "de"); // sem acento, como chega em muito dado real
  assert.equal(swissLanguage("Coire"), "de");
  assert.equal(swissLanguage("Saint-Gall"), "de");
  assert.equal(swissLanguage("Schaffhouse"), "de");
});

test("swissLanguage: sufixo de país é tolerado sem virar fallback", () => {
  assert.equal(swissLanguage("Geneve, Switzerland"), "fr");
  assert.equal(swissLanguage("Genève, Suisse"), "fr");
  assert.equal(swissLanguage("Zürich, Schweiz"), "de");
  assert.equal(swissLanguage("Lugano, Svizzera"), "it");
  assert.equal(isKnownSwissCity("Geneve, Switzerland"), true);
});

test("swissLanguage: sufixo cantonal é tolerado sem virar fallback", () => {
  assert.equal(swissLanguage("Neuchâtel NE"), "fr");
  assert.equal(swissLanguage("Lausanne VD"), "fr");
  assert.equal(swissLanguage("Carouge GE"), "fr");
  assert.equal(swissLanguage("Lugano TI"), "it");
  assert.equal(swissLanguage("Winterthur ZH"), "de");
  assert.equal(swissLanguage("Neuchâtel, NE, Switzerland"), "fr"); // empilhado
});

test("normalização de sufixo não pode comer nome legítimo nem esvaziar a chave", () => {
  // Guardas do corte de sufixo: nomes com abreviação/barra continuam intactos…
  assert.equal(swissLanguage("St. Gallen"), "de");
  assert.equal(swissLanguage("St. Gallen SG"), "de");
  assert.equal(swissLanguage("Biel/Bienne"), "de");
  assert.equal(swissLanguage("Biel/Bienne BE"), "de");
  // …e uma entrada que é SÓ o cantão não vira string vazia casando com qualquer coisa:
  // continua desconhecida (fallback), que é o comportamento honesto.
  assert.equal(isKnownSwissCity("GE"), false);
  assert.equal(swissLanguage("GE"), "de");
});

test("invariante: o select suíço cobre as três regiões linguísticas", () => {
  // Hoje a lista era quase só germanófona; um select monolíngue esconde o bug.
  const langs = new Set<SwissLang>(CITIES_BY_COUNTRY.CH.map((c) => swissLanguage(c)));
  for (const lang of ["de", "fr", "it"] as const) {
    assert.ok(langs.has(lang), `nenhuma cidade "${lang}" no select suíço`);
  }
});

test("estado atual: nenhum mercado opt-in foi validado juridicamente ainda (esperado mudar após OPTIN-06)", () => {
  // Este teste DOCUMENTA o dado de hoje, não protege um mecanismo. Quando a revisão
  // jurídica de um país concluir, atualize a lista abaixo — a invariante acima é que manda.
  const validated = OPT_IN_MARKETS.filter((cc) => MARKETS[cc].legalReview === "validated");
  assert.deepEqual(
    validated,
    [],
    `mercados já validados: ${validated.join(", ")} — atualize este teste de estado atual`,
  );
});

// ---------------------------------------------------------------------------
// Filtro de Leads (FILTRO-01): categoria do lead vs. termo buscado no formulário
// ---------------------------------------------------------------------------

test("normalizeCategoryText: minúsculo, '_'/'-' viram espaço, espaços colapsam", () => {
  assert.equal(normalizeCategoryText("barber_shop"), "barber shop");
  assert.equal(normalizeCategoryText("Hair-Salon"), "hair salon");
  assert.equal(normalizeCategoryText("  Pizza   Restaurant  "), "pizza restaurant");
});

test("leadCategoryMatchesSearch: snake_case do Google Places casa com o termo buscado", () => {
  assert.equal(leadCategoryMatchesSearch("barber_shop", "barber shop"), true);
  assert.equal(leadCategoryMatchesSearch("hair_salon", "hair salon"), true);
  assert.equal(leadCategoryMatchesSearch("pizza_restaurant", "pizza restaurant"), true);
});

test("leadCategoryMatchesSearch: mesma categoria do OSM (já sem underscore) casa direto", () => {
  assert.equal(leadCategoryMatchesSearch("barber shop", "barber shop"), true);
});

test("leadCategoryMatchesSearch: categoria totalmente diferente não casa", () => {
  assert.equal(leadCategoryMatchesSearch("dentist", "barber shop"), false);
  assert.equal(leadCategoryMatchesSearch("gym", "restaurant"), false);
});

test("leadCategoryMatchesSearch: sem categoria buscada, não filtra (tudo casa)", () => {
  assert.equal(leadCategoryMatchesSearch("dentist", ""), true);
  assert.equal(leadCategoryMatchesSearch(undefined, ""), true);
});

test("leadCategoryMatchesSearch: lead sem categoria não casa com busca com categoria", () => {
  assert.equal(leadCategoryMatchesSearch(undefined, "barber shop"), false);
});
