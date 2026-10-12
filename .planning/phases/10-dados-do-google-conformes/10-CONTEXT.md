# Phase 10: Dados do Google conformes - Context

**Gathered:** 2026-10-12
**Status:** Ready for research and planning
**Source:** decisão da Duda em 2026-10-12 ("Conforme: só o ID") + pesquisa `.planning/research/commercial/LEGAL.md` seção 3 + `COST-PRICING.md`

<domain>
## Phase Boundary

Mudar o modelo de dados dos leads vindos do Google Places para cumprir os termos do Google Maps Platform: persistir só `place_id` (e lat/lng por no máximo 30 dias), buscar o resto sob demanda, deixar o cliente confirmar os dados que viram dele, migrar os leads existentes e mostrar a atribuição. Inclui SCAL-01 (paginação), porque a leitura de leads é reescrita aqui. Requisitos: GPLC-01..05, SCAL-01.

Fora desta fase: planos/cotas novos (Fase 12; aqui só contar o custo na cota que já existe), verificação via Serper (Fase 14), i18n (Fase 15).

</domain>

<decisions>
## Implementation Decisions

### Travado pela Duda
- **Só `place_id` é persistido** para lead vindo do Google. Nome, endereço, telefone, nota/avaliações, site e qualquer outro conteúdo do Google não ficam gravados no Convex (nem em cache de servidor).
- Lat/lng do Google: no máximo 30 dias consecutivos, depois apagado por cron.
- Leads do **OpenStreetMap** continuam com dados persistidos (ODbL permite, com atribuição já existente).
- Dados que o **cliente confirma ou edita** (nome, telefone, e-mail, endereço) passam a ser dado do cliente e podem ser gravados e usados no preview público, na mensagem e no prompt da IA. Conteúdo do Google não confirmado nunca entra no preview público `/p` e `/site`, nem no prompt da IA.
- Toda tela com conteúdo do Google mostra a atribuição do Google Maps; conteúdo do Google nunca aparece junto de um mapa.
- **Vendedora é empresa brasileira** (não espanhola). A pesquisa LEGAL.md assumiu termos EEA por endereço de cobrança na Espanha; a pesquisa desta fase deve conferir se os termos não-EEA (conta de faturamento do Google que não seja da Espanha) mudam algo de prático. A decisão "só place_id" vale nos dois casos.

### Riscos que a pesquisa precisa endereçar
1. **Custo de rebuscar** (GPLC-02): Place Details por lead aberto e, pior, por linha da lista. Pesquisar preço por SKU/campo em 2026 (field masks; o que é grátis, ex.: só ID), e desenhar para caber no plano: ex. lista mostra só dado confirmado/OSM + um nome curto buscado em lote? cache efêmero só no navegador durante a sessão? Text Search da descoberta já devolve nome/endereço para exibição imediata na tela de busca (sem gravar). Recomendar o desenho com números (custo por cliente/mês no uso típico) e ver se cabe nos limites propostos em COST-PRICING.md.
2. **Confirmação "de um clique" pode ser só copiar dado do Google com outro nome.** Se "confirmar" = salvar o que o Google mostrou, isso continua sendo "copy and save business names". A pesquisa precisa propor um fluxo que seja defensável (ex.: cliente digita/edita, ou confirma a partir de outra fonte como o site do negócio/OSM/ligação) e marcar o resíduo como ponto para advogado. Não inventar certeza jurídica.
3. **Digital Presence Score e outros derivados**: hoje o score usa dados do Google (rating, avaliações, site). Score é dado derivado guardado; pesquisar se pode persistir (provável que sim se não reproduz o conteúdo; senão recalcular sob demanda).
4. **Migração dos leads reais** (GPLC-04): ensaio no dev primeiro, backup (`npx convex export`) antes, e a execução em produção é um passo **com aprovação explícita da Duda** (não automático no plano).

