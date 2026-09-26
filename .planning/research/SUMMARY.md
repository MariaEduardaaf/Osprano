# Project Research Summary

**Project:** Osprano
**Domain:** SaaS de prospecção B2B automatizada para venda de sites a negócios europeus sem site (mercado multi-país, opt-out/opt-in por lei local)
**Researched:** 2026-09-26
**Confidence:** MEDIUM-HIGH

## Executive Summary

O milestone v1.3 pede o maior salto arquitetural do produto até aqui: transformar um fluxo hoje 100% disparado por clique humano (descobrir, revisar, escrever, enviar) num pipeline que roda sozinho depois da seleção do lead, decide o canal certo por país e, nos mercados opt-out, envia sem aprovação. A base técnica para isso já existe quase inteira no que o Convex oferece nativamente (`scheduler.runAfter`, `cronJobs`, `crypto.subtle`) e no que o próprio código já provou funcionar (o padrão reserva-antes-do-custo-externo de `reserveUsage`, os gates de compliance de `outreach.send`, a heurística `isEmailable`). Nenhuma dependência npm nova é necessária; o único serviço externo novo recomendado é o Serper.dev, para resolver o buraco real da descoberta (OpenStreetMap quase nunca preenche o campo de site, e nada hoje confere isso ativamente na web).

O risco principal não é técnico, é de decisão de produto e de conformidade legal, e a pesquisa encontrou um achado que muda a viabilidade do pedido tal como descrito: a política de uso aceitável do Resend, provedor de email atual do Osprano, proíbe explicitamente "cold outreach" e "dados de contato obtidos por scraping", com suspensão de conta sem aviso prévio e sem reembolso como consequência documentada. Automatizar e aumentar volume de envio é exatamente o gatilho que torna esse risco concreto em vez de teórico (hoje o uso é manual e baixo, o que provavelmente manteve a conta fora do radar). Isso precisa virar uma decisão explícita da Duda antes de qualquer linha de código do envio automático, não um detalhe de implementação. Encontrado também: o próprio schema já classifica a Noruega como `coldEmail: "conditional"` (diferente dos outros 4 mercados opt-out), mas o milestone descrito por ela trata os 5 como equivalentes, o que é uma inconsistência a resolver antes do pipeline decidir canal automaticamente.

A recomendação central é sequenciar o trabalho por risco crescente, não por valor percebido: primeiro a fundação (schema + extração da lógica de envio para um único módulo compartilhado, sem mudança de comportamento visível), depois a verificação de site e a fila de ligação (baixo risco, alto valor, reaproveitam peças já auditadas), depois o pipeline em "modo rascunho" sem envio de verdade, e só por último o envio automático e o follow-up automático, que são as duas peças irreversíveis por natureza (email já saiu) e mais expostas a risco legal e de reputação de domínio.

## Key Findings

### Recommended Stack

Quase tudo que a v1.3 precisa dá para fazer com o que já está instalado: `ctx.scheduler.runAfter` para encadear os passos do pipeline, `cronJobs()` para as varreduras periódicas (teto diário, follow-up vencido), `crypto.subtle` para verificar a assinatura dos futuros webhooks do Resend (mesmo padrão HMAC manual já usado para o Stripe), e um contador novo no schema (igual a `leadsUsed`) para o teto diário de envio. O único serviço externo novo é uma decisão de produto, não uma escolha técnica difícil.

**Core technologies:**
- `ctx.scheduler.runAfter` (nativo Convex) - orquestração do pipeline pós-seleção (verificar site, gerar preview, escrever mensagem, decidir canal, enviar/enfileirar) - já é o padrão usado hoje para o scoring, zero infra nova
- `cronJobs()` (nativo Convex) - reset do teto diário de envio e varredura de follow-ups vencidos - verifica o estado real do lead no momento da execução, em vez de pré-agendar um `runAfter` de longo prazo sem forma fácil de cancelar
- `crypto.subtle` (Web Crypto nativo) - verificação da assinatura Svix dos webhooks novos do Resend - evita instalar o pacote `svix`, reaproveitando o mesmo esquema já usado em `verifyStripeSignature`
- **Serper.dev** (novo serviço externo, precisa aprovação) - verificação de "tem site de verdade?" e descoberta de Instagram/Facebook numa única chamada por lead, pré-pago (~2.500 buscas grátis, depois US$0,30-1,00/1.000 buscas); mais barato que Brave Search (perdeu tier grátis, exige cartão) e SerpApi (assinatura mensal, ordem de grandeza mais cara); Google Custom Search está sendo descontinuada (fechada para clientes novos, desligamento jan/2027), não é opção viável

