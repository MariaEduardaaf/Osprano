import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currencyForCountry,
  currencySymbol,
  formatMoney,
  addDays,
  daysBetween,
  dateInputToTimestamp,
  toDateInputValue,
  formatDay,
  formatRelative,
  nextActionOf,
  actionStatus,
  stalledDays,
  STALLED_AFTER_DAYS,
  isStalled,
  compareByNextAction,
  LOST_REASONS,
  lostReasonLabel,
} from "../convex/lib/domain.ts";

/** Timestamps SEMPRE pelo construtor local (nunca string ISO com Z): o CI em UTC não pode mentir. */
const T = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();

// ---------------------------------------------------------------------------
// Moeda
// ---------------------------------------------------------------------------

test("currencyForCountry: GB/SE/NO/CH/DK têm moeda própria; qualquer outro é EUR", () => {
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("SE"), "SEK");
  assert.equal(currencyForCountry("NO"), "NOK");
  assert.equal(currencyForCountry("CH"), "CHF");
  assert.equal(currencyForCountry("DK"), "DKK");
  assert.equal(currencyForCountry("NL"), "EUR");
  assert.equal(currencyForCountry("XX"), "EUR");
  assert.equal(currencyForCountry("gb"), "GBP");
});

test("currencySymbol", () => {
  assert.equal(currencySymbol("EUR"), "€");
  assert.equal(currencySymbol("GBP"), "£");
  assert.equal(currencySymbol("SEK"), "kr");
  assert.equal(currencySymbol("NOK"), "kr");
  assert.equal(currencySymbol("DKK"), "kr");
  assert.equal(currencySymbol("CHF"), "CHF");
});

test("formatMoney: quatro formatos, sem centavos, milhar com ponto", () => {
  assert.equal(formatMoney(340, "EUR"), "€340");
  assert.equal(formatMoney(340, "GBP"), "£340");
  assert.equal(formatMoney(340, "SEK"), "340 kr");
  assert.equal(formatMoney(340, "NOK"), "340 kr");
  assert.equal(formatMoney(340, "DKK"), "340 kr");
  assert.equal(formatMoney(340, "CHF"), "CHF 340");
  assert.equal(formatMoney(1200, "EUR"), "€1.200");
  assert.equal(formatMoney(1234567, "GBP"), "£1.234.567");
  assert.equal(formatMoney(339.5, "EUR"), "€340");
  assert.equal(formatMoney(339.4, "EUR"), "€339");
  assert.equal(formatMoney(0, "EUR"), "€0");
});

// ---------------------------------------------------------------------------
// Datas civis (fuso local). Setembro = mês 8, outubro = 9 (0-based).
// ---------------------------------------------------------------------------

test("addDays: mesmo horário local, n dias civis depois (vira mês, aceita negativo)", () => {
  assert.equal(addDays(T(2026, 8, 16, 9, 30), 7), T(2026, 8, 23, 9, 30));
  assert.equal(addDays(T(2026, 8, 30, 9, 30), 1), T(2026, 9, 1, 9, 30));
  assert.equal(addDays(T(2026, 8, 16, 9, 30), -3), T(2026, 8, 13, 9, 30));
});

test("addDays: atravessa a virada do horário de verão sem virar 23 h", () => {
  // 25/10/2026 é o último domingo de outubro (fim do horário de verão na Europa; a máquina
  // está em Europe/Madrid). Em fuso sem horário de verão (CI em UTC) as igualdades continuam
  // verdadeiras, então o teste nunca mente.
  const r1 = addDays(T(2026, 9, 25, 0, 0), 1);
  assert.equal(r1, T(2026, 9, 26, 0, 0));
  assert.equal(new Date(r1).getHours(), 0);
  const r3 = addDays(T(2026, 9, 24, 0, 0), 3);
  assert.equal(r3, T(2026, 9, 27, 0, 0));
  assert.equal(new Date(r3).getHours(), 0);
  // 29/03/2026: entrada no horário de verão
  const rMar = addDays(T(2026, 2, 28, 0, 0), 1);
  assert.equal(rMar, T(2026, 2, 29, 0, 0));
  assert.equal(new Date(rMar).getHours(), 0);
});

test("daysBetween: dias civis inteiros, sinal pela ordem, robusto ao horário de verão", () => {
  assert.equal(daysBetween(T(2026, 8, 16, 23, 59), T(2026, 8, 17, 0, 0)), 1);
  assert.equal(daysBetween(T(2026, 8, 16, 0, 0), T(2026, 8, 16, 23, 59)), 0);
  assert.equal(daysBetween(T(2026, 8, 17, 0, 0), T(2026, 8, 16, 23, 59)), -1);
  assert.equal(daysBetween(T(2026, 8, 4, 12, 0), T(2026, 8, 16, 12, 0)), 12);
  assert.equal(daysBetween(T(2026, 9, 24, 12, 0), T(2026, 9, 26, 12, 0)), 2);
});

test("dateInputToTimestamp: meia-noite LOCAL do dia; inválido devolve null", () => {
  const at = dateInputToTimestamp("2026-09-23");
  assert.equal(at, T(2026, 8, 23));
  assert.equal(new Date(at!).getHours(), 0);
  assert.equal(dateInputToTimestamp(""), null);
  assert.equal(dateInputToTimestamp("23/09/2026"), null);
  assert.equal(dateInputToTimestamp("2026-02-31"), null);
});

