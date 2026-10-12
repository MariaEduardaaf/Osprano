---
phase: 10-dados-do-google-conformes
verified: 2026-10-12T21:30:00Z
status: human_needed
score: 6/6 requisitos verificados em código; 4 itens dependem de humano (UI no dev e portão de produção)
re_verification: false
gaps: []
human_verification:
  - test: "Gaveta do lead no dev: lead do Google não confirmado mostra o cartão do Google com a atribuição 'Google Maps' e o formulário de confirmação começa vazio"
    expected: "Cartão só leitura com texto 'Google Maps' (sem tradução, sem quebra); formulário exige nome digitado e origem; sem botão 'copiar do Google'; depois de confirmar, o cartão some e os campos viram editáveis"
    why_human: "Renderização e fluxo de UI; só há varredura de fonte nos testes"
  - test: "Botão 'Carregar dados do Google desta página' e contador de cota (/leads)"
    expected: "Carrega até 24 registros da página, mostra o uso mensal (X de 25 no free), estorna falhas/404, bloqueia ao estourar o teto, e os dados somem ao recarregar a página"
    why_human: "Comportamento real contra a API do Google e cota; nenhuma chamada real foi feita nesta verificação"
  - test: "Kanban do CRM depois da troca para leads.listCrm"
    expected: "Arrastar entre estágios atualiza na hora (otimista), faixa 'Hoje' e exclusão funcionam, aviso aparece no teto de 1000, lead aberto por ?lead= fora do conjunto carregado abre normalmente, lead legado sem campo saved aparece"
    why_human: "Interação de arrastar e soltar e atualização otimista"
  - test: "Portão de produção (plano 10-12): backup, dry-run, execução e decisões da Duda"
    expected: "Backup do prod (convex export) antes; dry-run revisado; decidir o que fazer com publishedNameKeptLeadIds e previewsChangedWithSentOutreach; migrateAll real; novo dry-run com leadsCleaned 0 e previewsCleaned 0"
    why_human: "Ação em produção, exige aprovação explícita da Duda. Plano 10-12 ainda não executado: GPLC-04 está pronto no código e ensaiado no dev, mas NÃO aplicado nos dados reais"
---

# Fase 10: Dados do Google conformes. Relatório de verificação

**Objetivo:** lead vindo do Google guarda só o `place_id`; os dados do Google aparecem buscados na hora, com atribuição e sem estourar o custo; só dado confirmado pelo cliente (ou do OpenStreetMap) vai para o público e para a IA.
**Verificado:** 2026-10-12
**Status:** human_needed (código conforme; falta conferência humana de UI e o portão de produção)
**Reverificação:** não, verificação inicial. Planos 01 a 11 verificados; plano 12 (portão de produção) não executado, por desenho.

## Evidência rodada agora

- `node --experimental-strip-types --test tests/*.test.ts`: 468 passam, 0 falham.
- `tsc --noEmit` raiz: 0. `tsc --noEmit -p convex`: 0.
- Não rodei next build, convex, nem chamadas reais ao Google (conforme instruído).

