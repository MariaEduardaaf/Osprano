# Feature Research

**Domain:** Automação de prospecção fria (cold outreach) para venda de sites a negócios locais europeus
**Researched:** 2026-09-26
**Confidence:** MEDIUM (práticas cross-referenciadas em múltiplas ferramentas: Instantly, Smartlead, Lemlist, Apollo, Woodpecker, Hunter e ferramentas de nicho "achar negócio sem site"; nenhuma tem doc técnica em Context7, então tudo vem de help center oficial + páginas de produto, sem acesso a código-fonte)

## Feature Landscape

### Table Stakes (o que se espera)

Funcionalidades que qualquer ferramenta de prospecção fria (genérica ou de nicho "vender site pra quem não tem") já entrega. Faltar alguma faz o produto parecer quebrado ou amador diante da concorrência direta (LeadSweep, GetSiteFinder, BirdSift já fazem tudo isso).

| Feature | Por que é esperado | Complexidade | Notas |
|---------|---------------------|--------------|-------|
| Verificação de "tem site?" além do campo bruto da fonte de descoberta | GetSiteFinder anuncia "todo lead verificado com DNS, SSL e uptime ao vivo, sem chute"; LeadSweep "confere em tempo real se existe um site de verdade". Isso é literalmente o produto principal desses concorrentes de nicho, não um extra. | HIGH | Google Places já tem campo `website` (confiável na maioria dos casos); o buraco é OpenStreetMap, que quase nunca preenche esse campo, e falsos negativos do Places (negócio fechou o site, mudou de nome). Ver seção de dependências. |
| Escolha de canal determinada por regra, não deixada pro usuário decidir a cada lead | Toda ferramenta de sequência multicanal (Lemlist, Smartlead, Apollo) automatiza a decisão "por onde eu falo com esse lead" via condição; nenhuma delas deixa 100% manual. | LOW | Osprano já tem a régua mais forte do mercado pra isso: o país do lead (opt-out = e-mail liberado; opt-in = ligação). Não precisa de lógica comportamental, só formalizar o roteamento (reaproveita `OPTIN-01/02`). |
| Envio automático respeitando um teto diário | Instantly recomenda 30 e-mails de campanha + 10 de warmup por conta/dia; toda ferramenta séria de cold email tem limite diário configurável, senão o domínio de envio queima reputação em dias. | LOW | Não precisa de warmup completo (ver anti-features); um contador diário simples por workspace, separado da quota de billing, resolve. |
| Sequência de follow-up que para sozinha ao detectar resposta, bounce ou unsubscribe | Citado por praticamente toda fonte pesquisada (Woodpecker, Salesforge, Instantly): "a sequência deve parar no instante em que o prospect responde, dá bounce ou se descadastra". É a regra nº 1 de não parecer spam. | MEDIUM-HIGH | Osprano já tem "respondeu" manual (`TRCK-02`) e supressão (`COMP-01/02/03`), mas **não tem bounce automático** (isso está no backlog v2 como `GDPR-02`, ainda não construído). Isso é uma dependência dura para follow-up automático seguro. Ver seção de dependências. |
| Fila de tarefas de ligação com resultado categorizado que decide o próximo passo | Apollo, Salesloft e qualquer dialer de vendas usam disposição de chamada (conectou / não conectou / callback / interessado) pra decidir se o contato avança na sequência ou sai dela. É o padrão da categoria "call task queue". | LOW-MEDIUM | Osprano já tem `nextActionAt`/`nextActionNote` (`CRM-01`) e a aba "Ligação primeiro" com script (`OPTIN-02/03`). Falta só o campo de resultado com as 3 opções que ela descreveu e a ação que cada uma dispara. |
| Rodapé de opt-out e link de descadastro em toda automação de e-mail, sem exceção | Já é regra do produto (`COMP-03`) e prática universal (Woodpecker, Instantly, CAN-SPAM/GDPR); qualquer novo caminho de envio automático (o pipeline pós-seleção, o follow-up) tem que herdar isso, não reimplementar. | LOW | Já existe como injeção server-side no `send`; só precisa garantir que o novo caminho automático passe pelo mesmo `send`, não um atalho paralelo. |

### Differentiators (vantagem competitiva)

Funcionalidades que não são padrão do setor genérico (Lemlist/Instantly/Apollo são B2B SaaS-to-SaaS, não "vender site pra padaria"), mas que encaixam no Core Value do Osprano ("prospecta e aborda sem risco legal") e no que ela pediu.

