---
phase: 4
slug: modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) via `node --experimental-strip-types --test` |
| **Config file** | none — `package.json` script `test` roda `tests/*.test.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `npx convex codegen && pnpm typecheck && pnpm lint && pnpm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `npx convex codegen && pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 04-01 | 1 | OPTIN-01, OPTIN-04, OPTIN-06 | unit (isSearchableMarket, canContactByEmail, hasWaOptIn, MARKETS.PT, legalReview) + regressão isEmailable | `pnpm test` + `grep -c "isLaunchMarket(input.countryCode)"` | ✅ | ✅ green |
| 04-01-T2 | 04-01 | 1 | OPTIN-03, OPTIN-04 | schema/typecheck + grep dos campos | `npx convex codegen && pnpm typecheck` + grep | ✅ | ✅ green |
| 04-02-T1 | 04-02 | 2 | OPTIN-01 | grep-negativo (isLaunchMarket ausente) + grep-positivo (isSearchableMarket) + typecheck | `grep -c "isLaunchMarket"` + `pnpm typecheck` | ✅ | ✅ green |
| 04-03-T1 | 04-03 | 2 | OPTIN-04, OPTIN-03 | typecheck + grep (recordContactOptIn, setCallScript, contact_opt_in) | `npx convex codegen && pnpm typecheck` + grep | ✅ | ✅ green |
| 04-03-T2 | 04-03 | 2 | OPTIN-03 | unit (LANG cobre OPT_IN_MARKETS) + grep (writeCallScript) | `pnpm test` + grep | ✅ | ✅ green |
| 04-03-T3 | 04-03 | 2 | OPTIN-05, OPTIN-03 | grep (canContactByEmail 2×, callScript, isSuppressed 2×) + typecheck | `grep -c "canContactByEmail(lead)"` + `pnpm typecheck` | ✅ | ✅ green |
| 04-04-T1 | 04-04 | 2 | OPTIN-04 | unit (optOutFooter es/it/pt/de/da) + grep | `pnpm test` + grep | ✅ | ✅ green |
| 04-05-T1 | 04-05 | 3 | OPTIN-04 | typecheck + lint + grep (recordContactOptIn, vocabulário) | `pnpm typecheck && pnpm lint` + grep | ✅ | ✅ green |
| 04-05-T2 | 04-05 | 3 | OPTIN-03 | typecheck + lint + grep (callScript, clipboard, Tradução) | `pnpm typecheck && pnpm lint` + grep | ✅ | ✅ green |
| 04-05-T3 | 04-05 | 3 | OPTIN-02, OPTIN-03, OPTIN-04 | typecheck + lint + grep (variant, tel:, 3-estados) | `pnpm typecheck && pnpm lint` + grep | ✅ | ✅ green |
| 04-06-T1 | 04-06 | 4 | OPTIN-02, OPTIN-06 | typecheck + lint + grep (tabs, variant call, OPT_IN filtro, banner) | `pnpm typecheck && pnpm lint` + grep | ✅ | ✅ green |
| 04-06-T2 | 04-06 | 4 | OPTIN-02 | typecheck + lint + grep-negativo (!lead.emailable = 0) | `grep -c "!lead.emailable"` + `pnpm typecheck && pnpm lint` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist note:** toda task tem um comando automatizado (<60s). As tasks de lógica pura (04-01-T1, 04-03-T2, 04-04-T1) rodam RED→GREEN via `pnpm test`. As tasks de backend não-testáveis por unidade (mutations/actions — sem `convex-test` no repo, precedente das fases 1–3) e as tasks de UI (sem infra de teste de componente) usam typecheck/lint + grep de strings exatas como verificação automatizada, mais o smoke manual abaixo no verify-work. Nenhuma sequência de 3 tasks fica sem verify automatizado.

---

## Wave 0 Requirements

Nenhuma lacuna. `tests/domain.test.ts` e `tests/compliance.test.ts` já existem e importam de `../convex/lib/*`; os casos novos são adições. `tests/outreach-lang.test.ts` (novo, criado em 04-03-T2) é um teste puro sem fixture. Nenhuma instalação de framework é necessária (`package.json` já roda `tests/*.test.ts`). Por isso `wave_0_complete: true`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Busca real na Espanha via Places | OPTIN-01 | Exige GOOGLE_PLACES_API_KEY + deployment | Buscar "restaurant · Madrid" em dev; conferir leads com emailable=false |
| Fluxo consentimento → composer destrava | OPTIN-04/05 | ctx + UI | Registrar consentimento num lead ES → aba Abordagem/CRM destrava e o aviso some; draft/send de lead ES sem consentimento → erro pt-BR "Mercado opt-in: registre o consentimento…" |
| Script de ligação gerado | OPTIN-03 | Exige ANTHROPIC_API_KEY | Gerar script pra lead ES → espanhol + tradução pt-BR lado a lado, terminando com pedido de consentimento; copiar funciona |
| Tabs e variante call | OPTIN-02/06 | Visual | Aba "Ligação primeiro": países opt-in no select, cards sem ação de email, banner de validação jurídica; empty state explica o fluxo |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
**Executed:** 2026-07-22 — 12/12 tasks verdes; suíte final 69/69, tsc/lint/build limpos. Ver 04-VERIFICATION.md.
