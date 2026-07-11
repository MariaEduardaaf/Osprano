---
phase: 3
slug: tracking-composer-e-localiza-o
status: draft
nyquist_compliant: false
wave_0_complete: false
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

*(Preenchido pelo planner ao criar os PLAN.md.)*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| — | — | — | TRCK-01 | typecheck + grep (identity check em recordOpen) | `pnpm typecheck` + grep | ✅ | ⬜ pending |
| — | — | — | TRCK-02 | typecheck + grep (markReplied, repliedAt, UI) | `npx convex codegen && pnpm typecheck` + grep | ✅ | ⬜ pending |
| — | — | — | OUTR-01 | typecheck + grep (updateDraft chamado antes de send/markSent) | `pnpm typecheck` + grep | ✅ | ⬜ pending |
| — | — | — | L10N-01 | unit (paridade de chaves + countryCode→locale) + grep negativo PT | `pnpm test` + grep | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Infra existente cobre tudo (node:test; glob `tests/*.test.ts`). O dicionário i18n e seu teste nascem juntos (RED→GREEN) na task de L10N.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Self-open não conta / prospect conta | TRCK-01 | Exige browser logado vs anônimo contra deployment dev | Abrir /p/{token} logado (openCount não muda) e em aba anônima (muda) |
| Janela de corrida do PreviewTracker (auth ainda resolvendo no mount) | TRCK-01 | Timing de runtime; componente travado sem mudança pelo CONTEXT | QA manual pós-fase; se aparecer na prática, tratar em SCAL-03 (v2) |
| Botões respondeu/opt-out no fluxo real | TRCK-02 | Exige UI + dados | Smoke em dev: marcar respondeu → outbox mostra replied com timestamp |
| Composer persiste antes do envio | OUTR-01 | Exige UI + Resend | Editar corpo → enviar → conferir conteúdo persistido/enviado |
| Preview em sueco/holandês/norueguês | L10N-01 | Visual | Abrir /p/{token} de lead SE/NL/NO e conferir idioma |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
