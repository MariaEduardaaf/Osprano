---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 05
subsystem: email-sending
tags: [composer, prepareSend, compose-links, markSent]
requires: ["13-01", "13-02", "13-04"]
key-files:
  modified: [src/components/outreach-composer.tsx, convex/outreach.ts]
requirements-completed: [SEND-01, SEND-02, SEND-04]
completed: 2026-10-13
---

# Phase 13 Plan 05: Composer send flow Summary

Composer now blocks AI and send without a sender profile, "Enviar" calls `prepareSend` and shows the final message with Gmail/Outlook/app/Copiar, and "Marquei como enviada" is the only thing that records the send. Resend button and `updateDraft` are gone.

## Commits
- see git log: feat(13-05) (Tasks 1 and 2 in one commit, same file)

## Deviations
- Tasks 1 and 2 in a single commit (same file, tightly coupled).
- `hasEmail` prop kept optional on `OutreachComposer` (callers unchanged) but unused; the lead's email comes from the reactive `lead` query.
- Aviso do marcador `[seu nome]` stays tone "stop"; Fase 12 `aiBlocked`/`AiQuotaNotice` preserved, profile block adds to it.

## Verification
tsc (root and convex) clean, eslint on changed files clean, suite 532 pass / 0 fail. `next build` not run (forbidden by orchestrator rules); `grep updateDraft` empty outside `_generated`.

## Self-Check: PASSED
