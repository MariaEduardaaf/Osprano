---
phase: 03-tracking-composer-e-localiza-o
verified: 2026-07-11T05:27:45Z
status: human_needed
score: 4/4 must-haves verified (automated); 5 items require manual/browser confirmation
human_verification:
  - test: "Abrir /p/{token} logado no app (mesma org do lead) e conferir que openCount/lastOpenedAt não mudam e o lead não vira 'approached'; depois abrir o mesmo link em aba anônima e conferir que conta normalmente."
    expected: "Sessão autenticada do dono do workspace não incrementa openCount nem gera evento preview_open nem move o estágio; sessão anônima (prospect real) incrementa normalmente."
    why_human: "Depende de sessão Clerk real vs. anônima em runtime — não é verificável por leitura estática de código; a guarda foi confirmada por código (identity.subject === preview.orgId, early-return antes de qualquer write), mas o comportamento fim-a-fim exige browser."
  - test: "Marcar 'Respondeu' na outbox (item sent/opened) e no lead-detail (aba Abordagem); conferir status vira replied, 'respondeu {tempo}' usa timestamp real, e ordenação da outbox reflete repliedAt."
    expected: "Status replied com repliedAt gravado; outbox exibe/ordena por esse timestamp real; botão 'Pediu opt-out' pede confirm e grava supressão (bloqueando envio futuro)."
    why_human: "Mutations Convex sem harness unit in-process neste repo (sem convex-test); código lido e typecheck confirmam a assinatura e o fluxo, mas o efeito real em runtime (persistência, reatividade da UI) precisa de smoke em dev/staging."
  - test: "No composer, editar assunto/corpo, clicar Marcar enviado (ou Enviar via Resend, ou Copiar); conferir no dashboard Convex que a row outreach reflete exatamente o texto editado, sem rodapé de opt-out duplicado."
    expected: "updateDraft persiste antes de markSent/send; ao copiar, persiste fire-and-forget; o rodapé de compliance aparece uma única vez (garantido pelo send, não pelo updateDraft)."
    why_human: "Requer inspecionar o estado persistido no Convex dashboard ou email realmente enviado via Resend — não verificável estaticamente além de confirmar a ordem de chamadas no código (confirmado)."
  - test: "Fechar e reabrir a aba Abordagem de um lead com rascunho salvo; conferir que os campos aparecem pré-preenchidos e que a function log do Convex NÃO mostra uma nova chamada a outreach:draft (a action de IA)."
    expected: "Composer pré-preenche subject/body direto de getForLead, sem disparar draft; digitação subsequente não é sobrescrita por atualizações reativas da query."
    why_human: "Comportamento de hidratação em runtime (timing de useQuery, remount por key) — o mecanismo foi trocado de useRef+effect para key-remount por exigência do React Compiler (lint error), documentado como deviation; a lógica foi lida e faz sentido, mas o comportamento fim-a-fim (nenhuma chamada de IA, nenhum clobber de digitação) precisa de confirmação visual/log."
  - test: "Abrir /p/{token} de leads com countryCode GB, NL, SE e NO e conferir visualmente que o texto renderiza em inglês, holandês, sueco e norueguês respectivamente (incluindo hero subtitle, CTAs, highlights, seção de contato e rodapé de horário)."
    expected: "Cada mercado vê o preview no próprio idioma; nenhuma palavra em português aparece em nenhum dos 4 locales."
    why_human: "Qualidade de tradução/naturalidade do texto e renderização visual não são verificáveis por grep — o teste automatizado (grep-negativo + paridade de chaves) já confirma ausência de PT e completude estrutural, mas a leitura humana do resultado final é recomendada."
---

# Phase 3: Tracking, Composer e Localização Verification Report

