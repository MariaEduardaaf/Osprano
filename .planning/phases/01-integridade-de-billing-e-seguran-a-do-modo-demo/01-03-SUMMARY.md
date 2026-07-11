---
phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo
plan: 03
subsystem: auth
tags: [convex, clerk, middleware, env-guard, node-test]

# Dependency graph
requires: []
provides:
  - "isDemoEnabled(env) — default-deny helper in convex/model/tenant.ts (fonte única de verdade backend)"
  - "requireOrgId e demo.seed guardados por isDemoEnabled (CONVEX_ENV === \"development\")"
  - "src/proxy.ts: demoProxy só ativa com NEXT_PUBLIC_DEMO=1 && NODE_ENV !== \"production\""
affects: [demo-mode, auth, deploy, onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper único com env injetável (default = process.env) para testabilidade pura via node:test, sem carregar runtime Convex"
    - "Default-deny em vez de default-allow para guardas de ambiente de segurança: env esquecida deve resultar em feature OFF, nunca ON"
    - "Convex-side: usar env dedicada (CONVEX_ENV) em vez de NODE_ENV — o bundler do Convex fixa NODE_ENV=\"production\" em todo deployment, tornando-o inútil como guarda ali (Next-side NODE_ENV continua funcional)"

key-files:
  created:
    - tests/tenant.test.ts
  modified:
    - convex/model/tenant.ts
    - convex/demo.ts
    - src/proxy.ts
    - README.md
    - .env.example

key-decisions:
  - "Default-deny travado (CONTEXT.md): isDemoEnabled exige CONVEX_ENV === \"development\" explícito, não CONVEX_ENV !== \"production\" — env esquecida em prod real deve manter o demo OFF"
  - "Parâmetro env tipado como NodeJS.ProcessEnv (não Pick<...>/Record<...>): ProcessEnv só tem index signature (extends Dict<string>), então Pick/Record sobre chaves nomeadas específicas quebra a checagem estrutural do TS (TS2739/TS2559) — NodeJS.ProcessEnv aceita tanto process.env real quanto objetos literais de teste"

patterns-established:
  - "Guardas de segurança em ambiente: sempre default-deny (exigir valor explícito de ativação), nunca default-allow (excluir só o valor de produção)"

requirements-completed: [SEC-01]

# Metrics
duration: 3min
completed: 2026-07-11
---

# Phase 1 Plan 3: Segurança do Modo Demo (SEC-01) Summary

**Helper `isDemoEnabled` default-deny (`DEMO_MODE=1` AND `CONVEX_ENV="development"`) centraliza a checagem backend em `requireOrgId` e `demo.seed`; `src/proxy.ts` ganha guarda `NODE_ENV !== "production"` — env esquecida agora sempre desliga o demo, nunca liga por acidente.**

## Performance

- **Duration:** ~3 min (commit-to-commit)
- **Started:** 2026-07-11T05:27:30+02:00
- **Completed:** 2026-07-11T05:28:34+02:00
- **Tasks:** 2 completed
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- `isDemoEnabled(env)` — helper puro, default-deny, exportado de `convex/model/tenant.ts`, com env injetável (default `process.env`) para testabilidade sem runtime Convex
- `requireOrgId` e `demo.seed` (`convex/demo.ts`) agora usam o MESMO helper — fonte única de verdade, elimina a checagem inline duplicada `process.env.DEMO_MODE === "1"`
- `src/proxy.ts`: `demoProxy` só é escolhido com `NEXT_PUBLIC_DEMO === "1" && NODE_ENV !== "production"` — aqui `NODE_ENV` funciona de verdade (processo Next real, confirmado em `01-RESEARCH.md`)
- 5 testes unitários (`tests/tenant.test.ts`) provando o comportamento default-deny, incluindo o caso crítico: `CONVEX_ENV` não setada + `DEMO_MODE=1` → demo OFF
- README.md e `.env.example` documentam o passo operacional `npx convex env set CONVEX_ENV development` (obrigatório, dev-only)

## Task Commits

Each task was committed atomically (TDD for Task 1):

1. **Task 1: Helper isDemoEnabled (default-deny) + requireOrgId + testes**
   - `fafa041` feat(01-03): add isDemoEnabled default-deny helper + wire requireOrgId (RED→GREEN, commit único após verificação — ver Deviations)
2. **Task 2: Guardas em demo.ts e proxy.ts + documentação** - `868bbe7` feat(01-03): guard demo.seed e proxy por ambiente; documenta CONVEX_ENV

_Note: Task 1 seguiu TDD (RED confirmado localmente antes do commit; commit único porque o arquivo de teste RED foi perdido por uma operação git concorrente de outro plano da wave 1 antes de poder ser commitado — recriado e verificado GREEN antes do commit final, ver Issues Encountered)._

## Files Created/Modified
- `convex/model/tenant.ts` - Adiciona `isDemoEnabled(env = process.env): boolean` (default-deny) e troca a checagem inline em `requireOrgId` pelo helper
- `convex/demo.ts` - Importa `isDemoEnabled` de `./model/tenant`; guarda do `seed` trocada de `process.env.DEMO_MODE !== "1"` para `!isDemoEnabled()`
- `src/proxy.ts` - Ternário do export default ganha `&& process.env.NODE_ENV !== "production"`
- `tests/tenant.test.ts` (novo) - 5 casos: true (DEMO_MODE=1 + dev), false (CONVEX_ENV undefined), false (CONVEX_ENV=production), false (DEMO_MODE undefined), false (DEMO_MODE=0)
- `README.md` - Seção "🧪 Modo demo": adiciona `npx convex env set CONVEX_ENV development` ao bloco de comandos + nota de segurança sobre default-deny
- `.env.example` - Adiciona linha documentando `CONVEX_ENV` no bloco de server-side keys do Convex

## Decisions Made
- Seguiu à risca a decisão travada em CONTEXT.md/`<decision_fidelity>` do plano: `CONVEX_ENV === "development"` (default-deny), rejeitando explicitamente o exemplo de código do 01-RESEARCH.md (`!== "production"`, default-allow) por contradizer o requisito de segurança do SEC-01.
- Assinatura do helper ajustada de `Pick<NodeJS.ProcessEnv, "DEMO_MODE" | "CONVEX_ENV">` (proposta na `<action>` do plano) para `NodeJS.ProcessEnv` simples — ver Deviations (Rule 1, bug de tipagem).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Assinatura `Pick<NodeJS.ProcessEnv, "DEMO_MODE" | "CONVEX_ENV">` não compila em TS strict**
- **Found during:** Task 1, verificação `pnpm typecheck`
- **Issue:** `NodeJS.ProcessEnv` (via `@types/node`) é declarado só com index signature (`interface ProcessEnv extends Dict<string> {}`), sem propriedades nomeadas. `Pick<ProcessEnv, "DEMO_MODE" | "CONVEX_ENV">` e `Record<"DEMO_MODE" | "CONVEX_ENV", string | undefined>` como tipo do parâmetro com default `= process.env` falham (`TS2739`/`TS2559`: TS não considera `process.env` estruturalmente compatível com um tipo que exige essas chaves nomeadas explicitamente, mesmo que a index signature as cubra em runtime).
- **Fix:** Trocado o tipo do parâmetro para `env: NodeJS.ProcessEnv = process.env` (aceita tanto `process.env` real quanto objetos literais de teste `{ DEMO_MODE: "1", CONVEX_ENV: "development" }`, já que acesso via dot-notation numa interface só-index-signature resolve para `string | undefined`).
- **Files modified:** `convex/model/tenant.ts`
- **Verification:** `pnpm typecheck` exit 0; `tests/tenant.test.ts` 5/5 pass
- **Committed in:** `fafa041` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug de tipagem)
**Impact on plan:** Mudança estritamente de tipagem, sem afetar o comportamento default-deny nem os contratos de `<must_haves>`/`<interfaces>` do plano. Nenhum scope creep.

