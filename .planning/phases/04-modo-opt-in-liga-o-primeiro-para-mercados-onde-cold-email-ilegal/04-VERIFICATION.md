---
phase: 04-modo-opt-in-liga-o-primeiro-para-mercados-onde-cold-email-ilegal
verified: 2026-07-22
verdict: PASS (com limitação de ambiente registrada)
plans_complete: 6/6
requirements: [OPTIN-01, OPTIN-02, OPTIN-03, OPTIN-04, OPTIN-05, OPTIN-06]
---

# Phase 4 — Verificação

## Suíte automatizada

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npx tsc --noEmit` | ✅ exit 0, zero diagnósticos |
| Lint | `npx eslint` | ✅ exit 0, 0 erros / 0 warnings (73 arquivos) |
| Testes | `node --experimental-strip-types --test tests/*.test.ts` | ✅ 69/69 pass, 0 fail |
| Build | `npx next build` | ✅ exit 0, 13 rotas, 11/11 páginas estáticas |

Baseline antes da fase: 44 testes. Depois: 69 (+25).

> **RESOLVIDO em 2026-07-22.** `npx convex codegen` falhava com "You don't
> have access to the selected project" porque o `CONVEX_DEPLOYMENT` apontava
> para o projeto `sitescout` (nome antigo do repo), inexistente na conta.
> Reconfigurado com `npx convex dev --once --configure new --project osprano
> --dev-deployment local`. Codegen roda, o schema da Fase 4 está no banco e
> os testes de runtime abaixo passaram.

## Critérios de sucesso da fase

Cada critério foi verificado por um agente cético independente, instruído a
REFUTAR a afirmação lendo o código (não relatórios de implementação).

| # | Critério | Verdict |
|---|----------|---------|
| 1 | Descoberta funciona em ES/IT/PT/DE/DK/CH e todo lead nasce `emailable=false` | ✅ |
| 2 | Abas "Email primeiro" / "Ligação primeiro"; card de ligação sem ação de cold email | ✅ |
| 3 | Script de ligação por IA no idioma do mercado + tradução pt-BR, pedindo consentimento | ✅ |
| 4 | Consentimento destrava o email; `draft`/`send` recusam lead opt-in sem ele (server-side) | ✅ |
| 5 | Mercados opt-in exibem aviso de validação jurídica **por país** | ✅ (após correção) |

O critério 5 **reprovou na primeira rodada**: o aviso era fixo na aba e a flag
`legalReview` era dado morto — marcar um mercado como `validated` não mudava
nada. Corrigido: o banner deriva de `MARKETS[país].legalReview === "pending"`.

## Defeitos encontrados na verificação e corrigidos

Ordenados por gravidade. Todos fechados nesta fase.

### Blocker — fluxo do modo opt-in era inexecutável
`src/components/lead-card.tsx`: no modo call, o slot `action` do pai só
renderizava após o consentimento. O plano assumiu que esse slot era uma ação
de cold email, mas na página de Leads o que o pai passa é o
`GeneratePreviewButton`. Resultado: era impossível gerar a prévia antes de
ligar — enquanto o script gerado promete ao prospect que a prévia já existe.
O gate de email é server-side; a UI não precisa (nem deve) esconder a prévia.

### Major — `markSent` sem guardrail (3º caminho de "email enviado")
`convex/outreach.ts`: o fluxo "copiei e enviei do meu email" gravava status
`sent`, avançava o estágio e inseria evento `email_sent` para lead de mercado
opt-in sem consentimento — que `draft` e `send` recusam. Agora passa por
`canContactByEmail` **e** pela lista de supressão. `updateDraft` e
`upsertDraft` receberam o mesmo check por defesa em profundidade.

### Major — bug anterior à fase: linha de outreach errada
A tabela `outreach` é compartilhada com o WhatsApp (`channel: "whatsapp"`).
As leituras por `by_lead` usavam `.first()` sem filtrar canal — com um
follow-up de WhatsApp no lead, `markSent`/`markReplied`/`updateDraft`/
`getForLead` podiam ler ou patchar a linha errada, e a `outbox` listava
WhatsApp como se fosse email. Corrigido com um helper único
`emailRowForLead`.

### Major — `canContactByEmail` não era o único predicado de abordabilidade
Depois de registrar consentimento, o app continuava dizendo que o lead não
era abordável em: rodapé do card (ambas as variantes), seção de compliance do
detalhe do CRM, filtro "Abordável" do Kanban (**o lead sumia do board**),
contador da página de Leads, stat "Abordáveis" do dashboard, e o
`WhatsAppFollowup`, que exigia registrar opt-in de novo apesar de o servidor
já aceitar o consentimento genérico.

### Major/Blocker — idioma do prospect quebrado em 5 pontos
1. Rotas `/p/[token]` e `/site/[slug]` herdavam `lang="pt-BR"` e o título do
   produto do layout raiz — o prospect via título em português no "site dele".
2. Fallback de parse do `writeEmail` devolvia assunto hardcoded em inglês
   sobre corpo traduzido.
3. Rodapé de opt-out rotulado "pt-PT" estava escrito em português do Brasil.
4. `LANG.PT = "Portuguese"` era interpolado cru no prompt, que na mesma
   chamada pedia tradução "Brazilian Portuguese" — ancorava o modelo em pt-BR
   para o prospect português. Agora é `"European Portuguese (pt-PT)"`, com as
   duas audiências separadas explicitamente no prompt.
5. Página de confirmação do unsubscribe era HTML fixo em inglês: o prospect
   dinamarquês clicava em "Afmeld dig" e aterrissava em inglês.
6. Dicionário do preview não acompanhou `LANG`/`FOOTER_COPY` — ES/IT/PT/DE/
   DK/CH caíam em inglês. Agora tem os 9 locales, com testes de paridade que
   quebram se um mercado novo entrar sem tradução.

### Minor — tradução falsa era pior que nenhuma
Quando o modelo não devolve JSON válido, `writeCallScript` retornava o mesmo
texto estrangeiro nos dois campos, e a UI exibia isso rotulado como
"Tradução (pt-BR)". A usuária não fala esses idiomas. Agora o fallback
devolve tradução vazia e o painel avisa que ela não pôde ser gerada.

### Minor — testes que cristalizavam o dado, não o mecanismo
`tests/domain.test.ts` afirmava `legalReview === "pending"` para todos os
mercados opt-in — validar juridicamente a Espanha (exatamente o que OPTIN-06
promete) quebraria a suíte. Reescrito para travar a invariante.

## Verificação de runtime (executada 2026-07-22)

Rodada contra o deployment local, com `DEMO_MODE=1` e o seed. Até aqui o
backend só tinha typecheck — estes são os primeiros testes de execução real
das mutations/actions.

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | `outreach.draft` em lead ES sem consentimento | ✅ recusa: "Mercado opt-in: registre o consentimento…" |
| 2 | `outreach.markSent` no mesmo lead (o 3º caminho, que era o buraco) | ✅ recusa com o mesmo erro |
| 3 | `outreach.updateDraft` no mesmo lead | ✅ recusa com o mesmo erro |
| 4 | `outreach.upsertDraft` (defesa em profundidade) em lead CH sem consentimento | ✅ recusa |
| 5 | `outreach.draft` em lead DE **com** consentimento | ✅ passa o gate (para só na falta de `ANTHROPIC_API_KEY`) |
| 6 | `outreach.callScript` em lead ES **sem** consentimento | ✅ NÃO é bloqueado — a ligação é o que conquista o consentimento |
| 7 | `leads.recordContactOptIn` e depois `draft` no mesmo lead ES | ✅ consentimento destrava o gate |
| 8 | `recordContactOptIn` com origem fora do vocabulário | ✅ `ArgumentValidationError` — a prova legal não aceita string livre |
| 9 | **Supressão vence consentimento:** lead DE com consentimento que pediu opt-out | ✅ `draft` e `markSent` recusam por opt-out, não por mercado |
| 10 | Página de unsubscribe do lead DE (Leipzig) | ✅ `<html lang="de">`, título "Abgemeldet" |
| 11 | Token inválido na página de unsubscribe | ✅ cai no inglês (fallback) |
| 12 | Resolução suíça ponta a ponta (Genève / Lugano / Zürich) | ✅ `lang="fr"` / `"it"` / `"de"` |
| 13 | Subúrbio de Genebra ("Chêne-Bougeries") — o risco real do Foursquare | ✅ `lang="fr"` |
| 14 | Cidade suíça desconhecida | ✅ `lang="de"` (fallback deliberado) |

O teste 9 é o mais importante: prova que o consentimento destrava o regime do
mercado mas **nunca** relaxa a supressão.

Dados do demo restaurados ao final (`demo.seed` limpa a org antes de semear).

### Ainda pendente — exige chave externa

| O quê | Precisa de |
|-------|-----------|
| Busca real em Madrid → leads com `emailable=false` | `GOOGLE_PLACES_API_KEY` |
| Script de ligação em espanhol + tradução pt-BR, e o francês de Genebra | `ANTHROPIC_API_KEY` |
| Email realmente entregue com rodapé localizado | `RESEND_API_KEY` |

## Limitações conhecidas (deliberadas)

- ~~**Suíça inteira mapeada para alemão.**~~ **RESOLVIDO em 2026-07-22**
  (branch `feat/suica-multilingue`): o idioma passou a ser derivado de
  `(país, cidade)` via `swissLanguage`. Genebra/Lausanne/Neuchâtel/Fribourg/
  Sion → francês; Lugano/Bellinzona/Locarno/Chiasso → italiano; resto e
  cidade desconhecida → alemão. Francês entrou no dicionário da prévia, no
  rodapé de opt-out e na página de cancelamento.
- **Sem testes de função Convex.** O repo não tem `convex-test` e instalar
  dependência exige aprovação; mutations/actions são cobertas por typecheck +
  grep de invariantes, como nas fases 1–3.
- **França fora.** Regime "conditional" — exige análise da CNIL antes.
- **Criação manual de lead só oferece mercados launch.** Assimetria de UX com
  a descoberta; fora do escopo declarado da fase.
