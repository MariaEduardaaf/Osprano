---
phase: 10-dados-do-google-conformes
plan: 05
subsystem: outgoing-gating
tags: [convex, google-places, compliance]
requires: ["10-01", "10-02", "10-03"]
provides:
  - preview/publish gated on shareable name and facts
  - AI email, call script and WhatsApp use shareable data only
  - leads.confirmInfo mutation
key-files:
  modified:
    - convex/lib/site.ts
    - convex/model/previews.ts
    - convex/previews.ts
    - convex/outreach.ts
    - convex/whatsapp.ts
    - convex/leads.ts
  created:
    - tests/google-outgoing.test.ts
requirements-completed: [GPLC-03]
completed: 2026-10-12
---

# Phase 10 Plan 05: Outgoing gating Summary

Every server exit (public preview, publish, AI email, call script, WhatsApp) now goes through googleData; `leads.confirmInfo` is the only way a Google lead gets name/phone/address.

## Tasks
1. Preview and publish gating: dd8dde7
2. AI, call script, WhatsApp gating: 97f3721
3. leads.confirmInfo: 0348435

## Deviations from Plan
None. Note: `LeadLike` got optional `source`/`confirmation` fields (needed so the helpers see them); `insertDiscovered` untouched as planned.

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 448 pass, 0 fail
- `tsc --noEmit`, `tsc --noEmit -p convex`, full `eslint`: clean

## Self-Check: PASSED