## Issues Encountered
- **Perda de arquivo por concorrência entre planos da wave 1:** logo após criar `tests/tenant.test.ts` (RED) e confirmar a falha esperada, o arquivo desapareceu do disco (não estava mais nem staged nem no working tree) entre a execução de Task 1 e a checagem seguinte — coincide com commits de outro plano da mesma wave (`01-02`) rodando em paralelo na mesma working tree e fazendo suas próprias operações git. Resolvido recriando `tests/tenant.test.ts` com o mesmo conteúdo, reconfirmando RED→GREEN em isolamento (`node --experimental-strip-types --test tests/tenant.test.ts`), e comitando imediatamente (staging por arquivo individual, nunca `git add -A`) para reduzir a janela de risco. Nenhuma perda de trabalho no resultado final; ambos os planos (`01-02` e `01-03`) documentaram a interferência mútua em `deferred-items.md`/aqui.
- `pnpm test` (suíte completa) mostrou falhas transitórias de arquivos de OUTRO plano da wave 1 (`clampDiscoveryCount` ainda não implementado em `convex/lib/domain.ts` no momento da checagem) — fora do escopo desta task, não tocado; confirmado depois que o plano concorrente terminou que a suíte completa ficou verde (30/30, incluindo os 5 casos de `isDemoEnabled`).

## User Setup Required

**Passo operacional obrigatório para o modo demo continuar funcionando** (documentado em `user_setup` no frontmatter do plano e no README):

```bash
npx convex env set CONVEX_ENV development
```

Rodar no deployment DEV/LOCAL. **NUNCA** setar `CONVEX_ENV=development` num deployment de produção — quando o deployment de produção for provisionado, não setar essa env lá (ou setar `=production`); o default-deny já mantém o demo inerte sem esse passo.

Sem essa env setada, `demo:seed` e o acesso sem-auth via `requireOrgId` ficam desligados mesmo com `DEMO_MODE=1` — é o comportamento seguro pretendido.

## Next Phase Readiness
- SEC-01 fechado: os 3 pontos do kill-switch de demo (`src/proxy.ts`, `convex/model/tenant.ts`, `convex/demo.ts`) agora têm guarda de ambiente com defesa em profundidade.
- Verificação manual pendente (fora de harness automatizado, conforme `<verification>` do plano): `NODE_ENV=production pnpm build && pnpm start` com `NEXT_PUBLIC_DEMO=1` deve exigir login; sem `CONVEX_ENV=development` no deployment, `demo:seed` deve lançar "DEMO_MODE desligado" mesmo com `DEMO_MODE=1`.
- Deployment de produção real ainda não provisionado neste repo (ver 01-RESEARCH.md Open Questions) — quando for, confirmar que `CONVEX_ENV` não é setada lá (ou é setada `=production`).
- Sem bloqueios para os demais planos da fase; nenhuma sobreposição de arquivo com `01-01`/`01-02` além da leitura compartilhada de `convex/model/tenant.ts` (só leitura por parte deles).

---
*Phase: 01-integridade-de-billing-e-seguran-a-do-modo-demo*
*Completed: 2026-07-11*

## Self-Check: PASSED

All created/modified files confirmed present on disk (`convex/model/tenant.ts`, `convex/demo.ts`, `src/proxy.ts`, `tests/tenant.test.ts`, `README.md`, `.env.example`, this SUMMARY.md); both task commits (`fafa041`, `868bbe7`) confirmed present in git history.
