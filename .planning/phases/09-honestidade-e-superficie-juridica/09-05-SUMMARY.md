---
phase: 09-honestidade-e-superficie-juridica
plan: 05
subsystem: legal
tags: [legal, convex, acceptance, gate]
requires: [09-01]
provides:
  - assertAccepted / acceptTermsFor (convex/model/workspace.ts)
  - workspaces.acceptTerms mutation, workspaces.current with acceptanceOk
  - AcceptanceGate + footer with legal links in (app) layout
key-files:
  created: [tests/acceptance.test.ts, src/components/legal/acceptance-gate.tsx]
  modified: [convex/model/workspace.ts, convex/workspaces.ts, convex/outreach.ts, convex/whatsapp.ts, convex/billing.ts, "src/app/(app)/layout.tsx"]
requirements: [LEGAL-03, LEGAL-04]
metrics:
  tasks: 3
  completed: 2026-10-12
---

# Phase 9 Plan 05: Aceite de termos Summary

Aceite com versao e data gravado no workspace; servidor recusa cota, IA, envio e checkout sem ele; gate no layout do app; rodape legal.

## Commits
- 625e87c: guarda server + acceptTerms + testes (7 testes)
- 5c81484: assertAccepted em outreach.draft/callScript/send, whatsapp.sendFollowup, billing.createCheckout
- ecde3d1: AcceptanceGate + rodape em (app)/layout.tsx

## Deviations from Plan
None.

## Ceilings
- Mutations de registro manual (markSent, markDm, markReplied, updateDraft, suppress) e leituras seguem sem guarda; a UI nao deixa, a API direta deixa.
- billing.portal sem guarda de proposito.
- Workspace de producao da Duda ve a tela de aceite uma vez (sem backfill).

## Verification
- acceptance/tenant/legal tests: 22/22 verdes; tsc raiz, tsc -p convex e eslint verdes.
- Suite completa: 390 testes, 6 falhas, todas de outros planos em paralelo (paginas legais privacidade/dpa do 09-03/04 e purge do 09-06, ainda em andamento); nenhuma neste plano.
- Verificacao manual do gate fica no checkpoint do 09-07 (sem next build aqui).
