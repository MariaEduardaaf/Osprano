---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 01
subsystem: sender
tags: [sender, settings, schema]
provides: [convex/lib/sender.ts (SenderProfile, normalizeSenderInput, isSenderComplete, requireSender, senderFooterIdentity, SENDER_REQUIRED_MESSAGE, SENDER_LIMITS), api.sender.get/save, Ajustes > Remetente]
key-files:
  created: [convex/lib/sender.ts, convex/sender.ts, tests/sender.test.ts, src/components/sender-profile-form.tsx]
  modified: [convex/schema.ts, convex/_generated/api.d.ts, "src/app/(app)/settings/page.tsx", src/components/crm/dm-composer.tsx]
metrics:
  tasks: 3
  completed: 2026-10-13
---

# Phase 13 Plan 01: Sender profile Summary

Sender profile (name, company, postal address, reply-to) stored on the workspace, validated server-side, editable in Ajustes > Remetente; DM signature now comes from it (fallback `[seu nome]` plus a link warning).

## Commits
- 150152e: pure lib + tests
- ac6cf6c: schema field, convex/sender.ts, api.d.ts
- 4be4093: Remetente tab + DM composer

## Deviations
None. api.d.ts edited by hand (no codegen).

## Notes
- The `sender` field only exists in the deployment after `npx convex dev` pushes the schema (LESSONS: schema changes do not reach the DB on their own).
- Tests: full suite 526 pass, 0 fail; tsc (app and convex) and eslint on changed files clean. `next build` not run.
- Tests were written together with the lib (no separate RED commit).

## Self-Check: PASSED
