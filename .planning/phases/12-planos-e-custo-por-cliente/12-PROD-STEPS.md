# 12-PROD-STEPS: passos de produção (só da Duda)

Nenhum agente executou nada disto. Todos os comandos são seus.

## Ordem

1. Merge e deploy normal do Convex e da Vercel.
2. `npx convex run --prod plans:migrateFreeToTrial '{"dryRun":true}'` e conferir a contagem.
3. Mesmo comando com `'{"dryRun":false}'`.
4. `npx convex run --prod plans:grantPlan '{"orgId":"<id do seu usuário no Clerk>","plan":"agency"}'` (o id fica no painel do Clerk, Users, e começa com `user_`).
5. Para cada pessoa do beta, depois que ela aceitar os termos: `npx convex run --prod plans:grantPlan '{"email":"...","plan":"solo|pro|agency"}'`.
6. `npx convex run --prod plans:budgetStatus` para acompanhar o gasto do mês.
7. Nos logs do Convex, procurar `[ORCAMENTO]`.

## Depende de você

- `ANTHROPIC_API_KEY` em produção e rotação da chave exposta em 2026-09-16.
- Confirmar ou trocar o teto de US$ 30 (`convex/lib/budget.ts`, `GLOBAL_BUDGET_USD`).
- A cota diária do Google no GCP (hoje 30/dia) continua sendo a trava de último caso e precisa caber no uso do beta.
- Painel do Clerk: o template JWT "convex" precisa incluir `email`. CONFIRMADO NO DEV que hoje não inclui (a marca do teste grátis gravou `via: "subject"`). Sem isso, uma conta apagada e recriada ganha teste novo. Depois de ajustar, faça um aceite novo e confira `npx convex data trialClaims` com `via: "email"`.
- Conferir no navegador, com um lead aberto e a IA no limite, que "Escrever com IA" e "Gerar script" ficam desabilitados com o aviso.

## Pendências registradas

- O hash do e-mail em `trialClaims` é dado pseudonimizado e sobrevive à exclusão de conta (levar ao advogado, política de privacidade).
- Planos não estão espelhados no Stripe e a página Planos pede por e-mail (Fase 11).
- A cota ainda renova em janela de 30 dias (PLAN-05, Fase 11).
- Aviso por e-mail do orçamento (Fase 15).
- O literal `"free"` continua aceito no schema até a migração rodar em produção.
- A página /plans não repete o texto "um teste grátis por e-mail, não renova" (só a landing).
