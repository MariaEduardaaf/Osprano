---
phase: 09-honestidade-e-superficie-juridica
plan: 04
subsystem: legal
tags: [legal, termos, privacidade, dpa]
requires: [09-01]
provides:
  - /legal/termos, /legal/privacidade, /legal/dpa (rascunho tecnico PT-BR)
  - tests/legal-docs-content.test.ts
key-files:
  created:
    - src/app/legal/termos/page.tsx
    - src/app/legal/privacidade/page.tsx
    - src/app/legal/dpa/page.tsx
    - tests/legal-docs-content.test.ts
requirements: [LEGAL-02]
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 9 Plan 04: Termos, Privacidade e DPA Summary

Tres documentos contratuais em PT-BR, lendo identidade de `convex/lib/legal.ts`, com GDPR + LGPD, vendedora brasileira e pontos de advogado marcados ("[a definir com advogado]" / "[a confirmar]").

## Commits
- b99d11f: teste de conteudo + Termos
- e542b7e: Privacidade + DPA

## Deviations
Task 1: a pagina foi escrita antes de rodar o teste uma vez (sem o RED explicito); o teste cobre todas as clausulas e passa.

## Verification
tests/legal-docs-content.test.ts 4/4; tsc e eslint limpos; grep de LSSI/NIF/travessao = 0 em todas as paginas /legal.