Explicitamente descartado: `@convex-dev/workpool`/`rate-limiter`/`action-retrier` (pacotes ainda pré-1.0, exigem bump de versão do Convex, resolvem um problema de escala - milhares de jobs concorrentes - que este produto não tem, um usuário por org processando dezenas/centenas de leads por dia).

### Expected Features

**Must have (table stakes, o que qualquer concorrente de nicho como LeadSweep/GetSiteFinder já entrega):**
- Verificação de "tem site?" além do campo bruto da fonte de descoberta (é literalmente o produto principal dos concorrentes diretos)
- Escolha de canal determinada por regra, não deixada para decisão manual a cada lead
- Envio automático respeitando um teto diário (toda ferramenta séria de cold email tem isso, sob risco de queimar reputação de domínio em dias)
- Sequência de follow-up que para sozinha ao detectar resposta, bounce ou unsubscribe (regra número um da categoria, citada por todas as fontes pesquisadas)
- Fila de tarefas de ligação com resultado categorizado que decide o próximo passo (padrão universal de "call task queue")
- Rodapé de opt-out em toda automação nova, sem exceção (já é regra do produto, só precisa herdar para os novos caminhos)

**Should have (differentiators reais do Osprano, não do setor genérico):**
- Roteamento de canal por regra jurídica do país (nenhuma ferramenta genérica como Lemlist/Apollo sabe que Espanha exige opt-in e a Irlanda não; o dado já existe no produto, falta só automatizar em cima)
- Fila "Ligação pendente" cujo resultado destrava consentimento de email (cruzamento específico do modelo opt-in europeu, raro no mercado)
- Descoberta de redes sociais com link pronto para copiar, sem scraping e sem envio automático (raro no nicho; a maioria das ferramentas de social outreach viola o ToS da Meta para automatizar o envio)
- Pipeline 100% automático depois da seleção do lead, sem passo manual intermediário (raro mesmo no nicho; concorrentes exigem montar campanha passo a passo)

**Defer (permanente, não é v2, é decisão de produto já tomada):**
- Rede de múltiplas caixas de email com warmup gradual (resolve um problema de volume que este produto não tem)
- Automação de envio em LinkedIn/Instagram/Facebook (ToS da Meta proíbe; decisão da Duda já registrada no PROJECT.md)
- Discador automático ou voz sintética (contradiz o motivo de existir da fila de ligação: a lei quer contato humano)
- Caixa de entrada unificada multi-provedor (webhook de bounce/reply resolve o status sem precisar replicar um inbox inteiro)
- IA respondendo ou negociando automaticamente após a primeira resposta (é o momento que mais importa para ela assumir manualmente)

### Architecture Approach

Este é o primeiro processamento assíncrono multi-etapa de verdade no codebase: hoje só existe um único `runAfter` de disparo único (o scoring pós-descoberta). A integração recomendada introduz três padrões novos que precisam ser levados a sério desde o início: máquina de estado com transição atômica (uma mutation "reivindica" cada passo antes de qualquer ação com efeito no mundo real, garantindo que o mesmo lead nunca seja processado duas vezes em paralelo), reserva-antes-do-custo-externo (o mesmo idioma já usado para a cota de leads, aplicado agora ao teto diário de envio), e `orgId` explícito em toda linha nova (crons e schedulers não têm `ctx.auth`, então nunca podem depender de reautenticação).

**Major components:**
1. `convex/pipeline.ts` + `convex/model/pipeline.ts` - orquestração e máquina de estado do pipeline por lead (verificar site → preview → mensagem → canal → enviar/enfileirar)
2. `convex/verification.ts` - ação que confere presença web real e descobre redes sociais, alimentando o gate de "virar prospect"
3. `convex/model/outreachSend.ts` - função única de envio de email compartilhada entre o botão manual e o pipeline automático, concentrando todos os gates de compliance num só lugar (extraída do `outreach.send` atual)
4. `convex/model/sendCap.ts` - teto diário de envio automático por org, espelhando `reserveUsage`/`refundUsage`
5. `convex/followups.ts` + `convex/crons.ts` - varredura periódica que recheca todos os gates de compliance do zero antes de cada follow-up, nunca confiando num campo cacheado

