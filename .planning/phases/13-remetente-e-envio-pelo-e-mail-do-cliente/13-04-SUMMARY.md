---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 04
subsystem: email-sending
tags: [prepareSend, markSent, sender-profile, resend-off, whatsapp-off]
requires: ["13-01", "13-02", "13-03"]
provides: [outreach.prepareSend, CLIENT_SEND_VIA_RESEND, CLIENT_SEND_VIA_WHATSAPP]
key-files:
  created: [tests/send-path.test.ts]
  modified: [convex/outreach.ts, convex/lib/outreachAi.ts, convex/lib/env.ts, convex/lib/compliance.ts, convex/whatsapp.ts, src/components/whatsapp-followup.tsx, tests/env.test.ts, tests/prospect-lang.test.ts]
requirements-completed: [SEND-01, SEND-02, SEND-03, SEND-04]
completed: 2026-10-13
---

# Phase 13 Plan 04: Server send flow Summary

`prepareSend` is now the only path that builds the final email body (client identity, unsubscribe link, data source); `markSent` accepts only prepared messages; Resend and WhatsApp sending through Duda's accounts are switched off by constants.

## Commits
- 4358b93 prepareSend, sender profile in AI, client Resend off (Tasks 1 and 2)
- 7a3db84 WhatsApp sending through the owner's number off (Task 3)

## convex/outreach.ts functions touched (for Phase 12 cross-check)
imports; `withOptOutFooter` (deleted); `upsertDraft` and `updateDraft` (strip footer); `draft` (assertAccepted split into ws + requireSender, before the quota; identity from profile; link-precondition comments); `callScript` (same split + identity); `prepareSend` (new); `markSent` (prepared-message gate); `send` (flag). `withAiQuota` wrappers kept intact; `requireSender` runs before any quota reservation or Anthropic call.

## Deviations
- Tasks 1 and 2 share `convex/outreach.ts`, so they went in one commit instead of two.
- `tests/compliance.test.ts:116` still has a comment mentioning the deleted function (comment only, not touched; out of plan scope).

## Notes
- WhatsApp follow-up through wa.me writes no row to the Histórico (the internal `record` was only called by direct send). If wanted, it needs a "Marquei como enviado" button for WhatsApp.
- Legacy drafts (before this phase) still carry the old footer with a link; `markSent` accepts them without going through `prepareSend`. The composer (plan 05) shows text without footer, so the real case is rare.
- `convex/_generated/api.d.ts` not regenerated (no `convex dev`); `api.outreach.prepareSend` typed access depends on that for plan 05 if it uses generated types.

## Verification
Full suite: 532 pass, 0 fail (includes paid-calls). tsc root and convex clean, eslint clean. `next build` not run (forbidden).

## Self-Check: PASSED
