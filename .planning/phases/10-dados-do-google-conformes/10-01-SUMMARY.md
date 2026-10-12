---
phase: 10-dados-do-google-conformes
plan: 01
subsystem: compliance
tags: [google-places, convex, pure-functions]
requires: []
provides:
  - convex/lib/googleData.ts (predicados do que pode sair do app, confirmPatch, scrub da migração)
  - convex/lib/placesFields.ts (máscaras, SKUs, preços, toPlaceLite)
affects: [10-03..10-12]
tech-stack:
  added: []
  patterns: ["regra de compliance num módulo puro único"]
key-files:
  created:
    - convex/lib/googleData.ts
    - convex/lib/placesFields.ts
    - tests/google-shareable.test.ts
    - tests/google-confirm.test.ts
    - tests/google-migration.test.ts
    - tests/google-fields.test.ts
  modified:
    - convex/_generated/api.d.ts
key-decisions:
  - "Contrato exatamente como no bloco interfaces do plano"
requirements-completed: [GPLC-02, GPLC-03, GPLC-04]
duration: ~15min
completed: 2026-10-12
---

# Phase 10 Plan 01: Fundação pura do Google conforme

Módulo único `googleData.ts` decide o que um lead do Google pode expor (nulo sem confirmação), valida a confirmação com origem obrigatória e gera a limpeza idempotente da migração; `placesFields.ts` fixa máscaras e preços do Places como constantes testadas. Nenhum comportamento do app mudou.

## Tasks
1. googleData (shareable + confirm): commit ac83029
2. Scrub, placesFields, api.d.ts, testes: commit 7ff3685 (scrubLeadPatch/scrubPreviewContent já nasceram no googleData.ts do commit 1)

## Deviations from Plan
Os testes foram escritos junto do código, não antes (sem etapa RED separada); os dois commits agrupam por arquivo, não por etapa TDD. Nenhuma mudança de comportamento.

## Verification
- `tests/google-*.test.ts`: 35 passam; suíte completa: 425/425
- `tsc --noEmit`, `tsc --noEmit -p convex`, eslint nos arquivos novos: limpos
- Zero travessão em googleData.ts

## Self-Check: PASSED