### Critical Pitfalls

1. **Resend proíbe cold outreach na própria política de uso aceitável** - decisão de fornecedor bloqueante, precisa ser resolvida antes de qualquer linha de código do envio automático (ver Decisões da Duda, item 1)
2. **Envio automático descarta silenciosamente o sistema de `warnings` de alucinação que já existe no código** (`no-verified-signal`/`locality-claim`) - o pipeline precisa de uma regra explícita: qualquer warning bloqueia o envio automático e cai em fila de revisão, nunca é ignorado
3. **Follow-up automático sem webhook de bounce/reply reenvia para quem já respondeu, foi suprimido ou tem endereço morto** - o webhook mínimo de bounce do Resend deixa de ser "nice to have da Fase 2" e vira pré-requisito técnico direto desta feature
4. **Falta de trava atômica antes do envio permite double-send em corrida de concorrência** - o botão manual é protegido pelo fato de um humano só clicar uma vez; o pipeline automático precisa da mesma garantia no backend, via mutation que "reivindica" o envio antes do `fetch` ao Resend
5. **Noruega tratada como opt-out igual a GB/NL/IE/SE, mas o próprio schema já a marca `coldEmail: "conditional"` sem `legalReview`** - inconsistência estrutural que precisa de decisão explícita antes do pipeline decidir canal automaticamente (ver Decisões da Duda, item 4)

## Decisões da Duda

Cinco decisões que a pesquisa não pode tomar sozinha, cada uma com opções e recomendação. Nenhuma é bloqueante para começar a Fase 9 (fundação), mas as quatro primeiras bloqueiam fases específicas mais adiante.

### 1. Provedor de envio para o email frio automatizado (Resend proíbe cold outreach na própria AUP)

O texto oficial (`resend.com/legal/acceptable-use`, lido em 2026-09-26) diz: *"You are prohibited from sending unsolicited messages of any kind, including cold outreach, purchased lists, or scraped contact data"*, com suspensão de conta sem aviso e sem reembolso como consequência. O uso manual e de baixo volume de hoje provavelmente ficou fora do radar deles; automatizar aumenta volume e previsibilidade de padrão exatamente no jeito que dispara detecção.

- **Opção A - manter Resend, aceitando o risco documentado.** Zero mudança de infraestrutura, mas a conta pode ser suspensa sem aviso a qualquer momento depois que o volume automático começar. Isolar o domínio de outreach automático do domínio principal do produto limita o dano de uma suspensão a um único subdomínio, mas não elimina o risco.
- **Opção B - contatar o Resend por escrito perguntando se o caso de uso (B2B com base legal opt-out, footer de opt-out por código, supressão automática) é aceitável mediante aprovação prévia.** O texto lido não menciona nenhum processo de exceção; pode não haver resposta ou a resposta pode ser não.
- **Opção C - migrar o envio automatizado para um provedor que aceite explicitamente cold outreach B2B com infraestrutura de reputação própria** (a pesquisa cita Mailgun/SES com IP dedicado e monitoramento de reputação, ou ferramentas desenhadas para cold email como Instantly/Smartlead, que já fazem rotação de domínio e warmup). Isso é o que a pesquisa de PITFALLS.md efetivamente recomenda.
- **Gap explícito (não inventado, não coberto pela pesquisa):** enviar pela própria caixa dela (Google Workspace/Gmail API) em baixo volume, sem passar por um ESP transacional, não foi pesquisado em nenhum dos 4 arquivos. É uma alternativa plausível para o volume desta operação (poucas dezenas de emails automáticos por dia), mas tem implicações próprias (limites de envio do Gmail, configuração de OAuth para a Convex action chamar a API, risco de a própria conta pessoal ser sinalizada) que precisam de uma pesquisa dedicada antes de virar plano, não uma suposição.
- **Recomendação:** não decidir isso lendo só esta pesquisa. Antes da Fase 13 (envio automático), rodar uma pesquisa focada comparando Opção C (provedor cold-email-friendly) contra o gap do Gmail/Workspace, com números reais de volume esperado (quantos leads por dia ela seleciona hoje). Enquanto isso, é seguro seguir com as Fases 9-12 (fundação, verificação, fila de ligação, pipeline em modo rascunho), porque nenhuma delas envia email de verdade.

