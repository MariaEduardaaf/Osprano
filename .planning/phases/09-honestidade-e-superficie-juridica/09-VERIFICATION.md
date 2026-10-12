---
phase: 09-honestidade-e-superficie-juridica
verified: 2026-10-12T00:00:00Z
status: passed
score: 5/5 requisitos verificados no código; 4 itens dependem de serviço real
re_verification: nao
gaps: []
accepted_limits:
  - "Mutations de registro manual (markSent, markDm, markReplied, updateDraft) e queries de leitura não têm guarda de aceite no servidor"
  - "Mutation concorrente com o purge pode recriar um workspace vazio"
human_verification:
  - test: "Gate de aceite no navegador com conta Clerk real"
    expected: "Conta nova vê 'Antes de começar' antes de qualquer página do app; só libera com os dois checkboxes; grava termsVersion, termsAcceptedAt, professionalUse no workspace"
    why_human: "Precisa de Clerk e Convex reais"
  - test: "Reaceite após troca de versão"
    expected: "Subir LEGAL_VERSION em convex/lib/legal.ts faz quem já aceitou ver a tela de novo no próximo acesso"
    why_human: "Precisa de deploy do Convex e sessão real"
  - test: "Exclusão de conta ponta a ponta (Stripe modo teste + Clerk)"
    expected: "Digitar APAGAR cancela a assinatura, esvazia o Convex, remove o usuário do Clerk e desloga. Sem STRIPE_SECRET_KEY e com assinatura, nada é apagado e aparece a mensagem"
    why_human: "Chamadas reais ao Stripe e ao Clerk não foram feitas aqui"
  - test: "Faixa de placeholder visível"
    expected: "Páginas /legal/* e rodapés mostram 'Alguns dados da empresa ainda estão sendo preenchidos' e '[a preencher]' enquanto legal.ts tiver __PREENCHER__; a nota de advogado não aparece em produção"
    why_human: "Visual, só em navegador"
---

# Fase 9: Honestidade e superfície jurídica. Relatório de verificação

**Objetivo:** A landing diz só o que o produto faz, as páginas legais existem e estão linkadas, o cadastro registra o aceite, o suporte é achável e o cliente consegue apagar a própria conta com tudo.
**Status:** human_needed (nenhum gap de código; falta validação com serviços reais)
**Re-verificação:** Não, verificação inicial.

Evidência rodada por mim: `node --experimental-strip-types --test tests/*.test.ts` deu 390/390. tsc, eslint e next build foram rodados pelo orquestrador (verdes). Não rodei next build, Convex nem APIs reais.

## Verdades observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Landing sem depoimentos, sem "notificado", white-label, "na sua marca", toggle anual, "GDPR compliant/safe", "Sem risco", "48 negócios" | VERIFICADO | grep desses termos em `src/app/page.tsx` não retorna nada |
| 2 | Planos da landing vêm da fonte única | VERIFICADO | `src/app/page.tsx` renderiza `<Pricing />`; `src/components/landing/pricing.tsx` usa `PLANS`; sem preço hardcoded na página |
| 3 | Sete páginas legais públicas, fora de `(app)` | VERIFICADO | `src/app/legal/{empresa,termos,privacidade,dpa,subprocessadores,cookies,aviso-prospect}/page.tsx` (41 a 94 linhas cada, conteúdo real) + `legal/layout.tsx` |
| 4 | Termos: uso B2B, cliente responsável pelo contato, Google Maps com link | VERIFICADO | `termos/page.tsx` seções 2, 3 e 5 |
| 5 | Identidade única com placeholders e build que não falha | VERIFICADO | `convex/lib/legal.ts` (`LEGAL_IDENTITY`, `legalPlaceholders()`, genérico CNPJ/Brasil); `PlaceholderNotice` em `legal-links.tsx` visível em qualquer ambiente; nenhum guard de build |
| 6 | Links legais + suporte no rodapé da landing e do app | VERIFICADO | `LegalLinks` em `src/app/page.tsx:600` e `src/app/(app)/layout.tsx:13`, com e-mail de suporte/privacidade vindo de `LEGAL_IDENTITY` |
| 7 | Aceite registrado com versão e data; versão nova pede reaceite | VERIFICADO no código | `AcceptanceGate` envolve o layout `(app)`; `workspaces.current` devolve `acceptanceOk = isAccepted(ws)`; `acceptTermsFor` grava `termsVersion/termsAcceptedAt/professionalUse` e rejeita versão que não é a vigente; testes `acceptance.test.ts`, `legal.test.ts` |
| 8 | Guarda de aceite no servidor nos caminhos que gastam ou enviam | VERIFICADO | `assertAccepted` em `reserveUsage` (ponto único de cota), `outreach.ts` (225, 287, 492), `whatsapp.ts:23`, `billing.ts:26` |
| 9 | Exclusão de conta: Stripe primeiro, Convex em lotes, Clerk por último | VERIFICADO no código | `convex/account.ts` `deleteMyAccount` (exige "APAGAR", aborta sem `STRIPE_SECRET_KEY` se há assinatura, cancela e só então chama `purgeBatch` em loop); `convex/model/purge.ts` apaga leads (cascata), previews, events, outreach, uploads + storage, supressões da org, users e o workspace por último; global fica intacto; `src/app/api/account/clerk/route.ts` remove o usuário logado; `delete-account.tsx` encadeia os três e faz signOut; `purge.test.ts` |