## Verdades observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Lead do Google nasce só com place_id + termo buscado + cidade/país + derivados (score, tier, sinais, forma jurídica) | VERIFICADO | `convex/model/discovery.ts` `insertPlacesLead` insere só esses campos; sem name/phone/address/website/rating. `places.insertPlacesLead` internal tem args sem conteúdo. `leads.insertDiscovered` não aceita mais `places` (union só fsq/osm/scrape). Lead existente nunca é reescrito pela busca. |
| 2 | Sem lat/lng gravado (decisão do orquestrador); sem cron de 30 dias | VERIFICADO | `grep` no schema: nenhum campo lat/lng/locAt. Satisfaz "no máximo 30 dias". |
| 3 | Dados do Google buscados na hora, só na resposta de action, sem gravar | VERIFICADO | `places.search` devolve `shown` (toPlaceLite), `details` (máscara FULL, 1 consulta) e `detailsMany` (máscara LIST, até 24) são `action`, sem mutation com conteúdo, log só de status. Front guarda só em memória JS (`use-google-places.ts`, sem localStorage/sessionStorage/IndexedDB; teste de varredura). |
| 4 | Custo contado na cota existente, sem estourar | VERIFICADO | `reserveUsage`/`refundUsage` com kind `details`; `PLANS.detailsPerMonth` free 25, pro 300, agency 400; reserva antes da chamada e estorno em erro de rede, 404 e `!ok` (tanto em `details` quanto `detailsMany`). `detailsMany` pula leads já confirmados e limita a 24. Testes `google-details-quota`, `google-cost`. |
| 5 | Só dado confirmado (ou OSM/manual) sai para /p, /site, IA, callScript, WhatsApp, DM e links sociais | VERIFICADO | Fonte única `convex/lib/googleData.ts`. `ensurePreview` exige `shareableName`; `defaultContentForLead` usa `shareableFacts`/`shareableCategory` e zera rating/reviews de Google; `readContent` preenche nome só com `shareableName`. `outreach.draft` e `callScript` usam `shareableLead` + travam sem nome; `callScript` exige telefone compartilhável; `whatsapp.sendFollowup` usa `shareableFacts().phone`. Front: `dm-composer` usa `shareableName` e remove rating/reviews de Google; `socialLinks` usa `shareableName`. Rótulos internos (`leadLabel`) só em telas/listas do app (outbox, events, listSites, admin CLI), nunca em saída externa. |
| 6 | Confirmação defensável: digitada, com origem obrigatória, apaga resíduo do Google | VERIFICADO | `leads.confirmInfo` -> `confirmPatch`: primeira confirmação exige nome digitado e `via`; zera phone/address/website/rating/reviewsCount do Google; `updateInfo` não aceita name/phone/address. Resíduo jurídico (servidor não distingue digitado de copiado) já está registrado no CONTEXT como ponto para advogado. |
| 7 | Atribuição "Google Maps" em toda tela com conteúdo do Google; sem mapa junto | VERIFICADO (UI pendente de olho humano) | Único renderizador de conteúdo do Google é `GoogleCard` (usado em `lead-card.tsx` e `business-data.tsx`), que inclui `GoogleAttribution` (texto, `translate="no"`, 12px, #5E5E5E / branco no escuro). Nenhum mapa no app; o `MapEmbed` está só nos templates públicos e usa o endereço confirmado do cliente. |
| 8 | Leitura paginada/limitada (SCAL-01) | VERIFICADO | `leads.list` removido; `listForDiscovery` paginado, `listCrm` com teto 1000, `stats`/`analytics` com `take(5000)` + `truncated`; `listSites` (200), `outbox`, `isEmailSuppressed` sem `.collect()`. Restam `.collect()` só em `admin.ts` e `demo.ts` (CLI e seed, fora do escopo do requisito). |
| 9 | Migração dos leads existentes sem perder estágio, notas, histórico, site, dados confirmados | VERIFICADO NO DEV, NÃO APLICADO EM PRODUÇÃO | `model/googleMigration.ts` + `googleCompliance.ts`: limpa só leads Google sem `confirmation` (`scrubLeadPatch`), toca só campos de conteúdo (não stage/notes/events/outreach), idempotente, relatório só com contagens e ids, previews legados sempre regravados em v2 (commit 57ee343), nome de site publicado mantido e listado. Ensaio no dev (`10-DEV-DRYRUN.md`): dry1 = real (3 leads, 3 previews), dry2 = 0/0; backup feito antes; índices com `undefined` conferidos em runtime real. `seedDevFixtures` protegido por `isDevEnv()`. |

## Requisitos

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| GPLC-01 só place_id | SATISFEITO (código); dados antigos de prod dependem do portão | Verdades 1 e 2. |
| GPLC-02 busca sob demanda, cota, custo | SATISFEITO (código); comportamento real precisa de humano | Verdades 3 e 4. |
| GPLC-03 confirmação do cliente e saídas | SATISFEITO | Verdades 5 e 6. |
| GPLC-04 migração dos existentes | PARCIAL: código pronto e ensaiado no dev; produção pendente (plano 10-12) | Verdade 9. Não é lacuna de código, é o portão humano planejado. |
| GPLC-05 atribuição, sem mapa | SATISFEITO (código); visual precisa de humano | Verdade 7. |
| SCAL-01 paginação | SATISFEITO | Verdade 8. |

Sem requisitos órfãos: REQUIREMENTS.md mapeia GPLC-01..05 e SCAL-01 à Fase 10 e todos aparecem nos planos.

## Caça a vazamentos (convex/ e src/)

Nenhum caminho encontrado que grave conteúdo do Google ou envie conteúdo não confirmado para fora. Caminhos checados:

- `places.ts` (search, details, detailsMany), `model/discovery.ts`, `scoring.ts` (`scoreLead` ignora `source places`, não repontua com sinais vazios), `adminActions.discover` (usa `runPlacesSearch`, mesmo caminho), `leads.insertDiscovered` (sem `places`), `admin.importLeads` (`buildImportedLead` grava `source: "manual"`), `demo.ts` (seed `manual`, não se passa por Google), `foursquare.ts` e `osm.ts` (fontes não Google).
- Saídas: `previews` (getByToken, getBySlug, publish, recordOpen), `outreach` (draft, callScript, outbox), `whatsapp`, `lib/outreachAi` (recebe só `shareableLead`), `events`, `lib/site`, `lib/lead-links` (`socialLinks` seguro), `dm-composer`.
- Derivados guardados (score, tier, sinais, forma jurídica) seguem permitidos pela decisão do orquestrador; `shareableSignals` neutraliza `noSite`/`socialOnly`/`sparseProfile` de Google antes de ir para IA/DM, a menos que o cliente tenha confirmado `noSite`.

### Pontos de atenção (não bloqueiam)

| Item | Severidade | Observação |
|------|-----------|------------|
| `lead-links.whatTheyHaveLink` monta um link do Google Maps com `lead.name`/`lead.address` crus | Info | Só alcança lead não Google (OSM/manual) ou Google já confirmado; para Google não confirmado nome/endereço não existem no banco. É link de navegação interno do app, não conteúdo do Google. |
| Sites já publicados mantêm nome vindo do Google | Aviso (decisão registrada) | Decisão 4 do orquestrador; 1 caso no dev. A Duda decide no portão (`publishedNameKeptLeadIds`). |
| Histórico (rascunhos, mensagens, roteiros, slugs) com nome do Google continua gravado | Aviso (decisão registrada) | Decisão 5; só contado no relatório (`leadsWithOutreachHistory`, `leadsWithCallScript`). Ponto para advogado. |
| Confirmação digitada não é verificável pelo servidor | Aviso (decisão registrada) | Resíduo jurídico já documentado no CONTEXT. |
| `.collect()` restante em `admin.ts` e `demo.ts` | Info | Operações de CLI/seed por org; fora de SCAL-01. |

## Lacunas

Nenhuma lacuna de código encontrada. `gaps: []`.

## Resumo

O código cumpre as cinco verdades de conformidade e a paginação. O que impede `passed` é verificação humana (UI e comportamento real contra o Google) e o fato de a migração ainda não ter sido aplicada em produção (plano 10-12, portão com aprovação da Duda). Até esse portão, os leads reais de produção ainda guardam o conteúdo antigo do Google; o dev está limpo e idempotente.

---

_Verificado: 2026-10-12_
_Verificador: Claude (gsd-verifier)_