### 2. Serper.dev como novo serviço de busca (verificação de site + descoberta de redes sociais)

- **Opção A (recomendada pela pesquisa) - aprovar Serper.dev.** Cobre as duas necessidades (site real + Instagram/Facebook) numa única chamada por lead, pré-pago, custo estimado de centavos a poucos dólares por mês na escala atual, sem SDK (mesmo estilo de `fetch` cru já usado no resto do projeto).
- **Opção B - usar a própria cota do Google Places (Text Search por nome+cidade).** Zero dependência nova, mas compete pela MESMA cota de 30 buscas/dia que a descoberta de leads já usa; só viável se o volume diário verificado for pequeno.
- **Opção C - Brave Search API.** Mais caro e com mais fricção (exige cartão cadastrado e atribuição visível da marca desde fev/2026); só faz sentido se ela topar essa exigência.
- **Recomendação:** aprovar Serper.dev (Opção A) como serviço padrão, com a Opção B (cota do Places) como fallback só se o volume diário de leads selecionados manualmente por ela for pequeno o suficiente para não competir com a descoberta.

### 3. Detecção de resposta/bounce (destrava follow-up automático seguro)

- **Opção A (recomendada, esforço baixo) - webhooks de entrega do Resend** (`email.bounced`, `email.complained`, `email.opened`), que não exigem mudança de DNS, só uma URL nova em `convex/http.ts` e o secret cadastrado no dashboard. Permite suprimir automaticamente quem reclamou e não mandar follow-up para quem deu bounce. Ganho imediato.
- **Opção B (esforço maior, decisão de infra) - Resend Inbound**, recebendo a resposta de verdade do prospect via subdomínio de recebimento com registros MX (mudança de DNS num domínio que é dela) e um `Reply-To` distinto por outreach. É o único jeito de saber com certeza que o lead respondeu e cancelar o follow-up automaticamente sem depender dela clicar em "Respondeu".
- **Opção C - manter "respondeu" manual e limitar a automação a um único follow-up** (nunca uma cadência longa), aceitando o risco residual de reenviar para quem já respondeu mas ela ainda não marcou. Reduz o dano, não elimina.
- **Recomendação:** implementar a Opção A de qualquer forma antes da Fase 14 (barata, sem infra nova, e o webhook de bounce é tratado pela pesquisa de pitfalls como pré-requisito técnico, não opcional). Decidir a Opção B com ela separadamente, porque envolve DNS de domínio próprio; se ela não topar a Opção B agora, cair na Opção C como mitigação parcial documentada, não como equivalente.

### 4. Tratamento da Noruega (NO)

- **Opção A (recomendada) - tratar NO como os outros mercados opt-in até validação jurídica**: adicionar `legalReview: "pending"` a NO no código (hoje só os 6 opt-in têm esse campo) para a UI mostrar o aviso de "mercado em validação jurídica" também lá, e excluir NO do envio 100% automático sem aprovação até a validação.
- **Opção B - manter NO no grupo opt-out atual sem mudança**, tratando como GB/NL/IE/SE. Não recomendado: o próprio schema já diferencia NO (`coldEmail: "conditional"`) dos outros 4 (`"opt_out"`), e as fontes jurídicas pesquisadas sobre a Noruega se contradizem entre si, o que é sinal de zona cinzenta, não de mercado limpo.
- **Opção C - decisão explícita e documentada de manter NO como opt-out mesmo assim**, com justificativa registrada (ex.: aceitar o risco por baixo volume esperado nesse mercado específico). Só razoável se ela entender e assumir o risco conscientemente, não por omissão.
- **Recomendação:** Opção A. É a mudança de menor esforço (um campo no código) e a que mais se alinha com o próprio sinal que o schema já dá.

### 5. Onde a fila "Ligação pendente" mora na UI