**Score:** 9/9 verdades no código.

## Cobertura de requisitos

| Requisito | Plano | Status | Evidência |
|-----------|-------|--------|-----------|
| LEGAL-01 | 09-02, 09-07 | SATISFEITO | verdades 1 e 2 |
| LEGAL-02 | 09-01, 09-03, 09-04, 09-07 | SATISFEITO (conteúdo é rascunho, identidade em placeholder) | verdades 3 a 6 |
| LEGAL-03 | 09-01, 09-05, 09-07 | SATISFEITO no código, falta teste real | verdades 7 e 8 |
| LEGAL-04 | 09-01, 09-03, 09-05, 09-07 | SATISFEITO (e-mail ainda é placeholder, mostra "[a preencher]") | verdade 6 |
| LEGAL-05 | 09-06, 09-07 | SATISFEITO no código, falta teste real | verdade 9 |

Os cinco IDs do REQUIREMENTS.md aparecem em planos. Sem requisitos órfãos. O quadro de rastreio no REQUIREMENTS.md ainda mostra "Pending" (o orquestrador atualiza).

## Limites aceitos (avaliação pedida)

**(a) Mutations de registro manual e queries sem guarda de aceite no servidor. Limite aceito, com ressalva.**
Quem nunca aceitou só consegue, burlando a UI e chamando o Convex direto, ler seus próprios dados e editar registros manuais (markSent, markDm, markReplied, updateDraft, e mutations de leads). Todo caminho que gasta cota, chama API paga ou sai ao prospect está guardado (itens 8 acima). O CONTEXT travou o gate como layout de `(app)`, e isso está cumprido. Risco residual é baixo: o escopo é sempre a própria org, nada sai. Se a Duda quiser a leitura "nenhum uso sem aceite" ao pé da letra no servidor, é trabalho de uma fase de endurecimento (guarda no helper `requireOrgId` ou similar), não bloqueia a venda.

**(b) Mutation concorrente com o purge recria workspace vazio. Limite aceito.**
Já documentado em `convex/model/purge.ts` (comentário `ponytail`). O resíduo é um workspace vazio, sem dados, sem aceite (então nem usável), e o usuário do Clerk é removido logo depois. Sem impacto de privacidade.

## Observações (não bloqueiam)

- As supressões da org são apagadas com a conta, como decidido; a Fase 13 deve revisar isso (comentário no código já avisa).
- Se `deleteMyAccount` falhar no meio, o workspace (âncora com stripeSubscriptionId) continua e dá para repetir; a mensagem orienta isso.
- Se a rota do Clerk falhar após o purge, o usuário recebe alerta e o login fica; pode repetir.
- Textos legais são rascunho e identidade está em placeholder: a checagem "zero placeholders" é do portão da Fase 16, como decidido.

## Anti-padrões

Nenhum bloqueador encontrado nos arquivos da fase (sem stubs, sem TODOs que travem, componentes ligados).

## Resumo

Nenhum gap de código. O status é human_needed só porque gate, reaceite, exclusão ponta a ponta e a faixa de placeholder exigem Clerk, Stripe teste e navegador (plano 09-07, checkpoint humano).

_Verificado: 2026-10-12_
_Verificador: Claude (gsd-verifier)_


## Conferência humana (2026-10-12, autorizada pela Duda)

Rodada no deployment Convex de DEV (`ardent-jay-971`, `npx convex dev --once`) com Next local e conta de teste do Clerk de desenvolvimento (criada pela API, porque o cadastro pelo formulário é barrado pelo Turnstile do Clerk em navegador automatizado):

| Item | Resultado |
|------|-----------|
| Gate no primeiro acesso | ✓ conta nova caiu em "Antes de começar"; botão travado com 1 caixa, liberado com 2; após aceitar abriu o dashboard; workspace gravou `termsVersion 2026-10-12`, `termsAcceptedAt`, `professionalUse true` |
| Reaceite após subir versão | ✓ com `LEGAL_VERSION` trocada temporariamente no dev, a tela voltou com "Nossos documentos foram atualizados"; versão revertida e redeployada |
| Faixa de placeholder | ✓ `/legal/empresa` mostra "[a preencher]" e o aviso; nota de advogado escondida por `VERCEL_ENV === "production"` (não testável localmente) |
| Exclusão ponta a ponta | ✓ "apagar" minúsculo mantém o botão travado; "APAGAR" apaga e volta à landing; 0 linhas da org em workspaces/users/leads/previews/outreach/events/uploads/suppressions; Clerk devolve 404 para o usuário |
| Cancelamento no Stripe | ✗ não testado: o dev não tem `STRIPE_SECRET_KEY`; a conta de teste não tinha assinatura. Coberto só pelos testes unitários (`stripeDelete`). Retestar na Fase 11/16 com Stripe em modo teste |

**Bug achado e corrigido:** recarga completa derrubava o app 1 em 6 vezes ("Não autenticado" na query do gate antes do token do Clerk). Corrigido em `5e02109` (gate espera `useConvexAuth`); 0 em 12 recargas depois. Registrado em `docs/LESSONS.md`.
