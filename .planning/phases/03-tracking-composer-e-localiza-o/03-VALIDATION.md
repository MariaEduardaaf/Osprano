---
phase: 3
slug: tracking-composer-e-localiza-o
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) via `node --experimental-strip-types --test` |
| **Config file** | none — `package.json` script `test` roda `tests/*.test.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test`
- **Before `/gsd:verify-work`:** Full suite green + `pnpm build`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01 · Task 1 | 03-01 | 1 | TRCK-01 | typecheck + grep (guarda identity em recordOpen) | `pnpm typecheck` + grep `identity.subject === preview.orgId` | ✅ | ⬜ pending |
| 03-02 · Task 1 | 03-02 | 1 | L10N-01 | unit (paridade de chaves + countryCode→locale) | `pnpm test` (tests/preview-i18n.test.ts) | ❌ W0 (nasce na task) | ⬜ pending |
| 03-02 · Task 2 | 03-02 | 1 | L10N-01 | unit grep-negativo PT + typecheck | `pnpm test` + `! grep -nE "Venha\|Tradição\|Seg–Sáb" src/components/preview-site.tsx` | ✅ (após Task 1) | ⬜ pending |
| 03-03 · Task 1 | 03-03 | 1 | TRCK-02 | codegen + typecheck + grep (repliedAt, markReplied, activityAt) | `npx convex codegen && pnpm typecheck` + grep | ✅ | ⬜ pending |
| 03-03 · Task 2 | 03-03 | 1 | OUTR-01 | codegen + typecheck + grep (updateDraft, sem footer) | `npx convex codegen && pnpm typecheck` + grep | ✅ | ⬜ pending |
| 03-04 · Task 1 | 03-04 | 2 | OUTR-01 | typecheck + grep (updateDraft antes de send/mark; hydration guard) | `pnpm typecheck` + grep | ✅ | ⬜ pending |
| 03-04 · Task 2 | 03-04 | 2 | TRCK-02 | typecheck + grep (markReplied/suppress + window.confirm) | `pnpm typecheck` + grep | ✅ | ⬜ pending |
| 03-04 · Task 3 | 03-04 | 2 | TRCK-02 | typecheck + grep (markReplied row action sent/opened) | `pnpm typecheck` + grep | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Nota Nyquist: nenhuma sequência de 3 tasks fica sem verificação automatizada — cada task tem `pnpm typecheck` e/ou `pnpm test`. As mutations Convex (recordOpen guard, markReplied, updateDraft) não têm harness unit in-process (não há convex-test instalado — precedente Fase 1/2); a cobertura automatizada delas é typecheck + grep de assinatura + codegen, e o comportamento de runtime é smoke manual (abaixo).

---

## Wave 0 Requirements

Infra existente cobre tudo (node:test; glob `tests/*.test.ts`). O único artefato novo de teste é `tests/preview-i18n.test.ts`, que nasce junto com `src/lib/preview-i18n.ts` na 03-02 Task 1 (RED→GREEN: paridade + mapeamento) e recebe o caso grep-negativo de PT na 03-02 Task 2. Nenhum framework/config novo.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Self-open não conta / prospect conta | TRCK-01 | Exige browser logado (sessão Clerk real) vs anônimo contra deployment dev | Abrir /p/{token} logado no app (openCount não muda, lead não vira approached) e em aba anônima (muda). NÃO testar só em demo — demo não exercita o ramo autenticado da guarda. |
| Janela de corrida do PreviewTracker (auth ainda resolvendo no mount) | TRCK-01 | Timing de runtime; componente travado sem mudança pelo CONTEXT | Abrir o próprio preview logado, mesma aba, com refresh algumas vezes. Se vazar (openCount sobe às vezes), tratar em SCAL-03 (v2) — fora do escopo desta fase. |
| Botões respondeu/opt-out no fluxo real | TRCK-02 | Exige UI + dados | Smoke em dev: na outbox (filtro Enviado/Abriu) e no lead-detail (aba Abordagem), marcar respondeu → status vira replied e "respondeu {tempo}" usa o timestamp real; opt-out → confirm → email entra na supressão. |
| Composer persiste antes do envio + reabre pré-preenchido | OUTR-01 | Exige UI + Resend | Editar corpo → Marcar enviado/Enviar → conferir row persistida no dashboard Convex reflete a edição. Fechar e reabrir a aba Abordagem → campos pré-preenchidos sem disparar a action `draft` (checar function log). |
| Preview em sueco/holandês/norueguês | L10N-01 | Visual | Abrir /p/{token} de lead SE/NL/NO/GB e conferir o idioma renderizado. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (tests/preview-i18n.test.ts em 03-02)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner, 2026-07-11)