- **Opção A - tela dedicada nova** (`src/app/(app)/crm/calls/page.tsx`), separada do Kanban.
- **Opção B - aba ou filtro dentro do Kanban existente** (`src/app/(app)/crm/page.tsx`).
- **Recomendação:** decisão de produto/UX que não muda o back-end proposto (`leads.recordCallOutcome`, `leads.pendingCalls`, `decideChannel` são os mesmos nos dois casos). Não bloqueia o início da Fase 11; pode ser decidida durante o planejamento detalhado dessa fase, olhando o volume real de leads em fila esperado no dia a dia dela.

## Implications for Roadmap

Baseado na pesquisa combinada, a ordem sugerida segue risco crescente (não valor percebido): fundação sem risco visível primeiro, depois as duas features de baixo risco e alto valor (verificação de site, fila de ligação), depois o pipeline em modo seguro ("rascunho"), e só por último as duas peças irreversíveis (envio automático, follow-up automático). O milestone anterior (v1.2) terminou na Fase 8; a numeração abaixo continua a partir da Fase 9.

### Fase 9: Fundação de compliance compartilhada
**Rationale:** pré-requisito de tudo que vem depois e o item de menor risco (puro refactor + schema aditivo, sem mudança de comportamento visível); evita repetir o erro que a auditoria de 2026-07-11 já corrigiu uma vez (gates de compliance duplicados divergindo com o tempo).
**Delivers:** schema novo (`pipelineRuns`, `dailySendCounters`, campos novos em `leads`/`outreach`, novo literal de evento `call_outcome`); `convex/model/outreachSend.ts` com `sendEmailForLead` extraída do `outreach.send` atual e compartilhada entre o botão manual e o futuro pipeline, mantendo a suíte de testes existente passando.
**Addresses:** nenhuma feature nova ainda; é a base de Roteamento de Canal e Envio Automático.
**Avoids:** reimplementar gates de compliance dentro do pipeline em vez de reaproveitar (Anti-Pattern 2 do ARCHITECTURE.md).

### Fase 10: Verificação de presença web + descoberta de redes sociais
**Rationale:** resolve a queixa número um dela ("os clientes que ele mostra já têm site") e é dependência dura do pipeline (evita gerar preview/mensagem para quem já tem site); pode ser construída e testada isolada, chamando manualmente por um lead de teste, antes de existir qualquer pipeline.
**Delivers:** `convex/verification.ts` (`checkWebPresence`), chamada no momento da seleção manual do lead (não na descoberta em massa, para não competir com a cota de 30 buscas/dia do Places); grava `siteCheckStatus`/`siteCheckedAt`/`siteCheckSource` e instagram/facebook no lead.
**Addresses:** feature P1 "Verificação de tem site" e P1 "Descoberta de redes sociais" do FEATURES.md.
**Avoids:** Pitfall de SSRF/falso positivo-negativo/scraping direto de HTML de busca (usar API licenciada, reaplicar `classifyWebsite`/`NOT_A_SITE_SUFFIXES`, validar host antes de fetch, tratar timeout como "não verificado"); Pitfall de scraping de Instagram/Facebook (preferir tags do OSM, nunca scraping de perfil).
**Depende de:** Decisão da Duda item 2 (Serper.dev).

### Fase 11: Fila "Ligação pendente" com resultado
**Rationale:** baixo risco e praticamente independente das Fases 10/12 (só precisa de `decideChannel` e dos campos de schema da Fase 9); reaproveita duas peças já auditadas (`markLost`, `recordContactOptIn`), então entra cedo na ordem mesmo sendo tecnicamente paralelizável com as fases seguintes.
**Delivers:** `decideChannel` puro em `convex/lib/domain.ts`; `leads.recordCallOutcome` e `leads.pendingCalls`; UI da fila (local definido pela Decisão da Duda item 5).
**Addresses:** feature P1 "Fila de ligação pendente com resultado categorizado" do FEATURES.md.
**Avoids:** consentimento de ligação registrado sem evidência robusta (reforçar o registro com contexto factual no momento do clique, não só o clique isolado).

