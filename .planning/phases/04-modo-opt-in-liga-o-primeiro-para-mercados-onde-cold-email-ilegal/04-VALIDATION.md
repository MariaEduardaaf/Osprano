---
phase: 4
slug: modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `npx convex codegen && pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

*(Preenchido pelo planner ao criar os PLAN.md.)*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| — | — | — | OPTIN-01 | unit (isSearchableMarket, invariante isEmailable opt-in) + typecheck | `pnpm test` + `pnpm typecheck` | ✅ | ⬜ pending |
| — | — | — | OPTIN-04/05 | unit (canContactByEmail) + grep (gates draft/send) | `pnpm test` + grep | ✅ | ⬜ pending |
| — | — | — | OPTIN-03 | typecheck + grep (writeCallScript, LANG novo) | `npx convex codegen && pnpm typecheck` | ✅ | ⬜ pending |
| — | — | — | OPTIN-02/06 | typecheck + lint + grep (tabs, variant call, banner) | `pnpm typecheck && pnpm lint` + grep | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Infra existente cobre tudo (node:test; glob `tests/*.test.ts`). Helpers puros novos (`isSearchableMarket`, `canContactByEmail`) e a paridade do `FOOTER_COPY`/`LANG` ampliados nascem com testes nas tasks de fundação (RED→GREEN). Sem convex-test nem framework de UI (precedente fases 1–3).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Busca real na Espanha via Places | OPTIN-01 | Exige GOOGLE_PLACES_API_KEY + deployment | Buscar "restaurantes · Madrid" em dev; conferir leads com emailable=false |
| Fluxo consentimento → composer destrava | OPTIN-04/05 | ctx + UI | Registrar consentimento num lead ES → aba Abordagem destrava; draft/send de lead ES sem consentimento → erro pt-BR |
| Script de ligação gerado | OPTIN-03 | Exige ANTHROPIC_API_KEY | Gerar script pra lead ES → espanhol + tradução pt-BR, terminando com pedido de consentimento |
| Tabs e variante call | OPTIN-02/06 | Visual | Aba "Ligação primeiro": países opt-in no select, card sem ação de email, banner de validação jurídica |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