**Phase Goal:** O funil reflete a realidade — abertura do próprio vendedor não conta como sinal de compra, "respondeu" é marcável manualmente com timestamp real (outbox e lead-detail), o composer persiste o que o usuário vê antes de qualquer envio e reabre pré-preenchido sem gastar IA, e o preview renderiza no idioma do mercado (EN/NL/SV/NO) sem nenhum copy em português.
**Verified:** 2026-07-11T05:27:45Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vendedor autenticado abrindo o próprio preview NÃO incrementa openCount/gera evento/move estágio; prospect anônimo segue contando | ✓ VERIFIED (code) / needs runtime smoke | `convex/previews.ts:130-131` — `const identity = await ctx.auth.getUserIdentity(); if (identity && identity.subject === preview.orgId) return;` inserted immediately after the `!preview` guard and before `ctx.db.patch`/`insert("events")`/stage change (lines 133-149). `preview.orgId` traces to `lead.orgId`/`requireOrgId` (confirmed in `generate`/`ensureForLead`). `PreviewTracker` (`src/components/preview-tracker.tsx`) untouched since Phase 2 (`git log` shows only `cf1eb3d`). |
| 2 | Usuário marca "respondeu" na outbox e no lead-detail; status replied com repliedAt real; outbox ordena/exibe por repliedAt; "Pediu opt-out" grava supressão com confirm | ✓ VERIFIED (code + tests green) / needs runtime smoke | `markReplied` (`convex/outreach.ts:193-209`) patches `status: "replied", repliedAt: now` and inserts `events` with `type: "reply"`. `outbox.activityAt` (`convex/outreach.ts:69`) prioritizes `row.repliedAt ?? ...`; item exposes `repliedAt` (line 68). `lead-detail.tsx` `ApproachTab` (lines 272-334) wires `markReplied` and `suppress` buttons, `window.confirm` on opt-out (line 321), `suppress` button gated on `lead.email` (line 317). `outreach/page.tsx` (lines 181-196) adds row-level "Respondeu" button for `sent`/`opened` items. |
| 3 | Edições do composer são persistidas via updateDraft antes de send/markSent/copy; composer reabre pré-preenchido do draft salvo sem disparar a action de IA; rodapé de compliance não duplicado | ✓ VERIFIED (code + typecheck) / needs runtime smoke | `outreach-composer.tsx`: `updateDraft` awaited before `markSent` (line 124-125) and before `send` (line 137-138); fire-and-forget on copy (line 113). Hydration: `OutreachComposer` wrapper runs `useQuery(getForLead)` and mounts `ComposerBody` with `key={existing === undefined ? "loading" : "loaded"}` (lines 30-38) — remounts exactly once when the query resolves from `undefined`, so subsequent reactive updates to `existing` do not remount/clobber in-progress typing. `hasDraft` (line 55) opens the form pre-filled without calling the `draft` action. `updateDraft` (convex/outreach.ts:214-227) explicitly does NOT call `withOptOutFooter` — only `patch(row._id, { subject, body })`; `send` (convex/outreach.ts:279-283) re-guarantees the footer idempotently by checking `body.includes(unsubscribeUrl)`. Documented deviation (useRef+effect → key-remount) is a mechanism change forced by React Compiler lint rules; observable behavior matches the plan's truth. |
| 4 | Preview 100% localizado por countryCode (GB/IE→en, NL→nl, SE→sv, NO→no, fallback en); zero strings PT em preview-site.tsx (todas as 11 do inventário) | ✓ VERIFIED (tests green) | `src/lib/preview-i18n.ts` exports `localeForCountry` (GB/IE→en, NL→nl, SE→sv, NO→no, fallback via `?? "en"`, case-insensitive via `.toUpperCase()`) and `DICTS` with 4 locales of 18 identical keys. `preview-site.tsx` derives `tr = DICTS[localeForCountry(countryCode)]` (line 26) and every one of the 11 inventoried PT strings (Ligar, hero subtitle, "Ligar agora", "avaliações", Qualidade/body, Atendimento/body, "No coração da cidade"/body, "Venha nos visitar", contact paragraph, Telefone/Onde/Horário labels, "Seg–Sáb · 9h–19h") is replaced by a dictionary lookup — confirmed by re-grepping the full inventory list (`Ligar|Tradição|WhatsApp|avaliações|Qualidade|Atendimento|coração da cidade|Venha|referência|Telefone|Onde|Horário|Seg–Sáb|...`) against the current file: zero matches. 4 tests in `tests/preview-i18n.test.ts` pass (locale mapping, key parity, interpolation smoke, grep-negative PT). |

