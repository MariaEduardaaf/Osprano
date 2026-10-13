---
phase: 13-remetente-e-envio-pelo-e-mail-do-cliente
plan: 02
subsystem: email-sending
tags: [compliance, gdpr-art14, compose-links, ai-prompt]
requires: []
provides: [composeOutgoingBody, dataSourceLine, stripOptOutFooter, composeLinks, OutreachIdentity.company]
affects: [13-04, 13-05]
key-files:
  created: [src/lib/compose-links.ts, tests/compose-links.test.ts]
  modified: [convex/lib/compliance.ts, tests/compliance.test.ts, convex/lib/outreachAi.ts, tests/prospect-lang.test.ts]
requirements-completed: [SEND-01, SEND-02, SEND-03]
completed: 2026-10-13
---

# Phase 13 Plan 02: Pure sending pieces Summary

Pure functions for the final email body (identity + unsubscribe + data-source line in 10 languages), Gmail/Outlook/mailto compose links with a 6000-char cap, and AI prompts that take the client's name and company.

## Commits
- 63f0700 composeOutgoingBody / dataSourceLine / stripOptOutFooter
- b005abb composeLinks
- 252e6c3 outreachAi company + locality message

## Deviations
None. `optOutFooter` signature unchanged.

## Notes
(a) The data-source line translations were written by the agent and go to the lawyer review together with the footer ([ADVOGADO] in LEGAL.md 4.2).
(b) `honestyRules` still describes the sender as a remote foreign professional (premise from Duda's own use). For a client living in the market the rule only forbids claiming local presence (conservative), it invents nothing. Revisit in Phase 15 if it becomes a problem.

## Verification
Full suite: 527 pass, 0 fail. tsc (root and convex) and eslint clean.

## Self-Check: PASSED