test("toDateInputValue: YYYY-MM-DD local, com zero à esquerda", () => {
  assert.equal(toDateInputValue(T(2026, 8, 3, 23, 59)), "2026-09-03");
  assert.equal(toDateInputValue(T(2026, 11, 25, 0, 0)), "2026-12-25");
  assert.equal(toDateInputValue(T(2026, 0, 1, 0, 0)), "2026-01-01");
});

test("formatDay: hoje, ontem, amanhã, senão dia + mês abreviado", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(formatDay(T(2026, 8, 16, 23, 59), now), "hoje");
  assert.equal(formatDay(T(2026, 8, 15, 0, 0), now), "ontem");
  assert.equal(formatDay(T(2026, 8, 17, 0, 0), now), "amanhã");
  assert.equal(formatDay(T(2026, 8, 23, 0, 0), now), "23 set");
  assert.equal(formatDay(T(2026, 0, 2, 0, 0), now), "2 jan");
});

test("formatRelative: agora, minutos, horas, ontem, senão formatDay", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(formatRelative(now - 30_000, now), "agora");
  assert.equal(formatRelative(now - 5 * 60_000, now), "há 5 min");
  assert.equal(formatRelative(now - 2 * 3_600_000, now), "há 2 h");
  assert.equal(formatRelative(T(2026, 8, 15, 20, 0), now), "ontem");
  assert.equal(formatRelative(T(2026, 8, 12, 10, 0), now), "12 set");
});

// ---------------------------------------------------------------------------
// Próxima ação e "parado"
// ---------------------------------------------------------------------------

test("nextActionOf: com e sem ação", () => {
  assert.deepEqual(nextActionOf({ nextActionAt: 1000, nextActionNote: "ligar" }), { at: 1000, note: "ligar" });
  assert.equal(nextActionOf({}), null);
  assert.equal(nextActionOf({ nextActionNote: "nota solta, sem data" }), null);
});

test("actionStatus: ontem 23:59 atrasada; hoje 00:00 e 23:59 hoje; amanhã 00:00 futura", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(actionStatus(T(2026, 8, 15, 23, 59), now), "overdue");
  assert.equal(actionStatus(T(2026, 8, 16, 0, 0), now), "today");
  assert.equal(actionStatus(T(2026, 8, 16, 23, 59), now), "today");
  assert.equal(actionStatus(T(2026, 8, 17, 0, 0), now), "upcoming");
});

test("stalledDays: com ação null; converted e lost null; senão dias desde stageUpdatedAt", () => {
  const now = T(2026, 8, 16, 15, 0);
  const at = T(2026, 8, 4, 10, 0); // 12 dias civis antes
  assert.equal(stalledDays({ stage: "approached", stageUpdatedAt: at, nextActionAt: now, nextActionNote: "x" }, now), null);
  assert.equal(stalledDays({ stage: "converted", stageUpdatedAt: at }, now), null);
  assert.equal(stalledDays({ stage: "lost", stageUpdatedAt: at }, now), null);
  assert.equal(stalledDays({ stage: "approached", stageUpdatedAt: at }, now), 12);
  assert.equal(stalledDays({ stage: "base", stageUpdatedAt: now }, now), 0);
});

test("isStalled: 6 dias não, 7 dias sim; convertido nunca", () => {
  const now = T(2026, 8, 16, 15, 0);
  assert.equal(STALLED_AFTER_DAYS, 7);
  assert.equal(isStalled({ stage: "base", stageUpdatedAt: T(2026, 8, 10, 15, 0) }, now), false);
  assert.equal(isStalled({ stage: "base", stageUpdatedAt: T(2026, 8, 9, 15, 0) }, now), true);
  assert.equal(isStalled({ stage: "converted", stageUpdatedAt: T(2026, 7, 1) }, now), false);
});

test("compareByNextAction: com ação antes de sem ação; at crescente; sem ação por score decrescente", () => {
  const withLate = { nextActionAt: 200, score: 10 };
  const withEarly = { nextActionAt: 100, score: 90 };
  const noneHi = { score: 80 };
  const noneLo = { score: 20 };
  assert.ok(compareByNextAction(withLate, noneHi) < 0);
  assert.ok(compareByNextAction(noneHi, withLate) > 0);
  assert.ok(compareByNextAction(withEarly, withLate) < 0);
  assert.ok(compareByNextAction(noneHi, noneLo) < 0);
  assert.deepEqual([noneLo, withLate, noneHi, withEarly].sort(compareByNextAction), [withEarly, withLate, noneHi, noneLo]);
});

// ---------------------------------------------------------------------------
// Motivo de perda
// ---------------------------------------------------------------------------

test("LOST_REASONS: cinco motivos, nesta ordem", () => {
  assert.deepEqual(
    LOST_REASONS.map((r) => r.id),
    ["too_expensive", "has_site", "no_response", "not_interested", "other"],
  );
  assert.deepEqual(
    LOST_REASONS.map((r) => r.label),
    ["Caro demais", "Já tem site", "Sem resposta", "Não quer", "Outro"],
  );
});

test("lostReasonLabel: rótulo, ou undefined para ausente/desconhecido", () => {
  assert.equal(lostReasonLabel("too_expensive"), "Caro demais");
  assert.equal(lostReasonLabel("other"), "Outro");
  assert.equal(lostReasonLabel(undefined), undefined);
  assert.equal(lostReasonLabel(null), undefined);
  assert.equal(lostReasonLabel("nope"), undefined);
});
