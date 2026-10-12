---
phase: 10-dados-do-google-conformes
plan: 03
subsystem: schema-readers
tags: [convex, schema, google-places, compliance]
requires: ["10-01", "10-02"]
provides:
  - leads.name optional; every reader tolerates a missing name
  - DM and social search links gated by shareableName
key-files:
  modified:
    - convex/schema.ts
    - convex/lib/site.ts
    - convex/model/previews.ts
    - convex/previews.ts
    - convex/outreach.ts
    - convex/lib/outreachAi.ts
    - convex/scoring.ts
    - convex/demo.ts
    - convex/events.ts
    - convex/admin.ts
    - src/app/(app)/crm/page.tsx
    - src/components/lead-card.tsx
    - src/components/crm/lead-detail.tsx
    - src/components/delete-lead-button.tsx
    - src/components/crm/lost-reason-modal.tsx
    - src/components/crm/today-strip.tsx
    - src/components/site-editor/site-editor.tsx
    - src/lib/lead-links.ts
    - src/components/crm/dm-composer.tsx
    - src/components/social-buttons.tsx
    - tests/lead-links.test.ts
requirements-completed: [GPLC-01, GPLC-03]
completed: 2026-10-12
---

# Phase 10 Plan 03: Optional lead name Summary

`leads.name` is now optional; internal screens show `leadLabel` ("Negócio do Google" for unnamed Google leads), and the DM composer and Instagram/Facebook searches only use a shareable name.

## Tasks
1. Convex schema and readers: 1b88b78
2. Internal screens with leadLabel: b433ee1
3. DM and social links gating (TDD, red seen first): ed6a383

## Deviations from Plan
- `convex/admin.ts` needed three more fixes than the plan listed (lines using `lead.name` in `moved`/`names` arrays now use `leadLabel`; dedupe key spreads with `name ?? ""`), found by `tsc -p convex`. Added `leadLabel` import there.
- `LeadLike.name` change in `convex/lib/site.ts` was needed for `ensurePreview` to compile (plan only listed the `.trim()` line).

## Verification
- `node --experimental-strip-types --test tests/*.test.ts`: 427 pass, 0 fail
- `tsc --noEmit`, `tsc --noEmit -p convex`, full `eslint`: clean
- Not run (per rules): next build, convex dev

## Notes
Server-side gating (ensurePreview, outreach draft/call script, WhatsApp, defaultContentForLead) is still plan 05; `readContent`, `businessLine` and `defaultContentForLead` still pass through `lead.name` as-is.

## Self-Check: PASSED