| Feature | Valor | Complexidade | Notas |
|---------|-------|--------------|-------|
| Roteamento de canal por regra de conformidade legal do país, não por score de engajamento | Nenhuma ferramenta genérica (Lemlist, Smartlead, Apollo) sabe que Espanha exige opt-in registrado pra e-mail frio e a Irlanda não; é uma decisão jurídica, não comportamental. Isso é o "compliant by design" que já é o Core Value do produto. | LOW (dado que `MARKETS` já existe) | Diferencial de posicionamento mais que de engenharia: o dado já existe, falta só a automação em cima dele. |
| Fila "Ligação pendente" cujo resultado destrava o e-mail (consentimento) | Cadências de call center (Apollo/Salesloft) têm disposição, mas nenhuma amarra a disposição de ligação a um registro formal de consentimento de e-mail que muda o gate de compliance do lead. É um cruzamento específico do modelo opt-in europeu. | MEDIUM | Reaproveita `OPTIN-04` (consentimento com origem/timestamp) e `OPTIN-05` (guardrail server-side); a novidade é o terceiro resultado da ligação ("pediu por e-mail") virar gatilho automático desse registro. |
| Descoberta de redes sociais com link pronto (sem scraping de perfil, sem envio automático) | LeadSweep já "detecta redes sociais" como parte do pacote; combinar isso com o rigor de compliance do Osprano (nunca automatizar o envio no canal social) é raro no nicho, a maioria das ferramentas de social outreach (Expandi, HeyReach) automatiza o envio e viola o ToS da Meta pra isso. | MEDIUM | Ver seção de dependências: exige uma fonte de busca (API de search), não scraping direto de Instagram/Facebook (ToS proíbe e Graph API exige app review + conta business do próprio dono do perfil, inviável pra perfil de terceiro). |
| Pipeline 100% automático depois da seleção do lead (preview + mensagem + canal + envio, sem passo manual intermediário) | Lemlist/Instantly/Apollo exigem montar campanha, escolher template, configurar step por step; aqui o pedido dela é literalmente "eu escolho o lead, o app faz o resto". Isso é raro mesmo no nicho: GetSiteFinder gera o site com IA em ~1 minuto mas não fecha o loop até o envio sozinho. | MEDIUM-HIGH | É a soma de features que já existem (SITE-01 auto-sugestão de template, outreachAi, outreach.send) mais a orquestração entre elas; a complexidade está em encadear, não em construir peça nova. |

### Anti-Features (parecem boas, mas atrapalham)

| Feature | Por que parece atraente | Por que é problemática aqui | Alternativa |
|---------|--------------------------|------------------------------|-------------|
| Rede de múltiplas caixas de e-mail com warmup gradual (padrão Instantly/Smartlead: dezenas de inboxes aquecendo antes de campanha) | "Se as ferramentas grandes fazem, deve ser necessário pra não cair em spam" | Esse padrão existe pra volume de centenas/milhares de e-mails por dia via SMTP de contas pessoais compradas em lote; Osprano envia via Resend (API transacional, um domínio verificado, volume baixo de um usuário solo). Construir infra de warmup multi-caixa é semanas de engenharia pra um problema que não existe nessa escala. | Teto diário simples por workspace (a table stake acima), reputação do domínio único cuidada por SPF/DKIM/DMARC (fora do escopo deste research, mas é o que resolve deliverability aqui). |
| Automação de envio em LinkedIn/Instagram/Facebook via ferramenta não oficial (o jeito que Smartlead faz LinkedIn: integra com Aimfox/HeyReach, ferramentas de terceiro que automatizam o clique) | "Se dá pra automatizar e-mail, por que não automatizar a mensagem social também?" | Meta e LinkedIn proíbem automação de envio no ToS; ferramentas desse tipo vivem sob risco de ban de conta e não têm base legal alguma quando o alvo é um perfil de negócio de terceiro na UE. A própria Duda já decidiu isso ("envio em rede social é manual, Instagram/Facebook proíbem automação"), conforme o `PROJECT.md`. | Só descobrir e mostrar o link + preparar o texto pronto pra copiar; envio continua manual, exatamente como ela pediu. |
| Discador automático (auto-dialer) ou script de voz sintética ligando sozinho | Ferramentas como Smartlead (SmartDialer) e Apollo têm dialer nativo; "automatizar tudo" parece o próximo passo natural depois de automatizar e-mail | Contradiz o motivo de existir da aba "Ligação primeiro": nos mercados opt-in a lei quer contato humano, não robô ligando; além disso o app não tem telefonia embutida hoje (isso seria dependência nova, não mencionada por ela). | Fila de tarefa com telefone + script, ela liga manualmente e marca o resultado, exatamente o fluxo descrito. |
| Caixa de entrada unificada multi-provedor (Lemlist/Smartlead sincronizam vários inboxes e mostram um inbox único dentro da ferramenta) | Parece necessário pra "saber quando alguém respondeu" sem sair do app | Osprano envia por um domínio único via Resend, não por caixas pessoais dela; a resposta do prospect cai no e-mail real dela, fora do app. Replicar um inbox completo dentro do Osprano é alto esforço pra um problema que webhook de inbound do Resend resolve mais barato (fecha o *status*, não precisa mostrar o corpo do e-mail). | Webhook de inbound/bounce do Resend grava só o evento (`replied`/`bounced`), já mapeado como `GDPR-02` no v2 backlog; não precisa de UI de inbox. |
| IA respondendo ou negociando automaticamente com o lead depois da primeira resposta | "Já que a IA escreve o primeiro e-mail, por que não deixar ela continuar a conversa?" | O pedido dela é automatizar o primeiro contato e o follow-up de quem *não* respondeu; quem responde vira conversa humana no CRM (é sinal de compra, ela quer saber e assumir). Automatizar a negociação tira ela do momento que mais importa. | Resposta do lead para o follow-up automático e marca o lead como candidato a ação manual dela (o CRM já tem esse fluxo). |