### Fase 12: Pipeline automático pós-seleção em modo rascunho (sem auto-envio)
**Rationale:** separa o risco "o pipeline funciona e não trava" do risco "está mandando email sozinho"; permite validar verificação de site + geração de IA em produção antes de destravar o envio automático, que é irreversível por natureza (email já saiu).
**Delivers:** `convex/pipeline.ts` + `convex/model/pipeline.ts` + `convex/crons.ts` (sweep de execuções travadas); o passo final gera rascunho de email/script/DM mas não chama `sendEmailForLead` de verdade.
**Uses:** `ctx.scheduler.runAfter` + `cronJobs()` nativos do Convex (sem pacote novo); `ANTHROPIC_API_KEY` em produção é pré-requisito operacional bloqueante já citado no PROJECT.md (hoje ausente).
**Avoids:** `warnings` de alucinação da IA descartados sem revisão (regra explícita: qualquer warning bloqueia o envio automático e cai em fila de revisão manual); falta de aviso GDPR Art. 14 sobre origem do dado no prompt; scheduler sem teto de tentativas/custo de IA (número máximo de retries com backoff, teto diário de chamadas de IA por org).

### Fase 13: Envio automático imediato (mercados opt-out) + teto diário
**Rationale:** o item de maior risco do milestone inteiro (o email sai da caixa dela e chega ao prospect sem revisão humana); por isso só entra depois de tudo acima estar validado. Depende da Fase 9 (função de envio compartilhada) e da Fase 12 (pipeline já provado estável em modo rascunho).
**Delivers:** `convex/model/sendCap.ts` (teto diário por org, mesmo idioma de `reserveUsage`/`refundUsage`); ligação do último passo do pipeline ao `sendEmailForLead` de verdade; trava atômica de "claim" numa mutation antes do `fetch` ao Resend.
**Addresses:** feature P1 "Envio automático imediato nos mercados opt-out" do FEATURES.md.
**Avoids:** double-send por falta de trava atômica; heurística de forma jurídica (`isEmailable`) sem humano no loop (rodar auditoria retroativa de amostra antes de ligar 100% automação); domínio novo sem SPF/DKIM/DMARC/warmup (configurar e verificar antes de abrir a torneira).
**Depende de:** Decisão da Duda item 1 (provedor de envio, bloqueante) e item 4 (tratamento de NO).

### Fase 14: Follow-up automático por email
**Rationale:** só faz sentido depois que existe um envio automático original para dar sequência (Fase 13); é a peça que dispara envios repetidos sem novo clique dela, por isso é a última a entrar em produção.
**Delivers:** novos campos de follow-up em `outreach` (`followupStep`, `nextFollowupAt`, `followupStoppedAt`, `followupStoppedReason`), índice `by_followup_due`; `convex/followups.ts` (`dispatchDue`) rechecando TODOS os gates de compliance do zero a cada envio, nunca confiando num campo cacheado.
**Addresses:** feature P2 "Follow-up automático por email onde permitido" do FEATURES.md (pode virar P1 dependendo da decisão de escopo do item 3).
**Avoids:** reenvio para quem já respondeu, foi suprimido ou deu bounce.
**Depende de:** Decisão da Duda item 3 (detecção de resposta/bounce, bloqueante).

### Phase Ordering Rationale

- A ordem segue risco crescente, não valor percebido: as duas fases mais visíveis para ela (envio automático e follow-up) são deliberadamente as últimas, porque são as únicas irreversíveis por natureza (um email automático já enviado não pode ser desfeito).
- A Fase 9 precisa vir antes de qualquer coisa porque a extração de `sendEmailForLead` é o que impede a duplicação de gates de compliance entre o botão manual e o pipeline automático, o mesmo erro que a auditoria de 2026-07-11 já corrigiu uma vez.
- A Fase 11 (fila de ligação) é posicionada cedo apesar de "ser sobre ligação, não sobre email automático" porque tem risco muito mais baixo que as Fases 10/12/13/14 e reaproveita peças já auditadas; se o tempo apertar, pode ser adiada sem bloquear as fases de envio automático, já que `decideChannel` (sua única dependência real) é uma função pura de baixo custo.
- As Fases 13 e 14 têm dependências duras de decisão de produto (provedor de envio e detecção de bounce, respectivamente) que não são resolvidas só com código; a ordem assume que essas decisões acontecem ANTES do planejamento detalhado de cada fase, não durante a execução.

