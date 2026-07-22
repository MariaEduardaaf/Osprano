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
  clampDiscoveryCount,
  normalizeEmail,
  hasWaOptIn,
  MARKETS,
  OPT_IN_MARKETS,
  LAUNCH_MARKETS,
  SEARCHABLE_MARKETS,
  type Signals,
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