## Feature Dependencies

```
Verificação de "tem site?" (nova)
    └──requires──> API de busca externa (Google Custom Search está sendo descontinuada;
                    alternativa viável: Brave Search API, já disponível na conta, ou Bing Search API)
    └──enhances──> Pipeline automático pós-seleção (evita gerar preview/mensagem pra quem já tem site)

Pipeline automático pós-seleção (novo)
    └──requires──> ANTHROPIC_API_KEY em produção (hoje ausente; pré-requisito operacional já citado no PROJECT.md)
    └──requires──> SITE-01 (auto-sugestão de template) [existing]
    └──requires──> outreachAi / outreach.send [existing]
    └──requires──> Roteamento de canal por país (novo, mas de baixa complexidade sobre OPTIN-01/02 [existing])

Envio automático imediato (mercados opt-out) (novo)
    └──requires──> isEmailable / canContactByEmail [existing, convex/lib/domain.ts]
    └──requires──> Supressão + rodapé de opt-out [existing, COMP-01/02/03]
    └──requires──> Teto diário de envio (novo, separado da quota de billing)

Fila "Ligação pendente" com resultado (novo)
    └──requires──> nextActionAt / nextActionNote [existing, CRM-01]
    └──requires──> Script de ligação por IA [existing, OPTIN-03]
    └──enhances──> Registro de consentimento (quando resultado = "pediu por e-mail")
                       └──requires──> OPTIN-04 (consentimento com origem/timestamp) [existing]
                       └──requires──> OPTIN-05 (guardrail server-side) [existing]

Descoberta de redes sociais (novo)
    └──requires──> a mesma API de busca externa usada na verificação de site (mesmo custo, dois sinais)
    └──conflicts com──> scraping direto de Instagram/Facebook (ToS proíbe; não fazer)

Follow-up automático por e-mail (novo)
    └──requires──> Envio automático imediato (novo, acima) já funcionando
    └──requires──> Detecção de resposta/bounce
                       └──hoje: "respondeu" manual [existing, TRCK-02], funciona, mas depende dela marcar a tempo
                       └──idealmente: webhook de inbound/bounce do Resend [NÃO EXISTE, é GDPR-02, hoje no backlog v2]
    └──requires──> Supressão (unsubscribe) [existing, COMP-01/02/03]
```

### Dependency Notes