### Research Flags

Fases que provavelmente precisam de `/gsd:research-phase` durante o planejamento:
- **Fase 10:** decisão do mecanismo de verificação (Serper vs cota do Places) tem implicações de custo/volume que merecem números reais antes de implementar; superfície de SSRF é nova no codebase.
- **Fase 13:** é onde a decisão de provedor de envio (gap não coberto por esta pesquisa) precisa ser fechada, além da auditoria retroativa da heurística `isEmailable` e da configuração de SPF/DKIM/DMARC; alto acoplamento com decisão jurídica de NO.
- **Fase 14:** depende diretamente da decisão de escopo do webhook de bounce/inbound (DNS é decisão de infraestrutura, não só código); vale revalidar o padrão de verificação Svix (formato de header difere do Stripe) antes de implementar.

Fases com padrões bem estabelecidos (pode pular pesquisa dedicada):
- **Fase 9:** puro refactor sobre código já lido e mapeado; padrão de extração já documentado linha a linha no ARCHITECTURE.md.
- **Fase 11:** reaproveita `markLost`/`recordContactOptIn` já existentes e auditados; baixa complexidade nova.
- **Fase 12:** orquestração usa só primitivas nativas do Convex (`scheduler`, `cronJobs`), já documentadas com exemplo de código no ARCHITECTURE.md e STACK.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH para primitivas Convex e status das APIs de busca (verificado em docs oficiais e no próprio código); MEDIUM para preço exato de Serper/Brave (fontes de terceiros convergentes, não a página oficial de pricing) |
| Features | MEDIUM (cross-referenciado em múltiplas ferramentas de mercado - Instantly, Smartlead, Lemlist, Apollo, Woodpecker, Hunter, mais concorrentes de nicho - mas nenhuma tem documentação técnica oficial acessível, só help center e páginas de produto) |
| Architecture | HIGH para pontos de integração e padrões Convex (lidos direto do código do próprio repo); MEDIUM para o mecanismo de verificação de site na web, que depende de uma decisão de produto ainda em aberto |
| Pitfalls | MEDIUM-HIGH: achados de arquitetura (o que o código hoje faz/não faz) são HIGH, lidos direto do repositório; achados jurídicos por país são MEDIUM (fontes secundárias agregadas via busca, cruzadas contra pelo menos duas fontes quando possível), exceto onde marcado HIGH (Resend AUP, ICO UK, Google Maps ToS, Meta ToS, todos lidos direto da fonte oficial) |

**Overall confidence:** MEDIUM-HIGH. A parte de engenharia (o que construir e em que ordem) tem confiança alta porque foi lida direto do código existente. A parte de decisão de produto/legal (qual provedor de envio, como tratar Noruega, quão robusto precisa ser o consentimento de ligação em cada país) tem gaps reais que exigem decisão humana e, para os mercados de maior exposição (Alemanha, Espanha, Noruega), validação por advogado local antes de escalar volume, não apenas mais pesquisa.

### Gaps to Address

- **Provedor de envio compatível com cold outreach automatizado em baixo volume via caixa própria (Gmail/Google Workspace):** não pesquisado em nenhum dos 4 arquivos; precisa de pesquisa dedicada antes da Fase 13, comparando contra a alternativa de um ESP cold-email-friendly (Mailgun/SES com IP dedicado, ou Instantly/Smartlead).
- **Validação jurídica formal para Alemanha, Espanha e Noruega:** a pesquisa aponta zonas cinzentas específicas (presumed consent alemão exige indício concreto de interesse, não "mero palpite de setor"; Noruega tem fontes que se contradizem sobre permissividade B2B) que só um advogado local pode fechar; `legalReview: "pending"` deve continuar visível na UI para esses mercados até essa validação acontecer.
- **Auditoria retroativa da heurística `isEmailable`/`inferContactType`:** antes de ligar envio automático 100% sem revisão humana, medir a taxa real de falso positivo numa amostra de leads já classificados como `emailable: true`, porque o envio automático remove a última camada de defesa contra esse tipo de erro (hoje é ela olhando o composer antes de enviar).
- **Teto de custo de chamadas à Anthropic em lote:** não existe hoje nenhum limitador de gasto por org para chamadas de IA (só `leadsUsed`/`sitesUsed`); vale decidir um teto suave (tamanho de lote por tick do cron) durante o planejamento da Fase 12, não depois de uma fatura inesperada.
- **Onde a fila "Ligação pendente" mora na UI:** decisão de produto que não bloqueia o back-end, mas precisa ser resolvida durante o planejamento da Fase 11 (ver Decisões da Duda, item 5).

