# 12-DEV-SMOKE: fumaça no Convex de DEV (dev:ardent-jay-971)

Data: 2026-10-13. Nada rodou em produção.

| Comando | Saída relevante | Resultado |
| --- | --- | --- |
| `npx convex dev --once` | Índices novos `spend.by_month` e `trialClaims.by_key`; "Convex functions ready"; schema aceito sem invalidar documento existente | PASS |
| `convex/_generated/api.d.ts` | cita `plans`, `model/plans`, `model/budget`, `model/aiQuota` | PASS |
| `plans:migrateFreeToTrial {"dryRun":true}` | `found: 0, migrated: 0` | PASS |
| `plans:budgetStatus` | `budgetUsd: 30, month: 2026-10, usdSpent: 0, percent: 0` | PASS |
| `plans:grantPlan {"orgId":"f12-smoke","plan":"solo"}` + `workspaces:getInternal` | `plan: "solo"`, `aiUsed: 0` | PASS |
| `plans:grantPlan` com e-mail inexistente | "Nenhuma conta encontrada para esse e-mail..." | PASS |

O workspace `f12-smoke` ficou no DEV (sem dono, inofensivo).

## trialClaims (PLAN-04)

Aceite novo no DEV com conta de teste Clerk (`+clerk_test`): linha criada com `via: "subject"`.

FINDING: o token do Clerk NÃO traz `email`, então a marca do teste único caiu para o id do usuário. Nesse modo, uma conta apagada e recriada ganha teste novo. Correção é no painel do Clerk (template JWT "convex" incluir `email`); nenhuma edição feita no Clerk. Passo da Duda em `12-PROD-STEPS.md`. Depois de corrigir, repetir um aceite novo e exigir `via: "email"`.

A linha de `trialClaims` do teste ficou no DEV (por desenho sobrevive à exclusão de conta). O usuário de teste foi apagado pelo app (Ajustes > Segurança); 0 linhas dele em `workspaces` e `leads`.

## Conferência visual headless (Playwright, DEV)

- Barra no topo (dashboard, Leads, Ajustes): PASS. Teste grátis mostra 25/25/25 e "Buscas hoje 0/6 /dia".
- grantPlan solo: faixa vira Solo com 150 / 300 / 100 / 15 por dia: PASS.
- reserve ai 240: "Você já usou 80% de IA." sem recarregar: PASS.
- reserve ai +60: "Limite de IA atingido." + "Ver planos": PASS.
- /plans: três cartões €29/€59/€149, "Plano atual" no Solo, "Pedir este plano" em Pro e Agência (mailto), zero menção a Stripe/checkout: PASS.
- Ajustes, Plano & uso: plano Solo, "Trocar plano", gerações de IA: PASS. 5 recargas de Ajustes sem "Não autenticado": PASS.
- Landing: Solo €29, Pro €59, Agência €149 e "Teste grátis: 25 leads e 25 gerações por IA, um teste grátis por e-mail, não renova, sem cartão.": PASS.
- NÃO verificado: botões "Escrever com IA" / "Gerar script" desabilitados no drawer de um lead (a conta de teste não tinha lead e não há criação manual na UI). Fica para a Duda.
- Observação: a página /plans não repete "um teste grátis por e-mail, não renova" (só a landing).