- **Verificação de site requires API de busca externa:** o campo `website` do Google Places já resolve a maioria dos casos, mas ela reclamou especificamente de leads do OpenStreetMap (que quase nunca preenche esse campo) aparecendo como "sem site" quando têm site. Confiar só no campo estruturado das duas fontes não fecha o buraco; precisa de uma consulta ativa (busca pelo nome + cidade do negócio) pra confirmar antes de o lead virar prospect. Google Custom Search JSON API está sendo descontinuada (prazo até janeiro de 2027 pra clientes existentes, não vale começar algo novo nela); Brave Search API é a opção mais alinhada ao que já está disponível na conta de ferramentas do projeto.
- **Pipeline automático requires ANTHROPIC_API_KEY em produção:** já é um bloqueador conhecido e citado no PROJECT.md ("sem ela a mensagem automática não existe"); qualquer fase que dependa de outreach por IA automático (o pipeline pós-seleção inteiro) está travada nisso, não é opcional.
- **Follow-up automático requires detecção de resposta/bounce:** este é o ponto mais delicado do milestone. O pedido dela ("follow-up automático por e-mail onde permitido, quando o lead não responde") pressupõe que o sistema *sabe* quando não houve resposta. Hoje isso só existe por marcação manual dela (`TRCK-02`); não há bounce automático (isso está no backlog v2 como `GDPR-02`, ainda não construído). Duas saídas honestas: (a) puxar um webhook mínimo de bounce/inbound do Resend pra dentro deste milestone como dependência dura do follow-up automático (recomendado, pois mandar follow-up pra endereço que já deu bounce hard queima reputação de domínio), ou (b) aceitar o risco: follow-up automático roda só sobre "não marcado como respondeu" e limitar a 1 envio de follow-up (nunca uma cadência longa), o que reduz o dano de continuar escrevendo pra quem já respondeu ou já teve bounce e ela ainda não marcou. Essa é uma decisão de escopo pra ela tomar, não uma suposição segura de fazer sozinho.
- **Descoberta de redes sociais reutiliza a API de busca externa da verificação de site:** os dois sinais (tem site? / tem Instagram ou Facebook?) podem sair da mesma consulta de busca por nome + cidade do negócio, evitando duplicar custo de API externa.
- **Fila de ligação enhances registro de consentimento:** quando o resultado da ligação for "pediu por e-mail", esse é o gatilho natural pra chamar a mutation de consentimento que já existe (`OPTIN-04`) em vez de criar um caminho novo.

## MVP Definition

### Launch With (v1.3)

O que ela descreveu como o fluxo mínimo pra "o app fazer o resto sozinho".

- [ ] Verificação de "tem site?" via busca externa antes do lead virar prospect: resolve a queixa nº 1 dela ("os clientes que ele mostra já têm website")
- [ ] Roteamento de canal automático por país (reaproveitando `MARKETS`/`OPTIN-01`): sem isso não existe "escolhe o canal certo"
- [ ] Envio automático imediato nos mercados opt-out, com teto diário e todas as travas de compliance já existentes: é o pedido mais direto ("envia sozinho, na hora, sem aprovação dela")
- [ ] Fila "Ligação pendente" com os 3 resultados (vai fechar / não vai / pediu por e-mail): fecha o loop do lado opt-in
- [ ] Descoberta de redes sociais (links): ela pediu explicitamente, e é dependência barata (mesma API da verificação de site)

### Add After Validation (v1.3.x, mesmo milestone se a dependência de bounce for resolvida rápido)

- [ ] Follow-up automático por e-mail nos mercados opt-out, condicionado a decidir a saída da dependência de detecção de resposta/bounce (ver nota acima); se ela topar puxar um webhook mínimo de bounce do Resend, isso entra junto; se não, entra limitado a 1 follow-up e com aviso claro do risco residual

### Future Consideration (v2+, já mapeado no backlog)

- [ ] Webhook completo de inbound/bounce do Resend (`GDPR-02`) generalizando resposta/bounce automático pra todo o funil, não só o follow-up
- [ ] Qualquer automação de envio em canal social: permanece anti-feature enquanto o ToS da Meta não mudar, não é "versão futura", é decisão permanente

## Feature Prioritization Matrix

| Feature | Valor pra ela | Custo de implementação | Prioridade |
|---------|----------------|--------------------------|------------|
| Verificação de "tem site?" | HIGH | HIGH | P1 |
| Roteamento de canal por país | HIGH | LOW | P1 |
| Envio automático imediato (opt-out) + teto diário | HIGH | LOW-MEDIUM | P1 |
| Fila "Ligação pendente" com resultado | HIGH | LOW-MEDIUM | P1 |
| Descoberta de redes sociais | MEDIUM | MEDIUM | P1 |
| Follow-up automático por e-mail | HIGH | MEDIUM-HIGH (por causa da dependência de bounce) | P2 (decisão dela sobre a saída da dependência define se vira P1) |
| Webhook completo inbound/bounce do Resend | MEDIUM (impacto além deste milestone) | MEDIUM | P2/P3 |

**Priority key:**
- P1: essencial pro milestone v1.3
- P2: deveria entrar, mas depende de uma decisão de escopo dela (bounce automático) ou pode escorregar pro fim da fase
- P3: cai fora deste milestone se não houver tempo

## Competitor Feature Analysis