## Sources

### Primary (HIGH confidence)
- Resend, Acceptable Use Policy (`resend.com/legal/acceptable-use`) - lido diretamente em 2026-09-26, proibição explícita de cold outreach
- Resend, documentação de webhooks e verificação Svix (`resend.com/docs/webhooks/introduction`, `resend.com/docs/webhooks/verify-webhooks-requests`, `docs.svix.com/receiving/verifying-payloads/how-manual`)
- Resend, Inbound e agendamento de email (`resend.com/features/inbound`, `resend.com/docs/dashboard/receiving/introduction`, `resend.com/docs/dashboard/emails/schedule-email`)
- ICO (UK), "Business-to-business marketing" e "Key concepts and definitions"
- Google Cloud, "Google Maps Platform Service Specific Terms" (`cloud.google.com/maps-platform/terms/maps-service-terms`) - regra de cache de 30 dias / place_id indefinido
- Meta, "Automated Data Collection Terms" (`facebook.com/legal/automated_data_collection_terms`)
- Google Developers, "Custom Search JSON API" - confirmação de descontinuação (fechada para clientes novos, desligamento jan/2027)
- Convex, documentação oficial de `workpool`/`retrier` (`convex.dev/components/workpool`, `convex.dev/components/retrier`) e versões/peer dependencies via `npm view`
- Código do próprio repositório Osprano (`convex/places.ts`, `convex/osm.ts`, `convex/outreach.ts`, `convex/lib/domain.ts`, `convex/lib/outreachAi.ts`, `convex/lib/stripe.ts`, `convex/model/workspace.ts`, `convex/model/tenant.ts`, `convex/schema.ts`, `convex/http.ts`, `convex/previews.ts`, `convex/leads.ts`), `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`

### Secondary (MEDIUM confidence)
- Serper.dev (coldiq.com, apiserpent.com, serp.fast) - pré-pago, ~2.500 buscas grátis, US$0,30-1,00/1.000 depois
- Brave Search API (implicator.ai, costbench.com, agentdeals.dev) - perdeu tier grátis sem cartão em fev/2026
- SerpApi (trustradius.com, costbench.com) - planos de assinatura US$25-2.750/mês
- Instantly, Smartlead, Lemlist, Apollo, Woodpecker, Salesforge (help centers e blogs de produto) - práticas de teto diário, warmup, condições de parada de sequência, disposição de chamada
- LeadSweep, GetSiteFinder, BirdSift, Hunter.io - análise de concorrentes de nicho "vende site pra quem não tem"
- DLA Piper Data Protection Laws of the World - "Electronic marketing in Norway" (em conflito parcial com outras fontes, sinalizado como zona cinzenta)
- Telemarketing International / Matelso - §7 UWG e "mutmaßliche Einwilligung" (presumed consent) para ligação B2B na Alemanha
- Legiscope - GDPR Art. 14 (dado obtido de terceiro), citando casos da CNIL
- Telecinco / Clearrows - sanções AEPD (Espanha) sob LSSI/RGPD para email comercial não solicitado
- Security Boulevard - requisitos de autenticação de email do Google/Yahoo atualizados para 2025

### Tertiary (LOW confidence)
- Guias de warmup/deliverability de ferramentas de outreach (topo.io, skylead.io, instantly.ai, mailreach.co) - números de "dias de warmup"/"limite diário" variam entre fontes, prática de mercado consolidada mas não norma oficial
- IntuitionLabs / Sparrow Genie / Influencers Time - risco de alucinação de IA em outreach de vendas (conteúdo de marketing, mas consistente com o comportamento já mitigado no próprio `outreachAi.ts`)

---
*Research completed: 2026-09-26*
*Ready for roadmap: yes, condicionado às 5 Decisões da Duda listadas acima (nenhuma bloqueia o início da Fase 9)*
