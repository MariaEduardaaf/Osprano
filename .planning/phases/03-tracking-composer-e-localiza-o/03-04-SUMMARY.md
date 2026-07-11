---
phase: 03-tracking-composer-e-localiza-o
plan: 04
subsystem: ui
tags: [react, convex, react-compiler, outreach, composer, crm]

# Dependency graph
requires:
  - phase: 03-tracking-composer-e-localiza-o (plan 03)
    provides: "api.outreach.markReplied e api.outreach.updateDraft (mutations)"
provides:
  - "Composer que persiste subject/body via updateDraft antes de send/markSent/copy"
  - "Composer que pré-preenche a partir de getForLead sem gastar chamada de IA"
  - "Botões Respondeu e Pediu opt-out na aba Abordagem do lead-detail"
  - "Ação de linha Respondeu na outbox para itens sent/opened"
affects: [outreach, crm, tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hidratação one-shot de estado local a partir de query Convex via troca de `key` num componente filho (padrão oficial React 'reset state with a key'), em vez de useRef+useEffect — exigido pelas regras do React Compiler (react-hooks/set-state-in-effect e react-hooks/refs, ambas 'error' neste projeto)"

key-files:
  created: []
  modified:
    - src/components/outreach-composer.tsx
    - src/components/crm/lead-detail.tsx
    - src/app/(app)/outreach/page.tsx

key-decisions:
  - "Hidratação do composer implementada com key-remount (ComposerBody montado só após getForLead resolver), não useRef+useEffect como o plano prescrevia — o padrão do plano viola react-hooks/set-state-in-effect e react-hooks/refs (React Compiler deste projeto, ambas 'error')"
  - "Marcar Respondeu no lead-detail e na outbox só muda o status do outreach, nunca a etapa (stage) do lead"
  - "Botão Pediu opt-out só aparece quando lead.email existe (suppress exige email) e pede confirmação via window.confirm antes de gravar"

patterns-established:
  - "Hidratação one-shot de estado local editável a partir de dado assíncrono: componente pai busca via useQuery e monta um filho com key={loading|loaded}, filho inicializa useState a partir do valor já resolvido — sem efeito, sem ref durante render"

requirements-completed: [TRCK-02, OUTR-01]

# Metrics
duration: 7min
completed: 2026-07-11
---

# Phase 3 Plan 04: Composer persistente + ações manuais de resposta/opt-out Summary

**Composer do outreach passa a persistir cada edição via `updateDraft` (send/markSent/copy) e pré-preenche a partir de `getForLead` sem gastar IA; lead-detail e outbox ganham ações manuais "Respondeu" (markReplied) e "Pediu opt-out" (suppress) ligadas às mutations reais de tracking.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-11T05:15:23Z (baseline STATE.md)
- **Completed:** 2026-07-11T05:21:46Z
- **Tasks:** 3 (mais 1 fix de deviation no composer)
- **Files modified:** 3

## Accomplishments
- O que o usuário edita no composer (assunto/corpo) nunca se perde: `updateDraft` roda antes de `markSent`, de `send` e (fire-and-forget) ao copiar.
- Reabrir a aba Abordagem com rascunho salvo pré-preenche o composer direto de `getForLead`, sem chamar a IA de novo.
- A hidratação acontece uma única vez — implementada via troca de `key` (padrão oficial do React), não sobrescrevendo o que o usuário está digitando.
- Aba Abordagem do lead-detail ganhou botões "Respondeu" (markReplied) e "Pediu opt-out" (suppress + `window.confirm`), fechando o item deferido da Fase 2.
- A outbox ganhou ação de linha "Respondeu" para itens `sent`/`opened`, com estado busy por linha.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Composer persiste (updateDraft) + pré-preenche (getForLead)** - `39a4962` (feat)
2. **Task 2: Botões Respondeu + Pediu opt-out na aba Abordagem** - `2e3c54f` (feat)
3. **Task 3: Ação de linha Respondeu na outbox** - `0f78428` (feat)
4. **Fix de deviation: hidratação via key, não useRef+effect** - `ad97261` (fix)

**Plan metadata:** (a ser commitada junto com este SUMMARY)

## Files Created/Modified
- `src/components/outreach-composer.tsx` - persiste via `updateDraft` antes de send/markSent/copy; pré-preenche a partir de `getForLead` com hidratação one-shot via key-remount (`ComposerBody`)
- `src/components/crm/lead-detail.tsx` - `ApproachTab` ganha botões "Respondeu" (markReplied) e "Pediu opt-out" (suppress + confirm, condicionado a `lead.email`)
- `src/app/(app)/outreach/page.tsx` - coluna "Prévia" da outbox ganha botão "Respondeu" por linha para status `sent`/`opened`, com `busyLead` por linha; link "Abrir" preservado

## Decisions Made
- Hidratação do composer: key-remount em vez de useRef+useEffect (ver Deviations abaixo — decisão forçada pelo lint do React Compiler, não escolha estética).
- "Respondeu" (markReplied) nunca altera `stage` do lead — só o status do `outreach`, conforme o plano determinou explicitamente.
- Botão de opt-out só renderiza quando `lead.email` existe, espelhando a pré-condição da mutation `suppress` ("Lead sem email para suprimir.").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Padrão de hidratação do plano (useRef+useEffect) viola lint do React Compiler**
- **Found during:** Task 1, ao rodar `pnpm lint` na verificação final
- **Issue:** O plano prescrevia `const hydrated = useRef(false)` lido dentro de um `useEffect` que chama `setSubject`/`setBody`/`setOpen`. Esse projeto roda com React Compiler habilitado (Next 16) e o ESLint (`eslint-plugin-react-hooks@7`) trata `react-hooks/set-state-in-effect` e `react-hooks/refs` como `error`. A primeira tentativa (mover a leitura do ref para fora do `useEffect`, direto no corpo do componente) trocou um erro por outro (`react-hooks/refs`: "Cannot access refs during render").
- **Fix:** Reestruturado `OutreachComposer` em um componente pai que só faz `useQuery(getForLead)` e monta um filho `ComposerBody` com `key={existing === undefined ? "loading" : "loaded"}` — o padrão oficial do React para inicializar estado uma única vez a partir de dado assíncrono (remount controlado por key, documentado em "You Might Not Need An Effect"). `ComposerBody` inicializa `subject`/`body`/`open` via `useState(existing?.subject ?? "")` etc., computado no mount — sem efeito, sem ref lido durante o render. O comportamento observável é idêntico ao pedido pelo plano (pré-preenche uma vez, sem gastar IA, nunca sobrescreve digitação em curso), mas o mecanismo de guarda mudou de `useRef` para `key`.
- **Files modified:** src/components/outreach-composer.tsx
- **Verification:** `pnpm typecheck` e `pnpm lint` verdes (zero erros/warnings); `pnpm test` 44/44 passando
- **Committed in:** `ad97261`

---

**Total deviations:** 1 auto-fixed (1 bug — padrão prescrito incompatível com o lint do projeto)
**Impact on plan:** Comportamento observável e critérios de aceite substantivos (persistência antes de send/mark/copy, pré-preenchimento sem IA, guard contra clobbering) mantidos integralmente. Um critério de aceite literal do plano (`grep -q "hydrated = useRef(false)"`) não é mais satisfeito por construção — substituído por um mecanismo equivalente exigido pelo toolchain do projeto (AGENTS.md: "Read the relevant guide... Heed deprecation notices" — regras do React Compiler são um breaking change deste Next.js em relação ao conhecimento de treino).

## Issues Encountered
None além da deviation acima.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TRCK-02 e OUTR-01 completos: funil "respondeu" funciona fora do modo demo (outbox e lead-detail), opt-out manual existe e é acionável pela UI, e nenhuma edição do composer se perde.
- Wave 2 (único plano) da Fase 3 concluída. Fase 3 completa (03-01 a 03-04).
- Verificação manual sugerida (03-VALIDATION.md §Manual-Only): editar corpo → enviar/marcar/copiar → conferir persistido; marcar respondeu na outbox e no lead-detail → status replied com timestamp real.

---
*Phase: 03-tracking-composer-e-localiza-o*
*Completed: 2026-07-11*

## Self-Check: PASSED

All created/modified files found on disk; all 4 task commits (`39a4962`, `2e3c54f`, `0f78428`, `ad97261`) verified present in `git log`.
