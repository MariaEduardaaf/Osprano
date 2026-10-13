---
phase: 12-planos-e-custo-por-cliente
plan: 06
subsystem: phase-gate
tags: [gates, dev-smoke, prod-steps]
requires: ["12-03", "12-04", "12-05"]
key-files:
  created: [12-DEV-SMOKE.md, 12-PROD-STEPS.md]
  modified: [convex/_generated/api.d.ts]
metrics:
  tasks: 1 auto + 1 checkpoint (headless check done, human pass pending)
  completed: 2026-10-13
---

# Phase 12 Plan 06: Phase gate Summary

All gates green; schema live on DEV; internal commands respond; headless visual check passed; production script written. One finding: Clerk JWT has no `email`, so the trial mark falls back to `via: "subject"`.

## Commits
- eaa9553: DEV smoke, PROD steps, regenerated api.d.ts

## Gates
- tests 505 pass / 0 fail; tsc root and convex clean; eslint clean; next build OK (needs network for Google Fonts; fails inside the sandbox, passes outside).

## Findings
- trialClaims `via: "subject"` (Clerk template "convex" lacks `email`). Duda step in 12-PROD-STEPS.md. Not edited in Clerk.
- /plans page does not repeat "um teste grátis por e-mail, não renova" (landing does).
- Not verified: AI buttons disabled in a lead drawer (no lead on the test account).

## Deviations
None. Test Clerk user and its workspace were deleted via the app; `f12-smoke` workspace and the test trialClaims row remain on DEV.

## Self-Check: PASSED

## Orquestrador, 2026-10-13

- Template JWT "convex" do Clerk **de DEV** atualizado pela Backend API: claims agora `{"aud":"convex","email":"{{user.primary_email_address}}"}` (antes só `aud`). Conferência de `trialClaims.via = "email"` fica para o checkpoint de navegador da Fase 13 (aceite novo).
- **Produção:** o mesmo ajuste precisa ser feito no template "convex" da instância de produção do Clerk (dashboard → JWT Templates → convex → acrescentar `"email": "{{user.primary_email_address}}"`). Item em 12-PROD-STEPS.md.
- Item 3 (botões de IA travados na gaveta do lead com cota esgotada) entra no checkpoint de navegador da Fase 13, que já testa o composer.