**Score:** 4/4 truths verified by static/automated evidence; all 4 additionally need a browser/runtime smoke pass per `03-VALIDATION.md §Manual-Only` (this was explicitly planned as manual-only because these mutations have no in-process test harness in this repo).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/previews.ts` | self-open guard in `recordOpen` before any write | ✓ VERIFIED | Guard present, correctly ordered, wired to `preview.orgId` |
| `src/lib/preview-i18n.ts` | pure 4-locale dictionary + `localeForCountry` | ✓ VERIFIED | 18-key `PreviewDict`, 4 locales, exported, zero framework imports |
| `tests/preview-i18n.test.ts` | key parity + mapping + grep-negative PT | ✓ VERIFIED | 4 tests, all passing (part of the 44/44 suite) |
| `src/components/preview-site.tsx` | localized render via `DICTS[localeForCountry(...)]` | ✓ VERIFIED | All 11 PT strings replaced; layout/classes untouched |
| `convex/schema.ts` | `outreach.repliedAt: v.optional(v.number())` | ✓ VERIFIED | Present at line 147, additive field, no backfill needed |
| `convex/outreach.ts` | `markReplied`, `updateDraft` mutations + `outbox` fix | ✓ VERIFIED | Both mutations present with ownership checks and pt-BR error guards; `activityAt`/`repliedAt` fix in `outbox` |
| `src/components/outreach-composer.tsx` | persists via `updateDraft`, pre-fills via `getForLead` with hydration guard | ✓ VERIFIED | 3 `updateDraft` call sites (copy/mark/send), key-remount hydration guard (deviation from plan's literal `useRef` mechanism, documented, behavior-equivalent) |
| `src/components/crm/lead-detail.tsx` | "Respondeu"/"Pediu opt-out" buttons in `ApproachTab` | ✓ VERIFIED | Both buttons wired to `markReplied`/`suppress`, `window.confirm` gate, `lead.email` gate on opt-out |
| `src/app/(app)/outreach/page.tsx` | row-level "Respondeu" action for sent/opened items | ✓ VERIFIED | Button wired to `markReplied`, status-gated, per-row busy state |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `convex/previews.ts:recordOpen` | `ctx.auth.getUserIdentity()` | early-return before any write | ✓ WIRED | Line 130-131, before patch/insert/stage-change (lines 133-149) |
| `src/components/preview-site.tsx` | `src/lib/preview-i18n.ts` | `DICTS[localeForCountry(content.countryCode)]` | ✓ WIRED | Line 26, `tr` used across all 11 strings |
| `convex/outreach.ts:markReplied` | `events` (`type: "reply"`) | insert after patch of status/repliedAt | ✓ WIRED | Line 205-206 |
| `convex/outreach.ts:outbox` | `row.repliedAt` | `activityAt` prioritizes `repliedAt` | ✓ WIRED | Line 69; item also exposes `repliedAt` (line 68) |
| `src/components/outreach-composer.tsx` | `api.outreach.updateDraft` | awaited before send/markSent, fire-and-forget on copy | ✓ WIRED | Lines 113, 124, 137 — 3 call sites, correct ordering confirmed in diff/read |
| `src/components/outreach-composer.tsx` | `api.outreach.getForLead` | `useQuery` + key-remount hydration | ✓ WIRED (mechanism deviates from plan spec, behavior equivalent) | Lines 30-38 |
| `src/app/(app)/outreach/page.tsx` | `api.outreach.markReplied` | row-level button for sent/opened | ✓ WIRED | Lines 53, 181-196 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TRCK-01 | 03-01 | Self-open não conta como sinal de compra | ✓ SATISFIED | `convex/previews.ts` guard, verified above |
| TRCK-02 | 03-03, 03-04 | "Respondeu" marcável manualmente com timestamp real (outbox + lead-detail) | ✓ SATISFIED | `markReplied`, outbox `repliedAt`/`activityAt` fix, UI buttons in both surfaces |
| OUTR-01 | 03-03, 03-04 | Composer persiste o que o usuário vê antes de qualquer envio | ✓ SATISFIED | `updateDraft` mutation + composer wiring, footer not duplicated |
| L10N-01 | 03-02 | Preview 100% localizado, zero PT | ✓ SATISFIED | `preview-i18n.ts` dictionary + `preview-site.tsx` migration + tests |

REQUIREMENTS.md cross-reference (`.planning/REQUIREMENTS.md` lines 18-19, 37, 41) marks all four as `[x]` Complete, mapped to Phase 3, matching the artifacts found. No orphaned requirements found for Phase 3 in REQUIREMENTS.md's phase-mapping table (lines 82-90 list exactly these 4 IDs against "Phase 3 · Complete").

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none found | — | Grep for TODO/FIXME/XXX/HACK/PLACEHOLDER/"coming soon"/"not implemented" across all 9 touched files returned zero matches |

### Automated Verification Evidence

```
pnpm typecheck  → exit 0 (tsc --noEmit, clean)
pnpm lint       → exit 0 (eslint, clean — includes react-hooks/set-state-in-effect and react-hooks/refs rules that forced the documented composer deviation)
pnpm test       → 44/44 passing (tests 44, pass 44, fail 0)
pnpm build      → succeeded (Next.js production build, TypeScript pass, all routes compiled including /p/[token] and /site/[slug])
git status      → clean working tree, all phase commits present (e192f71, 71bbd58, fabd22f, f06af91, 9fc6742, 39a4962, 2e3c54f, 0f78428, ad97261)
```

### Human Verification Required

See YAML frontmatter `human_verification` for the 5 structured items. Summary:

1. **TRCK-01 runtime smoke** — self-open guard behavior with real Clerk session vs. anonymous tab (code confirms the guard is correctly placed and scoped; this is the kind of check that genuinely cannot be done without a browser).
2. **TRCK-02 runtime smoke** — "Respondeu"/opt-out buttons actually mutating and reflecting in the outbox/lead-detail UI in a live dev deployment.
3. **OUTR-01 persistence smoke** — composer edits actually landing in the Convex `outreach` row without footer duplication.
4. **OUTR-01 hydration smoke** — reopening the Abordagem tab pre-fills without triggering the `draft` action (function log check), particularly given the deviation from `useRef` to key-remount.
5. **L10N-01 visual smoke** — actual rendered pages for GB/NL/SE/NO leads read correctly in their respective languages.

None of these represent code-level gaps — they are the class of behavior (real auth sessions, real Convex mutations reflecting in reactive UI, visual/linguistic quality) that this project's own `03-VALIDATION.md` already classified as "Manual-Only" (no `convex-test` harness installed in this repo, consistent with Phase 1/2 precedent). All automated acceptance criteria from all 4 plans pass; `pnpm typecheck && pnpm lint && pnpm test` (44/44) and `pnpm build` are green.

### Gaps Summary

No code-level gaps found. All must-have truths, artifacts, and key links from the 4 phase plans (03-01 through 03-04) are present, substantive, and wired in the actual codebase — not stubs. The one documented deviation (03-04: hydration guard mechanism changed from `useRef`+`useEffect` to key-based remount) was forced by this project's React Compiler lint rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`, both `error`) and preserves the required observable behavior (pre-fill once from saved draft without calling the AI action; no clobbering of in-progress typing) — verified by reading the resulting code path, not just trusting the SUMMARY's claim.

Status is `human_needed` rather than `passed` because five behaviors are runtime/browser-dependent (real Clerk auth, live Convex mutation effects, visual/linguistic rendering) and were explicitly pre-classified by the phase's own validation strategy as requiring manual smoke testing — this is not a sign of incompleteness, it reflects the actual verifiable ceiling of static/automated checks for this kind of change.

---

*Verified: 2026-07-11T05:27:45Z*
*Verifier: Claude (gsd-verifier)*
