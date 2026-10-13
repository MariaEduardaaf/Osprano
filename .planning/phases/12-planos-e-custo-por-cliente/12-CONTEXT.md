# Phase 12: Planos e custo por cliente - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning (sem fase de pesquisa separada: os números estão em `.planning/research/commercial/COST-PRICING.md` e as lacunas de código em `LAUNCH-READINESS.md` seção 4, M5/M6/M7)

<domain>
## Phase Boundary

Planos reais com limites que cabem no preço, cota reservada antes de tudo que custa dinheiro, teste grátis único, tetos diários por cliente, teto global de segurança da Duda e uso visível no app. Requisitos: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-06, SCAL-02.

**Contexto da decisão de 2026-10-13:** a Duda pulou a Fase 11 (cobrança) para abrir um **beta fechado** com 2 ou 3 pessoas, sem cobrança automática. Por isso: espelhar preços no Stripe e PLAN-05 (renovar no ciclo do Stripe) ficaram na Fase 11; a cota continua renovando na janela mensal atual. O checkout atual do Stripe NÃO deve ser removido nem quebrado (a Fase 11 refaz), só não precisa refletir os planos novos agora.

</domain>

<decisions>
## Implementation Decisions

### Planos (PLAN-01)
- Fonte única: `PLANS` em `convex/lib/domain.ts:666`. Planos novos: `trial` (teste), `solo` (EUR 29), `pro` (EUR 59), `agency` (EUR 149).
- Limites mensais (de COST-PRICING.md): leads 150 / 500 / 1.500; gerações por IA 300 / 1.000 / 3.000; consultas de detalhes do Google (`detailsPerMonth`, Fase 10) 100 / 300 / 400; sites: Claude decide valor coerente (ex.: 10 / 50 / 150). Verificações (Serper, Fase 14): incluir o campo `verificationsPerMonth` já agora (ex.: igual a leads) para a Fase 14 só consumir.
- Teste (`trial`): 25 leads, 25 gerações, detalhes 25, sites 2; **único por pessoa**, não renova.
- O plano `free` atual deixa de existir: workspaces com `free` passam a ser `trial` (migração ou leitura tolerante; Claude decide, sem quebrar o workspace de produção da Duda).
- Os textos de features da landing (`PLANS.features`) seguem a regra da Fase 9: só o que existe. Teste `tests/landing-honesty.test.ts` precisa continuar verde (a Fase 9 avisou que ele amarra o formato do texto aos limites).
- **Página Planos no beta (orquestrador, 2026-10-13):** o botão de checkout do Stripe sai da interface durante o beta para não vender pelos preços antigos do Stripe (€49 sob um cartão de €59); cada plano vira "Pedir este plano" por e-mail de suporte. O backend (`convex/billing.ts`, `convex/lib/stripe.ts`, `convex/http.ts`) fica intacto; a Fase 11 religa o checkout com os preços novos e atualiza o teste que trava isso.
- **Plano para beta:** comando interno (`internalMutation`, rodado por `npx convex run`) para a Duda dar um plano a um workspace por e-mail ou orgId, sem Stripe. O workspace dela também recebe `agency` por esse comando.

### Cota de IA (PLAN-02)
- Contador novo `aiUsed` com reserva antes de chamar a Anthropic em `outreach.draft` e `outreach.callScript` (e qualquer outro chamador de `outreachAi`); estorno se a chamada falhar. Mesmo padrão de `reserveUsage`/`refundUsage` (Fase 10 estendeu para `details`).
- Sem cota: botão bloqueado com aviso e link para `/plans` (ou contato, já que não há checkout novo).
- SCAL-02: `leads.create` (criação manual) consome cota de leads.

### Tetos diários e teto global (PLAN-03)
- Teto diário por cliente: buscas no Google (cada chamada de Text Search conta 1) e verificações. Valores: Claude propõe a partir de COST-PRICING (ex.: 20 buscas/dia).
- **Teto global de segurança:** orçamento mensal do app inteiro. Default decidido pelo orquestrador: **US$ 30/mês** somando Google (Text Search + Details) e Anthropic, estimado pelos preços unitários de `convex/lib/placesFields.ts` e COST-PRICING. Ao passar, as chamadas pagas do app são recusadas com mensagem clara e a Duda é avisada (log de erro + linha numa tabela/consulta interna; e-mail fica para a Fase 15 de monitoramento). Valor numa constante fácil de mudar; a Duda pode trocar.

### Uso visível (PLAN-06)
- Barra de uso no topo do app (layout `(app)`), com aviso em 80% e 100% por tipo (leads, IA, Google). Lembrar do bug de auth da Fase 9 (`docs/LESSONS.md`): nenhuma query nova no layout antes de `useConvexAuth`; usar o `workspaces.current` que o `AcceptanceGate` já carrega se possível.

### Teste único por pessoa (PLAN-04)
- Hoje tenant = usuário do Clerk. "Criar outra conta" com outro e-mail é fora do alcance; o requisito é: o mesmo usuário não ganha teste novo (ex.: após exclusão de conta e novo cadastro com o mesmo e-mail). Guardar marca de "teste já usado" por e-mail normalizado (hash, não o e-mail em claro) que sobrevive à exclusão de conta da Fase 9 (ajustar o purge para não apagar essa marca). Ponto de privacidade: hash do e-mail é dado pessoal pseudonimizado; registrar na política se necessário (anotar como pendência, não editar textos legais nesta fase).

### Restrições
- Branch `v1.3-pronto-pra-vender`. Gates: `node --experimental-strip-types --test tests/*.test.ts`, `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/tsc --noEmit -p convex`, `./node_modules/.bin/eslint`, `./node_modules/.bin/next build`.
- Pode publicar no Convex de DEV para testar; produção só com a Duda.
- Nenhuma dependência npm nova. Não mexer em `.env*`, nunca `convex env list`. `ANTHROPIC_API_KEY` em produção é passo da Duda (listar em "Depende de você").
- Textos PT-BR sem travessão. Fase 13 roda em paralelo em outro conjunto de arquivos (remetente/envio); evitar mexer em `convex/outreach.ts` além do necessário para a reserva de IA e registrar no plano quais funções são tocadas, para o orquestrador ordenar com a Fase 13.

</decisions>

<canonical_refs>
- `.planning/research/commercial/COST-PRICING.md` (preços unitários, limites propostos, margem)
- `.planning/research/commercial/LAUNCH-READINESS.md` seção 4 (M5, M6, M7)
- `convex/lib/domain.ts` (`PLANS`, `planLimit`, `UsageKind`), `convex/model/workspace.ts` (`reserveUsage`, `refundUsage`, `ensureFresh`), `convex/workspaces.ts`, `convex/schema.ts`
- `convex/outreach.ts` (`draft`, `callScript`), `convex/lib/outreachAi.ts`, `convex/leads.ts` (`create`), `convex/places.ts`, `convex/osm.ts`
- `convex/model/purge.ts` (Fase 9, exclusão de conta)
- `src/app/(app)/layout.tsx`, `src/components/legal/acceptance-gate.tsx`, `src/app/(app)/plans/page.tsx`, `src/app/(app)/settings/page.tsx` (barra de uso atual)
- `docs/LESSONS.md`, `AGENTS.md`
</canonical_refs>

<deferred>
- Espelhar planos no Stripe e renovar no ciclo do Stripe (PLAN-05): Fase 11.
- Aviso por e-mail à Duda quando o teto global estoura: Fase 15 (monitoramento).
</deferred>