| Feature | LeadSweep / GetSiteFinder / BirdSift (nicho "vende site pra quem não tem") | Instantly / Smartlead / Lemlist / Apollo (cold outreach genérico B2B) | Abordagem do Osprano |
|---------|------------------------------------------------------------------------------|--------------------------------------------------------------------------|------------------------|
| Verificação de site | Núcleo do produto: DNS/SSL/uptime ao vivo por lead | Não se aplica (não vendem pra quem não tem site) | Confirmar via API de busca o que escapa do campo estruturado de Places/OSM, só pra leads sem `website` preenchido (mais barato que checar 100%) |
| Escolha de canal | Não fazem (são só e-mail) | Condição comportamental (abriu e-mail? tem LinkedIn?) | Regra jurídica por país (opt-out/opt-in), determinística, sem IA de decisão |
| Envio automático + teto | Não mencionam teto explícito | Teto diário + warmup multi-caixa (30-40/dia) | Teto diário simples, sem warmup multi-caixa (volume e infra não pedem isso) |
| Fila de ligação com resultado | Não oferecem (são e-mail-first) | Disposição de call center genérica (conectou/não conectou) | Disposição de domínio específico (vai fechar / não vai / pediu e-mail), amarrada ao registro de consentimento |
| Redes sociais | LeadSweep "detecta redes sociais" (não detalha método) | Não é o foco (B2B usa LinkedIn, que estas ferramentas automatizam via terceiros) | Busca (não scraping), retorna só o link, envio permanece manual |
| Stop em resposta/bounce/unsubscribe | Não detalham | Padrão da indústria, com webhook de e-mail (inbound parsing) nativo do provedor deles | Depende do Resend ter um caminho equivalente ligado (`GDPR-02`, hoje não construído) |

## Sources

- [Instantly - Account and Campaign Limits](https://help.instantly.ai/en/articles/6248612-account-and-campaign-limits)
- [Instantly - Warmup Settings](https://help.instantly.ai/en/articles/7988514-warmup-settings)
- [Instantly - Cold Email Strategy](https://help.instantly.ai/en/articles/5975326-instantly-cold-email-strategy)
- [Smartlead feature audit 2026 (Amplemarket)](https://www.amplemarket.com/blog/what-does-smartlead-really-do)
- [Smartlead - Multi-Channel Outreach](https://www.smartlead.ai/blog/multi-channel-outreach)
- [Lemlist - Understand campaign sequencing](http://help.lemlist.com/en/articles/12875247-understand-campaign-sequencing-in-lemlist)
- [Lemlist - How to use conditions in your campaign sequence](https://help.lemlist.com/en/articles/8290177-how-to-use-conditions-in-your-campaign-sequence)
- [Apollo - Use Purposes and Dispositions to Understand Call Outcomes](https://knowledge.apollo.io/hc/en-us/articles/5494331315853-Use-Purposes-and-Dispositions-to-Understand-Call-Outcomes)
- [Apollo - Ideal Cadence for Multi-Channel Outbound (2026)](https://www.apollo.io/insights/whats-the-ideal-cadence-for-a-multi-channel-outbound-sequence)
- [Woodpecker - What happens when a prospect replies to my email?](https://woodpecker.co/help/prospect-reply-email/)
- [Woodpecker - How to lower my bounce rate?](https://docs.woodpecker.co/en/articles/5613086-how-to-lower-my-bounce-rate)
- [Salesforge - When to Stop Follow-Up Emails (2026 Guide)](https://www.salesforge.ai/blog/when-to-stop-follow-up-emails)
- [LeadSweep - Find Businesses Without a Website or With a Broken One](https://www.leadsweep.io/)
- [GetSiteFinder - Find Businesses Without a Website](https://getsitefinder.com/)
- [BirdSift - Local Leads Without a Website](https://www.birdsift.com/)
- [Hunter.io - Company Enrichment API](https://hunter.io/api/company-enrichment)
- [Google Developers - Custom Search JSON API (status de descontinuação)](https://developers.google.com/custom-search/v1/overview)
- [Dialpad - What is Call Disposition?](https://www.dialpad.com/glossary/call-disposition/)
- [LeadAdvisors - Disposition Taxonomy for Outbound](https://leadadvisors.com/blog/disposition-taxonomy-outbound/)
- `.planning/PROJECT.md` e `.planning/REQUIREMENTS.md` do próprio repo (contexto de requisitos existentes e decisões já tomadas)

---
*Feature research for: automação de prospecção fria B2B para venda de sites (Osprano v1.3)*
*Researched: 2026-09-26*