### Restrições de execução
- Trabalhar no branch `v1.3-pronto-pra-vender`. Verificação: `node --experimental-strip-types --test tests/*.test.ts`, `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/tsc --noEmit -p convex`, `./node_modules/.bin/eslint`, `./node_modules/.bin/next build`.
- Pode publicar no Convex **de dev** (`npx convex dev --once`) para testar; nunca em produção sem a Duda.
- Nenhuma dependência npm nova sem aprovação. Não mexer em `.env*`, nunca `convex env list`.
- Textos PT-BR sem travessão.

### Claude's Discretion
- Formato do schema (campos separados "confirmados" vs fonte), como marcar origem de cada campo, forma do cache efêmero, paginação (`usePaginatedQuery` do Convex ou `take`).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/commercial/LEGAL.md` seção 3 (termos do Google, tabela de cláusulas, opções A/B/C/D; a Duda escolheu A)
- `.planning/research/commercial/COST-PRICING.md` (preço do Places por SKU, limites propostos por plano)
- `convex/places.ts` (descoberta Google; o que grava hoje), `convex/osm.ts`, `convex/schema.ts` (tabela `leads`), `convex/scoring.ts`, `convex/lib/domain.ts` (score, `classifyWebsite`)
- `convex/previews.ts`, `src/components/preview-site.tsx`, `convex/lib/site.ts` (o que o preview público usa)
- `convex/lib/outreachAi.ts`, `convex/outreach.ts` (o que vai para o prompt da IA)
- `convex/leads.ts` (`list/stats/analytics` com `.collect()`), `src/app/(app)/leads`, `src/app/(app)/crm`
- `convex/model/workspace.ts` (`reserveUsage`, cota existente)
- `docs/LESSONS.md` (pegadinhas do projeto, incl. auth race e Turbopack cache)
- `AGENTS.md` (ler `node_modules/next/dist/docs/` antes de código Next)

</canonical_refs>

<deferred>
## Deferred Ideas

- Pedir autorização por escrito ao Google (opção D) fica com a Duda, em paralelo, fora do código.
- Renovação anual de `place_id` (opcional).

</deferred>

---

*Phase: 10-dados-do-google-conformes*
*Context gathered: 2026-10-12*

## Decisões do orquestrador após a pesquisa (2026-10-12)

Defaults escolhidos para as perguntas abertas de `10-RESEARCH.md` (a Duda pode reverter):
1. **Lat/lng do Google: não gravar.** Nada consome hoje (YAGNI). Sem campo, sem cron de 30 dias. Se um uso aparecer, volta com cron. Isso satisfaz GPLC-01 ("no máximo 30 dias" inclui zero).
2. **Atribuição por texto** "Google Maps" com `translate="no"` (alternativa permitida), sem baixar o zip de logos.
3. **Tetos de consultas ao Google** (`detailsPerMonth`): free 25, pro 300, agency 400 no `PLANS` atual, com reserva antes da chamada e estorno em falha. A Fase 12 recalibra junto com os planos novos.
4. **Sites já publicados com nome vindo do Google: não alterar na migração.** O dry-run lista quantos e quais; a Duda decide no portão de produção.
5. **Histórico já gravado** (rascunhos, mensagens, roteiros, slugs): manter; listar no relatório da migração e marcar como ponto para advogado.
6. **Busca por nome (`searchIndex`) no CRM: fora desta fase** (não é requisito).
7. **stats/analytics:** `take(5000)` com flag `truncated`; nada de `@convex-dev/aggregate` (dependência nova).
8. **País de cobrança da conta GCP:** a Duda confere no Console; não bloqueia o código (a regra "só place_id" vale nos dois conjuntos de termos).
9. Desenho de exibição e fluxo de confirmação: seguir a recomendação da pesquisa (lista/Kanban sem chamadas ao Google; detalhe com 1 Place Details por abertura e cache só em memória JS; confirmação digitada com origem obrigatória, sem "copiar do Google").
10. **Execução em produção da migração é portão humano** (checkpoint `human-action`), nunca automático.
