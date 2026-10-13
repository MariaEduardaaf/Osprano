---
phase: 12-planos-e-custo-por-cliente
plan: 05
subsystem: usage-ui
tags: [usage, quota, ui]
requires: ["12-01"]
provides: [usageLevel/usageItems/usageAlert, UsageBar, useAiBlocked, AiQuotaNotice]
key-files:
  created: [src/lib/usage.ts, src/components/usage-bar.tsx, src/components/ai-quota.tsx, tests/usage-level.test.ts]
  modified: ["src/app/(app)/layout.tsx", src/components/outreach-composer.tsx, src/components/call-script-panel.tsx]
metrics:
  tasks: 2
  completed: 2026-10-13
---

# Phase 12 Plan 05: Usage bar and AI quota block Summary

Usage bar at the top of every app screen (plan, leads, AI, Google, searches today) with 80%/100% text warnings and a Planos link; AI generate buttons disabled with notice when AI quota is spent.

## Commits
- 39c42de: usage rules, tests, UsageBar, layout
- 6bc86b8: ai-quota, composer and call-script wiring

## Notes for the orchestrator (Phase 13 ordering)
`src/components/outreach-composer.tsx` touched only in `ComposerBody`: 1 import, `const aiBlocked = useAiBlocked()` after the `useQuery(api.leads.get...)` line, `disabled={busy === "draft" || aiBlocked}` and `<AiQuotaNotice className="mt-1.5" />` below the "Escrever com IA" button. Diff: +4/-1.

## Deviations
None. `next build` not run (per rules).

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 485 pass, 0 fail
- `tsc --noEmit` and eslint on changed files: clean

## Self-Check: PASSED
