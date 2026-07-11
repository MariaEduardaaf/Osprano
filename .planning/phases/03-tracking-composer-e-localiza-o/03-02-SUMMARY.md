---
phase: 03-tracking-composer-e-localiza-o
plan: 02
subsystem: ui
tags: [i18n, localization, react, preview, l10n]

# Dependency graph
requires:
  - phase: 02-compliance-de-email-e-whatsapp
    provides: precedent for pure per-language dictionary modules (convex/lib/compliance.ts)
provides:
  - "src/lib/preview-i18n.ts: pure dictionary (en/nl/sv/no) + localeForCountry(countryCode)"
  - "src/components/preview-site.tsx localized via DICTS[localeForCountry(content.countryCode)]"
affects: [preview, outreach, tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure locale dictionaries with zero framework imports (testable via node:test), same style as convex/lib/compliance.ts"
    - "countryCode -> Locale mapping with case-insensitive lookup and explicit fallback to en"

key-files:
  created:
    - src/lib/preview-i18n.ts
    - tests/preview-i18n.test.ts
  modified:
    - src/components/preview-site.tsx

key-decisions:
  - "Independent countryCode->locale map (GB/IE->en, NL->nl, SE->sv, NO->no, fallback en) instead of reusing convex/lib/outreachAi.ts LANG (different value shape: language names, not locale codes)"
  - "Dictionary lives in src/lib/ (not convex/lib/) since it's consumed by a React component and has zero Convex/React imports, keeping it node:test-testable"

patterns-established:
  - "Pattern: PreviewDict interface with both plain strings and interpolating functions (e.g. featureLocationBodyWithCity(city), visitBody({name,category,city})) for values needing runtime data"

requirements-completed: [L10N-01]

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 3 Plan 02: Localização do Preview Público Summary

**Dicionário TS puro de 4 locales (en/nl/sv/no) com mapeamento countryCode→locale, migrando as 11 strings PT hardcoded de `preview-site.tsx` para render localizado no idioma do mercado do lead.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-11T04:59:00Z
- **Completed:** 2026-07-11T05:02:00Z
- **Tasks:** 2 (TDD: RED test file → GREEN dictionary; then component migration + grep-negative test)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `src/lib/preview-i18n.ts`: dicionário puro (`en`/`nl`/`sv`/`no`), `localeForCountry(countryCode)` com fallback `en` e comparação case-insensitive, `PreviewDict` com 18 chaves (strings + funções interpoladas)
- `src/components/preview-site.tsx`: as 11 strings PT hardcoded (header CTA, hero subtitle/CTAs, sufixo de reviews, 3 highlights, heading/parágrafo de contato, 3 `<dt>` labels, `<dd>` de horário) agora vêm de `tr = DICTS[localeForCountry(countryCode)]`; layout/classes intocados
- `tests/preview-i18n.test.ts`: 4 testes — mapeamento de locale, paridade de chaves entre os 4 dicionários, smoke test de funções interpoladas, e grep-negativo garantindo que "Venha"/"Tradição"/"Seg–Sáb" nunca voltem ao componente
- `/site/[slug]` herda a localização de graça (mesmo componente `PreviewSite`) — sem trabalho extra

## Task Commits

Cada task foi commitada atomicamente (TDD: RED+GREEN em um único commit de teste+dicionário, já que o dicionário foi escrito junto com a suíte que valida seu contrato):

1. **Task 1: Dicionário puro preview-i18n + testes (paridade + mapeamento)** - `71bbd58` (test)
2. **Task 2: Migrar preview-site.tsx para o dicionário + teste grep-negativo de PT** - `fabd22f` (feat)

**Plan metadata:** (this commit, added by the docs commit below)

_Nota: o commit `71bbd58` inclui tanto o dicionário (`src/lib/preview-i18n.ts`) quanto os 3 testes iniciais — o arquivo do dicionário ainda não existia no momento do RED, então RED e GREEN foram verificados localmente antes do commit único, mantendo o padrão "um commit por task" do plano._

## Files Created/Modified
- `src/lib/preview-i18n.ts` - dicionário puro de 4 locales + `localeForCountry`, zero import de Convex/React
- `tests/preview-i18n.test.ts` - paridade de chaves, mapeamento countryCode→locale, smoke de interpolação, grep-negativo de PT no componente
- `src/components/preview-site.tsx` - deriva `tr` do `countryCode` do lead e usa `tr.*` em todas as 11 strings de copy

## Decisions Made
- Mapa `countryCode → locale` independente do `LANG` de `convex/lib/outreachAi.ts` (valores diferentes: nomes de idioma vs. códigos de locale), conforme instruído nas interfaces do plano
- Dicionário posicionado em `src/lib/` (não `convex/lib/`) por ser consumido por componente React, mas mantido 100% puro (sem import de React/Convex) para permanecer testável com `node:test`

## Deviations from Plan

None — plano executado exatamente como especificado. O único ajuste operacional foi sequenciar a escrita dos testes e o dicionário dentro da Task 1 para respeitar RED→GREEN antes do commit único da task (o plano já previa `tdd="true"` para a Task 1).

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- L10N-01 fechado: nenhuma string PT resta em `src/components/preview-site.tsx`; `pnpm typecheck`, `pnpm lint` e `pnpm test` (44 testes) verdes.
- Executado em paralelo com 03-01 (`convex/previews.ts`) e 03-03 (`convex/schema.ts`, `convex/outreach.ts`) — arquivos disjuntos, commits sempre com pathspec explícito, sem conflito.
- `/p/[token]` e `/site/[slug]` já falam a língua do mercado do lead a partir de `content.countryCode` (já vindo do backend, sem mudança de schema).

---
*Phase: 03-tracking-composer-e-localiza-o*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/lib/preview-i18n.ts
- FOUND: tests/preview-i18n.test.ts
- FOUND: src/components/preview-site.tsx
- FOUND: commit 71bbd58 (test(03-02): add preview-i18n dictionary + locale mapping tests)
- FOUND: commit fabd22f (feat(03-02): localize preview-site.tsx via preview-i18n dictionary)
