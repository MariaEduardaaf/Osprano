---
phase: 10-dados-do-google-conformes
plan: 04
subsystem: discovery
tags: [google-places, convex, compliance, quota]
requires: ["10-01", "10-02", "10-03"]
provides:
  - insertPlacesLead (model + internal mutation): lead do Google só com place_id e derivados
  - places.details / places.detailsMany: consulta ao vivo com reserva e estorno na cota
key-files:
  created: [convex/model/discovery.ts, tests/google-discovery.test.ts, tests/google-cost.test.ts]
  modified: [convex/places.ts, convex/scoring.ts, convex/adminActions.ts, convex/_generated/api.d.ts]
decisions:
  - "Conteúdo ao vivo do Google só na resposta da action (shown / details / detailsMany); nunca em args de mutation, query ou log"
  - "Lead existente nunca é reescrito pela busca; scoreLead ignora source places"
metrics:
  tasks: 2
  completed: 2026-10-12
---

# Phase 10 Plan 04: Descoberta do Google sem gravar conteúdo

Busca no Google grava só placeId, termo buscado, cidade/país e derivados (score, tier, sinais, forma jurídica); `details` (máscara FULL, 1 consulta) e `detailsMany` (máscara LIST, até 24) buscam ao vivo, reservam antes e estornam em falha/404.

## Commits
- 5b42002: lead do Google só com place_id e derivados (Task 1)
- 52cb225: actions details/detailsMany com cota (Task 2)

## Deviations from Plan
None. Os testes de varredura das actions de detalhe foram adicionados no commit da Task 2 (não da Task 1), porque só passam depois dela.

## Verification
- google-discovery + google-cost: 9/9 passam; `tsc` raiz, `tsc -p convex` e eslint nos arquivos tocados: limpos.
- Suíte completa: 447/448. A única falha (`leads.confirmInfo aplica confirmPatch`, tests/google-confirm.test.ts) é da área do plano 10-05 em andamento em paralelo (convex/outreach.ts e whatsapp.ts modificados na árvore); passou ao rodar isolado depois. Não é deste plano.

## Self-Check: PASSED
