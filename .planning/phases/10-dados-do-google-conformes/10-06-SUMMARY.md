---
phase: 10-dados-do-google-conformes
plan: 06
subsystem: ui
tags: [google-places, compliance, react]
requires: ["10-03", "10-04", "10-05"]
provides:
  - use-google-places.ts (memória JS do Google, useAction only)
  - GoogleAttribution, GoogleCard (único renderizador de conteúdo do Google)
  - BusinessData no drawer (confirmação digitada ou edição)
key-files:
  created: [src/lib/use-google-places.ts, src/components/google/google-attribution.tsx, src/components/google/google-card.tsx, src/components/crm/business-data.tsx, tests/google-attribution.test.ts]
  modified: [src/components/crm/lead-info-fields.tsx, src/components/crm/lead-detail.tsx]
requirements-completed: [GPLC-02, GPLC-03, GPLC-05]
completed: 2026-10-12
---

# Phase 10 Plan 06: Google UI in the lead drawer

Lead do Google não confirmado mostra o cartão ao vivo (atribuição "Google Maps", só leitura, memória do JS) e um formulário que começa vazio, com origem obrigatória; confirmado/OSM/manual edita os próprios dados sem consultar o Google.

## Commits
- 275ad8f: memória, atribuição, cartão, testes de varredura
- 413a1c1: BusinessData + integração no drawer

## Deviations from Plan
None. Teste escrito antes (falhou por arquivos ausentes), sem commit RED separado.

## Verification
- tests/*.test.ts: 467 pass, 0 fail; tsc raiz e eslint nos arquivos tocados limpos
- `tsc -p convex` e eslint global não rodados neste plano (nenhum arquivo convex tocado)

## Self-Check: PASSED
