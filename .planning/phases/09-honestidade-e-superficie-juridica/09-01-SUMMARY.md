---
phase: 09-honestidade-e-superficie-juridica
plan: 01
subsystem: legal
tags: [legal, schema, convex, testing]
requires: []
provides:
  - convex/lib/legal.ts (identidade, LEGAL_VERSION, isAccepted)
  - workspaces.termsVersion/termsAcceptedAt/professionalUse (opcionais)
  - uploads.by_org index
  - tests/fake-ctx.ts
  - LegalLinks, PlaceholderNotice, LegalDoc, layout de /legal
affects: [09-03, 09-04, 09-05, 09-06]
key-files:
  created:
    - convex/lib/legal.ts
    - tests/legal.test.ts
    - tests/fake-ctx.ts
    - tests/fake-ctx.test.ts
    - src/components/legal/legal-links.tsx
    - src/components/legal/legal-doc.tsx
    - src/app/legal/layout.tsx
  modified:
    - convex/schema.ts
    - convex/_generated/api.d.ts
decisions:
  - "Build nunca falha por placeholder; aviso e visual"
  - "api.d.ts editado a mao (sem deployment para codegen)"
metrics:
  tasks: 3
  completed: 2026-10-12
---

# Phase 9 Plan 01: Fundacao legal Summary

Arquivo unico de identidade/versao legal (empresa brasileira, placeholders explicitos), campos opcionais de aceite no workspace, ctx falso para testes de Convex e componentes compartilhados das paginas /legal.

## Commits
- 354cf31: legal.ts + testes (10 testes)
- 0341556: schema, api.d.ts, fake-ctx (+3 testes)
- 8629fa8: LegalLinks, PlaceholderNotice, LegalDoc, layout

## Deviations from Plan
None. Os testes de legal.ts foram divididos em 10 casos para cumprir o criterio "pelo menos 10".

## Verification
Suite completa 360/360 verde; tsc raiz e tsc -p convex verdes; eslint verde nos arquivos novos.

## Self-Check: PASSED
Arquivos e commits 354cf31, 0341556, 8629fa8 conferidos.
