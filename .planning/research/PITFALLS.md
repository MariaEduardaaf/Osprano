# Pitfalls Research

**Domain:** Automação de prospecção B2B multi-país (envio de email frio automático, fila de ligação, follow-up, IA generativa, descoberta web) sobre um SaaS Next.js 16 + Convex + Clerk + Resend já em produção (Osprano v1.3 "Automação da prospecção")
**Researched:** 2026-09-26
**Confidence:** MEDIUM-HIGH. Achados de arquitetura (o que o código hoje faz/não faz) são HIGH, lidos direto do repositório. Achados jurídicos por país são MEDIUM (fontes secundárias, agregadas por WebSearch, cruzadas contra pelo menos duas fontes quando possível) exceto onde marcado HIGH (fonte oficial buscada diretamente). Nenhuma fonte aqui é jurisprudência primária lida na íntegra: para os países de maior exposição (Alemanha, Noruega, Espanha) recomenda-se validação por advogado local antes do lançamento em escala, exatamente como a Fase 4 (`04-RESEARCH.md`) já sinalizava com o campo `legalReview: "pending"`.

## Critical Pitfalls

### Pitfall 1: Resend proíbe cold outreach na própria Acceptable Use Policy — o produto inteiro roda sobre um provedor que bane o próprio caso de uso

**What goes wrong:**
A política de uso aceitável do Resend (buscada direto em `resend.com/legal/acceptable-use`, 2026-09-26) diz, sem ressalva de B2B ou "legitimate interest": *"You are prohibited from sending unsolicited messages of any kind, including cold outreach, purchased lists, or scraped contact data"* e *"All mail must be sent to recipients who have explicitly opted in to receive communications from you"*. A consequência descrita é suspensão de conta sem aviso prévio quando métricas ou conteúdo violam a política, sem reembolso. Isso significa que o envio automático imediato (a feature central deste milestone) aumenta o volume e a previsibilidade do padrão "cold email" exatamente no provedor que documenta bani-lo — hoje o uso é manual e baixo volume (o próprio `docs/CHECKLIST-MODO-REAL.md` descreve o Resend como opcional, plano grátis de 3.000 emails/mês, nunca configurado em produção ainda), o que pode ter mantido a conta abaixo do radar. Automatizar e aumentar cadência é o gatilho mais provável para acionar a detecção deles.

**Why it happens:**
A maioria dos ESPs "self-serve" (Resend, Postmark, SendGrid no plano padrão) vende para email transacional/produto, não para outreach frio, e trata alta taxa de "primeiro contato" + baixa taxa de resposta/engajamento como sinal de abuso, independente de o remetente ter uma base legal (opt-out B2B) defensável.

**How to avoid:**
Decisão de produto que precisa ser tomada ANTES de construir o envio automático: (a) confirmar com o Resend por escrito se o caso de uso "email B2B com base legal opt-out, footer de opt-out por código, supressão automática" é aceitável para eles (alguns ESPs abrem exceção mediante aprovação prévia, mas o texto lido não menciona nenhum processo de aprovação); ou (b) migrar o envio automatizado para um provedor que aceite explicitamente outreach frio B2B com infraestrutura de reputação própria (ex.: Mailgun/SES com IP dedicado e monitoramento de reputação, ou ferramentas desenhadas para cold email como Instantly/Smartlead que já fazem rotação de domínio e warmup). Mesmo mantendo Resend, isolar o domínio de outreach automático do domínio principal do produto limita o dano de uma suspensão a um único subdomínio.

**Warning signs:**
Emails começando a cair em spam sem motivo aparente; erros 4xx/5xx do Resend citando "policy violation"; qualquer contato do Resend sobre a conta.

**Phase to address:**
Antes de qualquer fase de envio automático (a feature "Envio automático imediato nos mercados opt-out"). Esta é uma decisão de fornecedor, não de código — deveria ser a primeira tarefa da fase, com um item de decisão explícito para a Duda (ela ou o orquestrador tem que decidir: seguir no Resend aceitando o risco documentado, contatá-los, ou trocar de provedor para o fluxo automático).

---

### Pitfall 2: Envio automático sem revisão humana descarta silenciosamente o próprio sistema de `warnings` de alucinação que o código já implementa

**What goes wrong:**
`convex/lib/outreachAi.ts` já tem um sistema deliberado de avisos (`OutreachWarningCode = "locality-claim" | "no-verified-signal"`) com o comentário explícito "`warnings` NUNCA pode ser descartado pelo chamador" — hoje esse contrato é cumprido porque o composer mostra os avisos para a Duda ler antes de enviar. O pipeline automático (`draft` → `send` sem intervenção) não tem, hoje, nenhum ponto que leia `warnings` e decida algo com eles: a action `send` nem recebe esse array. Se o pipeline automático só chamar `draft` seguido de `send`, o aviso "a IA não teve nenhum sinal verificado para esta lead e escreveu genérico" ou "a IA alegou ser da mesma região sem essa informação confirmada" passa a ser gerado e imediatamente descartado — exatamente o cenário que o comentário do código foi escrito para impedir.

**Why it happens:**
`warnings` foi desenhado para um humano no loop. Automatizar o envio remove o loop sem que ninguém precise editar essa função — o pipeline simplesmente não olha para o retorno de `draft` além de `subject`/`body`, então o comportamento "incorreto" não aparece em nenhum diff óbvio de código.

**How to avoid:**
O pipeline automático precisa de uma regra explícita para `warnings.length > 0`: ou (a) bloquear o envio automático e cair na fila de revisão manual (mesmo em mercado opt-out), ou (b) definir um subconjunto de warnings toleráveis para automação total e documentar por quê. Dado que o core value do produto é "sem risco legal, garantido por código", a opção mais alinhada é (a): qualquer `no-verified-signal` ou `locality-claim` interrompe a automação e marca o lead como "revisar antes de enviar".

**Warning signs:**
Emails automáticos saindo com alegações genéricas de proximidade ("moro aqui perto") para leads sem nenhum sinal de dor verificado; reclamações de prospects dizendo "vocês nem sabem quem eu sou".

**Phase to address:**
"Pipeline automático pós-seleção" (a feature que decide preview + mensagem + canal) é onde a decisão de bloquear-vs-automatizar precisa ser tomada; "Envio automático imediato" é onde o bloqueio precisa ser implementado antes do `send`.

---

### Pitfall 3: A heurística "armadilha do autônomo" (forma jurídica / tipo de contato) vira decisão final sem humano nos mercados opt-out

**What goes wrong:**
`isEmailable`/`canContactByEmail` dependem de `inferLegalForm` (procura sufixos como "ltd", "ab", "as" no NOME do negócio) e `inferContactType` (classifica o local-part do email como "role" vs "named" por regex). Essas são heurísticas de string, não uma consulta a registro empresarial oficial (Companies House, KVK, CRO etc.). Hoje, mesmo com a heurística aprovando o envio, existe uma camada humana: a Duda olha o composer antes de mandar. Com envio automático imediato, essa é a ÚNICA defesa contra falso positivo — por exemplo, um negócio cujo nome de exibição no Google Places/OSM omite o sufixo societário (comum: o nome fantasia "Café da Praça" quando a entidade legal registrada é "Café da Praça Ltd", mas o Places devolve só o nome fantasia) resulta em `legalForm: "unknown"`, que já bloqueia corretamente hoje (`isEmailable` retorna `false` para "unknown"). O risco inverso é mais sutil: um `contactType` classificado como "role" por coincidência de regex (ex.: um e-mail pessoal cujo local-part por acaso é uma palavra do dicionário `ROLE_LOCALPARTS`, ou um sufixo numérico removido que casualmente sobra uma palavra-código tipo "team", "post") libera o envio automático para um endereço que na prática é de uma pessoa física/sole trader.

**Why it happens:**
A heurística foi desenhada para ser conservadora (poucos falsos positivos), mas "poucos" não é "zero", e o produto está prestes a remover a última camada de verificação humana desse ponto específico nos mercados de maior volume (justamente os opt-out, onde o envio agora é imediato e sem aprovação).

**How to avoid:**
Antes de ligar o envio 100% automático, rodar uma auditoria retroativa: pegar todos os leads `emailable: true` já classificados e conferir manualmente uma amostra (contra o próprio site do negócio, LinkedIn, registro público quando disponível) para medir a taxa real de falso positivo da heurística atual. Se a taxa não for desprezível, considerar manter um "delay" de poucos minutos/horas antes do envio automático (não é aprovação manual, mas dá campo para a Duda cancelar num painel se notar algo errado antes do envio sair) em vez de "na hora".
**Warning signs:** Reclamações de destinatários dizendo "sou autônomo, não uma empresa" ou "isso é meu email pessoal".
**Phase to address:** "Envio automático imediato nos mercados opt-out" — é o requisito que mais eleva a aposta nessa heurística existente.

---

### Pitfall 4: Alemanha — "ligação B2B permitida" (decisão travada na Fase 4) não é uma isenção geral; exige "presumed consent" concreto, e cold call genérico pode não passar no teste

**What goes wrong:**
A Fase 4 (`04-CONTEXT.md`/`04-RESEARCH.md`) tratou "ligação B2B permitida" como um fato geral para os 6 mercados opt-in, incluindo Alemanha. Pesquisa (WebSearch, cruzando `telemarketing-international.com` e `matelso.com`, 2026) mostra que o §7 da UWG alemã permite ligação B2B fria só sob "presumed consent" (*mutmaßliche Einwilligung*) — o padrão descrito é alto: precisa haver indício concreto e específico de que aquele negócio especificamente receberia bem a ligação (ex.: relação prévia, pedido de orçamento, sinal de interesse já manifestado), e "mero palpite ou correspondência de setor não é suficiente" para presumir consentimento. Ligar para um encanador/salão de beleza aleatório na Alemanha para oferecer site é exatamente o "mero palpite" que a fonte descreve como insuficiente — ou seja, o modelo "ligação primeiro sempre libera consentimento" pode não ser tão seguro na Alemanha quanto nos outros 5 mercados opt-in, mesmo sendo tecnicamente uma ligação e não um email.

**Why it happens:**
A pesquisa da Fase 4 foi majoritariamente sobre arquitetura interna do repositório (ela mesma se descreve como "não introduz tecnologia nova", HIGH confidence só no código); a validação jurídica de cada mercado foi deliberadamente deixada como `legalReview: "pending"` e como trabalho futuro, não como algo resolvido.

**How to avoid:**
Manter `legalReview: "pending"` para DE ativo e visível na UI (já existe no código — não desativar por engano ao construir a fila de ligação). Antes de escalar volume de ligação na Alemanha, validar com advogado local o padrão de discurso do roteiro de ligação (o roteiro já gerado por IA busca "citar a dor específica observada" — isso ajuda a aproximar de "indício concreto", mas não é o mesmo que consentimento presumido validado juridicamente). Considerar, como mitigação de produto, priorizar DE por último na fila de ligação até essa validação.

**Warning signs:** Nenhum incidente será "visível" cedo — o risco é regulatório/civil, não técnico. Tratar como item de decisão explícito antes de escalar DE.
**Phase to address:** "Fila de ligação pendente nos mercados opt-in" — antes de liberar volume alto para DE especificamente.

---

### Pitfall 5: Noruega é tratada como mercado "opt-out" pela linguagem do milestone, mas o próprio código já a marca `coldEmail: "conditional"` sem `legalReview`

**What goes wrong:**
`convex/lib/domain.ts` define `NO: { coldEmail: "conditional" }` (não `"opt_out"`) e, ao contrário dos 6 mercados opt-in, NÃO tem `legalReview: "pending"` — ou seja, hoje o código não sinaliza incerteza sobre a Noruega em lugar nenhum da UI, mesmo classificando-a como algo diferente de opt-out puro. A descrição do milestone ("mercados opt-out: GB/NL/IE/SE/NO") trata os 5 como equivalentes para fins de "envio automático imediato, sem aprovação" — mas pesquisa (WebSearch, `dlapiperdataprotection.com` e agregadores jurídicos, 2026) descreve a Lei de Marketing norueguesa (Markedsføringsloven §15) como um modelo **opt-in** para email marketing, com uma exceção estreita só para clientes existentes (endereço obtido "em conexão com uma venda"). Outras fontes (blogs de outreach) descrevem a Noruega como permissiva para B2B sob "legitimate interest" do GDPR — as fontes se contradizem, o que é em si um sinal de que a classificação `"conditional"` do código está certa em tratar isso como zona cinzenta, não como opt-out limpo.

**Why it happens:**
"Opt-out markets" virou um rótulo operacional conveniente (`LAUNCH_MARKETS`) que mistura dois conceitos: "mercado onde a busca/envio é tecnicamente permitido no produto hoje" e "mercado onde cold email é claramente legal". NO está no primeiro grupo por decisão de produto anterior, mas o próprio `coldEmail: "conditional"` é a evidência de que a segunda pergunta nunca foi fechada.

**How to avoid:**
Antes de ativar "envio automático sem aprovação" para NO especificamente, tratar como os outros 6 mercados opt-in: manter fora do envio 100% automático até `legalReview` virar `"validated"`, OU adicionar explicitamente `legalReview: "pending"` a NO no código para a UI mostrar o aviso "mercado em validação jurídica" também lá (hoje esse aviso só aparece na aba "Ligação primeiro", que NO nunca visita). Como o pipeline vai decidir canal automaticamente por mercado, esse é o momento certo de resolver a inconsistência, não depois.

**Warning signs:** Nenhuma reclamação ainda registrada (é um mercado pouco testado); o sinal de alerta é estrutural: o próprio schema já diferencia NO dos outros 4 opt-out (`"conditional"` vs `"opt_out"`) e ninguém tratou essa diferença na feature de decisão automática de canal.
**Phase to address:** "Pipeline automático pós-seleção" (decisão de canal por país) — é exatamente o requisito que precisa decidir se NO entra no grupo "envia sozinho, na hora" ou fica de fora até validação.

---

### Pitfall 6: Follow-up automático sem webhook de resposta/bounce reenvia para quem já respondeu, opted-out, ou tem o endereço inválido

**What goes wrong:**
O schema já tem status `"replied"`/`"bounced"` na tabela `outreach`, mas hoje SÓ existe um caminho para gravar `"replied"` (a mutation manual `markReplied`, clicada pela Duda) e NENHUM caminho grava `"bounced"` (não há webhook de inbound/bounce do Resend — isso foi decisão explícita da Fase 1: "Webhook de inbound/bounce do Resend — Fase 2 [seguinte]"). Um follow-up automático "quando o lead não responde" só pode, hoje, checar `status !== "replied"` com base numa marcação manual que a Duda pode simplesmente esquecer de fazer. Isso cria dois cenários reais: (1) o prospect respondeu por email (fora do produto, na caixa de entrada dela) e o follow-up automático dispara mesmo assim porque ninguém clicou "marcar como respondido" — reenviar depois de uma resposta é o tipo de coisa que gera reclamação de spam e, em mercados opt-in que só destravaram por consentimento pontual, pode ser lido como uma nova mensagem não solicitada fora do que foi consentido; (2) o email retornou (bounce, endereço inválido) e o follow-up é enviado de novo para o mesmo endereço morto — isso não é risco legal, mas é dano direto de deliverability (bounce rate alto é exatamente o gatilho que os provedores de bulk mail penalizam, ver Pitfall 8).

**Why it happens:**
"Respondeu manual" foi uma decisão consciente e documentada para destravar o lançamento sem construir infraestrutura de webhook — mas essa decisão pressupunha um humano no fluxo (que via a resposta e clicava). Automatizar o follow-up quebra essa premissa sem que o requisito original tenha sido revisitado.

**How to avoid:**
O webhook de inbound/bounce do Resend deixa de ser "nice to have da Fase 2" e vira pré-requisito técnico do follow-up automático — não dá para automatizar reenvio com segurança usando só o sinal manual. Se o webhook não puder ser construído a tempo, uma mitigação parcial (não equivalente, mas melhor que nada) é: qualquer lead com follow-up pendente aparecer num painel "revisar antes do follow-up sair" em vez de sair 100% silencioso, pelo menos até o webhook existir.

**Warning signs:** Estágio do lead avança para "Follow Up" e a próxima ação dispara mesmo em leads que a Duda sabe (por fora do sistema) que já responderam.
**Phase to address:** "Follow-up automático por email onde permitido" — o webhook de resposta/bounce deveria ser tratado como bloqueador desta feature, não como trabalho independente.

---

### Pitfall 7: Envio automático sem trava transacional permite double-send em corrida de concorrência

**What goes wrong:**
`outreach.send` (action) chama `fetch` para a API do Resend e só DEPOIS chama a mutation `markSent` para atualizar o status para `"sent"`. Entre a leitura do rascunho (`getForLead`) e a gravação do status, não existe nenhuma trava atômica — é uma sequência ação → mutation, não uma única transação Convex. Se o pipeline automático agendar o envio de um lead duas vezes (por exemplo: o scheduler dispara o envio e, separadamente, um retry de erro transitório do orquestrador do pipeline dispara de novo antes do primeiro terminar; ou um bug faz o mesmo lead entrar duas vezes na fila "pronto para enviar"), as duas chamadas de `send` podem passar pela checagem `canContactByEmail`/supressão (que ainda não mudou de estado) e disparar DOIS `fetch` para o Resend antes de qualquer uma delas gravar `"sent"" — o prospect recebe o mesmo email (ou dois emails muito parecidos) duas vezes.

**Why it happens:**
O código atual foi desenhado para um clique humano (o botão "Enviar" só é clicável uma vez por render, e a Duda não clica duas vezes no mesmo lead em paralelo). Um pipeline automatizado não tem essa proteção implícita de UI — precisa da mesma garantia no backend.

**How to avoid:**
Antes de despachar o `fetch` para o Resend, "reivindicar" o envio dentro de uma mutation Convex isolada e atômica: ler o status atual e, se já não for `"draft"`, abortar; senão, gravar imediatamente um status intermediário (`"sending"`, ou reaproveitar `"sent"` com um campo `sendAttemptId`) ANTES de fazer a chamada de rede. Isso exige adicionar um estado novo ao union de `status` do schema (hoje é `draft | sent | opened | replied | bounced`) ou um campo de lock separado. Sem isso, qualquer forma de re-tentativa automática no pipeline é insegura por padrão.

**Warning signs:** Prospect reclamando de ter recebido o mesmo email duas vezes; outbox mostrando duas linhas de evento `email_sent` muito próximas para o mesmo lead.
**Phase to address:** "Envio automático imediato nos mercados opt-out" — é a primeira feature que remove o humano como trava natural de "só um clique".

---

### Pitfall 8: Domínio novo, sem SPF/DKIM/DMARC aquecidos, mais volume automático e sem teto diário = quarentena/spam em massa e violação simultânea das regras do Gmail/Yahoo

**What goes wrong:**
`docs/CHECKLIST-MODO-REAL.md` confirma que o Resend nunca foi configurado em produção até hoje (`RESEND_API_KEY`/`RESEND_FROM` estão na lista de pendências, opcionais). Isso significa que o domínio de envio, quando configurado, começa do zero: sem histórico, sem reputação. Pesquisa (WebSearch, cruzando múltiplos guias de deliverability 2025-2026 como topo.io, skylead.io, instantly.ai) converge em: (a) Gmail/Yahoo exigem SPF + DKIM + DMARC configurados e alinhados para qualquer volume de "bulk sender" (a partir de ~5.000 emails/dia para a definição oficial deles, mas práticas de bloqueio afetam remetentes bem menores também); (b) taxa de reclamação de spam deve ficar abaixo de 0,1% (ideal) e nunca acima de 0,3% (Google enforcement reforçado a partir de novembro de 2025, segundo Security Boulevard); (c) taxa de bounce deve ficar abaixo de ~2%, e se passar de ~3% os guias recomendam pausar o envio imediatamente; (d) domínio sem aquecimento gradual (rampa de poucas dezenas de emails/dia por 3-6 semanas) tem, segundo esses guias, 40-60% dos emails caindo direto em spam já na primeira campanha. Um pipeline "envia sozinho, na hora, sem aprovação" combinado com múltiplos leads escolhidos num único dia e ausência de teto diário por domínio recria exatamente o cenário que esses guias descrevem como pior caso.

**Why it happens:**
O código de envio (`convex/outreach.ts`) não tem, hoje, nenhum conceito de "quantos emails já saíram hoje deste domínio" — a única quota que existe é `leadsUsed`/`sitesUsed` no workspace (`convex/model/workspace.ts`), não "emailsSentToday". Sem essa contagem, não há como aplicar um teto diário mesmo que se queira.

**How to avoid:**
Antes de ligar o envio automático: (1) configurar e VERIFICAR SPF/DKIM/DMARC no domínio de envio (o próprio Resend guia isso no onboarding de domínio); (2) implementar um teto diário de envio automático por org/domínio (ex.: começar em 10-15/dia e subir ao longo de semanas, não abrir a torneira no primeiro dia); (3) adicionar uma quarta categoria de uso ao `reserveUsage` existente (`"emails"`, ao lado de `"leads"`/`"sites"`) para o teto ser reforçado pelo mesmo mecanismo que já impede negativação de quota; (4) monitorar bounce/reclamação assim que o webhook de bounce existir (ver Pitfall 6) e pausar automaticamente o envio se os limiares acima forem excedidos, não confiar em checagem manual.

**Warning signs:** Queda repentina em taxa de abertura da preview (`previews.recordOpen`) num período curto; bounce rate subindo; Resend sinalizando problema de reputação de domínio.
**Phase to address:** "Envio automático imediato nos mercados opt-out" (é onde o volume aumenta) — mas a configuração de DNS e o teto diário deveriam ser pré-requisito operacional, tratado como o `ANTHROPIC_API_KEY` já é tratado no PROJECT.md ("sem ela a mensagem automática não existe").

---

### Pitfall 9: Aviso GDPR Art. 14 (dado obtido de terceiro) ausente no primeiro contato automático

**What goes wrong:**
Quando o dado do lead vem do Google Places/OpenStreetMap (fonte terceira, não do próprio titular), o Art. 14 do GDPR (aplicável quando o dado pessoal identificável não foi coletado diretamente do titular) exige informar isso "o mais tardar no momento do primeiro contato com o titular". Pesquisa (WebSearch, `legiscope.com`, cruzada com múltiplos guias de cold email GDPR 2025-2026) descreve casos reais: a CNIL francesa multou fornecedores B2B SaaS entre 2023 e 2025 especificamente por nunca mencionar a origem do dado no primeiro contato. O email/roteiro de ligação gerados hoje pela IA (`writeEmail`/`writeCallScript`) não têm, pelo que foi lido em `outreachAi.ts`, nenhuma instrução de prompt que exija mencionar de onde veio o contato (ex.: "encontrei seu negócio listado no Google/mapa"). Automatizar o envio SEM esse aviso multiplica o volume de mensagens que já nascem sem essa exigência cumprida.

**Why it happens:**
O Art. 14 é frequentemente confundido com "só se aplica a consentimento", quando na verdade também vale para a base legal "legitimate interest" (a base que sustenta o modelo opt-out inteiro do produto) — é um requisito de TRANSPARÊNCIA, independente, e cumulativo com o footer de opt-out que já existe.

**How to avoid:**
Adicionar ao prompt de `writeEmail`/`writeCallScript` uma linha obrigatória e não removível pela IA (no mesmo espírito do rodapé injetado por código, não confiado ao prompt) informando a origem do dado ("encontramos seu negócio via Google Maps/mapa aberto") — isso também serve de defesa em profundidade caso o footer de opt-out por algum motivo falhe, porque o Art. 14 é uma obrigação separada da obrigação de opt-out do ePrivacy.
**Warning signs:** Nenhum incidente ainda (é lacuna estrutural, não bug visível); o teste é: ler um email/roteiro gerado hoje e perguntar "esse texto explica de onde veio o contato do negócio?" — hoje a resposta é não.
**Phase to address:** "Pipeline automático pós-seleção" (mensagem por IA) — é o ponto de geração de texto, antes do envio automático amplificar o problema.

---

### Pitfall 10: Consentimento de ligação (opt-in) registrado sem evidência robusta o suficiente para sustentar uma fiscalização

**What goes wrong:**
`recordContactOptIn` (Fase 4) grava `contactOptInAt`/`contactOptInSource`/`contactOptInNote` a partir de um clique da própria Duda depois da ligação — é a palavra dela registrada por ela mesma, sem gravação da ligação, sem confirmação por escrito do prospect, sem versão do roteiro usado. Isso já era uma limitação conhecida e aceita na Fase 4 (produto pequeno, ligação feita pela própria fundadora). O risco cresce quando esse consentimento passa a DESTRAVAR ENVIO AUTOMÁTICO (mercados opt-in liberam email só depois do consentimento, e a partir daí o produto pode automatizar follow-up também) — ou seja, um registro fraco de consentimento agora sustenta uma cadeia mais longa e mais automática de contatos subsequentes, exatamente o tipo de decisão que uma autoridade de proteção de dados (AEPD na Espanha, Garante na Itália etc.) pediria para comprovar em caso de reclamação.

**Why it happens:**
Consentimento verbal por telefone é, na prática do dia a dia de vendas, a forma mais comum de "call-first" — mas o princípio de responsabilização do GDPR (Art. 5(2)/Art. 7) exige poder DEMONSTRAR o consentimento, não só ter uma crença sincera de tê-lo obtido.

**How to avoid:**
Reforçar o registro com o máximo de contexto factual disponível no momento do clique (nome de quem atendeu se souber, resumo específico do que foi dito, referência à versão do roteiro usado nessa ligação) — não elimina o risco, mas melhora a qualidade probatória. Para reduzir dependência de memória/honestidade, considerar oferecer um caminho de confirmação por escrito pós-ligação (ex.: "responda SIM a este SMS/email para confirmarmos que você autorizou o contato por email") como reforço opcional, sem bloquear o fluxo atual.
**Warning signs:** Nenhuma reclamação registrada; risco latente que só aparece em auditoria/fiscalização.
**Phase to address:** "Fila de ligação pendente nos mercados opt-in" — é onde o registro de consentimento é criado; vale reforçar antes de esse consentimento passar a destravar follow-up automático também.

---

### Pitfall 11: Verificação "tem site?" via busca na web introduz SSRF, falso positivo/negativo e risco de scraping de motor de busca

**What goes wrong:**
A nova verificação ("confere que o negócio não tem site" antes de virar prospect) provavelmente precisa buscar por "nome do negócio + cidade" em algum motor de busca e/ou tentar acessar domínios candidatos derivados do nome. Isso traz três problemas concretos: (1) **SSRF** — se a verificação faz um `fetch` de uma URL candidata construída a partir de dado de terceiro (nome do negócio, ou um "website" mal formatado vindo do Places/OSM), sem validação de host, um dado malicioso ou coincidente pode apontar para um endereço interno (ex.: metadados de nuvem, serviços internos) e a action do Convex faria a requisição a partir do servidor; (2) **falso positivo** — o motor de busca pode retornar como "site" um perfil de agregador (Yelp, TripAdvisor, página do próprio Google Maps, um Instagram) que `classifyWebsite`/`NOT_A_SITE_SUFFIXES` já sabe filtrar quando vem do Places/OSM, mas que precisa da MESMA lista de exclusão aplicada à nova fonte, senão a verificação nova contradiz a regra que o resto do produto já segue; (3) **falso negativo** — site real que não responde a tempo (timeout, JS-only, hospedagem lenta) ou que não aparece nos primeiros resultados (nome comum, múltiplos negócios com nome parecido em cidades diferentes) faz a verificação concluir "sem site" quando na verdade existe — reproduzindo o MESMO problema que motivou este milestone ("os leads que ele mostra já têm site"), só que por uma causa diferente.

**Why it happens:**
Buscar a web programaticamente parece simples, mas herda todo o histórico de deliverability/segurança do problema "receber URL de terceiro e decidir algo com ela" sem que o time perceba, porque o dado de entrada (nome do negócio) parece inofensivo.

**How to avoid:**
Usar uma API de busca licenciada (Google Custom Search JSON API ou Bing Web Search API), nunca fazer scraping direto de HTML de resultado de busca (viola o ToS do motor de busca e quebra facilmente com captcha/bloqueio de IP); reaplicar `classifyWebsite`/`NOT_A_SITE_SUFFIXES` (já existente em `domain.ts`) a qualquer candidato de site encontrado por essa nova fonte, para manter a mesma régua de "o que conta como site real"; validar o host de qualquer URL antes de fazer fetch direto (bloquear IPs privados/loopback/metadados, resolver DNS e checar antes de conectar, não confiar em string matching simples); tratar timeout/erro de rede como "não verificado" (e não como "sem site"), com um estado explícito de incerteza que talvez precise de checagem manual em vez de decidir automaticamente.
**Warning signs:** Leads entrando no pipeline automático que, ao abrir manualmente, já têm site óbvio; erros de fetch para hosts inesperados nos logs.
**Phase to address:** "Verificação de tem site na web" — é a primeira feature da lista e a que introduz essa superfície nova.

---

### Pitfall 12: Descoberta de perfis de Instagram/Facebook por scraping direto viola os termos de uso da Meta, mesmo que o contato final seja manual

**What goes wrong:**
O milestone já decide corretamente que o ENVIO por rede social é manual (Instagram/Facebook proíbem automação de mensagens). Mas a etapa anterior, a DESCOBERTA do perfil (achar a URL do Instagram/Facebook do negócio), se for implementada como scraping de página de busca ou de perfil do Instagram/Facebook (em vez de usar uma fonte licenciada), já viola os "Automated Data Collection Terms" da Meta (`facebook.com/legal/automated_data_collection_terms`, buscado 2026), que proíbem "coletar dados usando meios automatizados... sem permissão prévia" — scrapers, bots e crawlers estão explicitamente citados. O risco aqui não é o envio da mensagem (que já é manual por decisão de produto), é o PASSO DE DESCOBERTA em si.

**Why it happens:**
A distinção "a mensagem é manual, então está tudo bem" cobre só metade do problema — a coleta automatizada do link do perfil é uma atividade separada e também regulada pelo ToS da Meta, independente de quem manda a mensagem depois.

**How to avoid:**
Preferir fontes já compatíveis: tags de contato do OpenStreetMap (`contact:instagram`/`contact:facebook`, se existirem — o código já tem `normalizeInstagram`/`normalizeFacebook` em `domain.ts` comentados como usados pelo "mapper do OSM"), que são dados públicos licenciados sob ODbL, não scraping da Meta. Onde o OSM não tiver o dado (provavelmente a maioria, pelo mesmo padrão de esparsidade já visto no campo `website`), usar uma API de busca licenciada (Google/Bing) para achar a URL pública do perfil, sem em seguida fazer scraping do CONTEÚDO da página do perfil (seguidores, posts etc.) — só mostrar o link para a Duda abrir manualmente no navegador dela, que é exatamente o desenho já descrito no milestone.
**Warning signs:** IP do servidor do produto sendo bloqueado por Meta; contas de teste usadas para "espiar" perfis sendo suspensas.
**Phase to address:** "Descoberta de redes sociais do negócio" — decidir a fonte de descoberta (OSM tags + API de busca licenciada) antes de implementar, não depois.

---

### Pitfall 13: Retenção de dado do Google Places além do permitido, agravada pelo aumento de volume da automação

**What goes wrong:**
Os termos de serviço do Google Maps Platform (Service Specific Terms, lidos direto em `cloud.google.com/maps-platform/terms/maps-service-terms`) permitem cache de latitude/longitude por até 30 dias corridos, e o `place_id` indefinidamente — mas nome, endereço formatado, avaliação, foto e demais campos "não têm exceção de cache nos termos de serviço", ou seja, teoricamente precisariam ser buscados de novo a cada uso, não persistidos como hoje o lead persiste (`convex/leads.ts` grava nome/endereço/telefone direto no documento do lead, sem expiração). Isso já era uma pendência conhecida e adiada ("purge 30 dias (ToS Google Places)" está no PROJECT.md como item de Fase 2, não bloqueador de lançamento). O milestone atual aumenta a exposição de duas formas: (1) mais volume de leads processados automaticamente por dia significa mais dados armazenados em violação potencial do ToS acumulando mais rápido; (2) a nova verificação "tem site?" pode adicionar AINDA MAIS chamadas à Places API (se usar Places Details para confirmar o campo website) competindo pela mesma cota de 30 buscas/dia já apertada para descoberta.

**Why it happens:**
"Não bloqueia lançamento" foi uma decisão de priorização razoável quando o produto tinha baixo volume e uso manual; automatizar reabre essa decisão porque a escala muda o cálculo de risco (Google já suspendeu chaves de API de terceiros por violação de ToS de armazenamento em outros casos reportados publicamente).

**How to avoid:**
Não é bloqueador desta pesquisa reabrir a decisão de priorização por si (isso é decisão de roadmap), mas dois pontos concretos merecem entrar na conversa deste milestone: (a) se a verificação de site vai chamar Places Details, ela compete pela MESMA cota de 30/dia da descoberta — medir o consumo separadamente e não deixar a nova feature "roubar" cota da busca principal sem a Duda perceber; (b) reconsiderar se o purge de 30 dias deveria subir de prioridade justamente por causa deste milestone (mais volume automático = mais dado acumulado mais rápido).

**Warning signs:** Chave da Google Places suspensa ou aviso de violação de ToS no console do Google Cloud; cota de 30/dia esgotada antes do horário normal por causa da nova feature de verificação.
**Phase to address:** "Verificação de tem site na web" (competição por cota) e reabrir a decisão de purge de dado como possível pré-requisito do milestone, não só backlog eterno.

---

### Pitfall 14: Scheduler automático sem teto vira loop de custo (Anthropic) ou reenvio (Resend) em caso de erro

**What goes wrong:**
Hoje não existe nenhum arquivo `crons.ts` nem padrão de "action que reagenda a si mesma" no repositório (confirmado por busca no código) — o único uso de `ctx.scheduler` é um `runAfter(0, ...)` único, de disparo único, para pontuar um lead recém-descoberto. O pipeline automático deste milestone precisa, pela primeira vez neste código, de alguma forma de "processar isso depois" em lote ou reagendado (a decisão de canal + IA + envio depois da seleção, e o follow-up depois de N dias). Sem um padrão de idempotência e teto de tentativas já estabelecido no repositório para copiar, o risco concreto é: um erro transitório (rate limit da Anthropic, timeout do Resend) aciona um retry que, se mal implementado (ex.: reagendar incondicionalmente até dar certo, sem contagem de tentativas nem backoff), tanto pode gerar uma fatura inesperada da Anthropic (chamando `writeEmail`/`writeCallScript` repetidamente para o mesmo lead) quanto, pior, reenviar o mesmo email depois de um "falso erro" (ex.: o Resend aceitou mas a resposta demorou e o timeout do cliente achou que falhou).

**Why it happens:**
"Automação" costuma ser construída pensando no caminho feliz; o repositório também não tem, hoje, nenhum limite de gasto/chamadas por org para IA (só `leadsUsed`/`sitesUsed`, nada de "aiCallsUsed" ou "emailsSentToday").

**How to avoid:**
Definir explicitamente, antes de implementar o pipeline: número máximo de tentativas por etapa, com backoff, e o que acontece depois de esgotar (marcar o lead como "falhou, revisar manualmente", nunca reagendar para sempre); adicionar uma categoria de uso "aiCalls"/"emailsSentToday" ao `reserveUsage` existente, com teto diário por org, para qualquer chamada automática de IA ou de envio passar pelo mesmo mecanismo que já impede `leadsUsed` de ficar negativo (o próprio histórico do produto já teve um bug real de quota indo negativa em `foursquare.search`, então esse mecanismo de guarda já provou ser necessário uma vez). Preferir cron fixo (função rodando em intervalos previsíveis, ex. a cada N minutos processando um lote pequeno) a "action que reagenda a si mesma indefinidamente", porque cron fixo é mais fácil de auditar e de pausar.

**Warning signs:** Fatura da Anthropic subindo sem relação com o volume de leads processados manualmente; múltiplas linhas de evento para o mesmo lead num intervalo de segundos.
**Phase to address:** "Pipeline automático pós-seleção" (é onde a orquestração/scheduler nasce) — o teto de uso e a política de retry deveriam ser parte do desenho inicial da fase, não um ajuste posterior.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Manter "respondeu" como marcação manual e ligar follow-up automático mesmo assim | Não precisa construir webhook do Resend agora | Follow-up reenviado para quem já respondeu ou tem endereço bounced (Pitfall 6) | Nunca para follow-up automático; aceitável só enquanto o follow-up continuar manual |
| Reaproveitar `LAUNCH_MARKETS` como sinônimo de "seguro para envio 100% automático" | Reusa lista já existente, zero código novo | Esconde a diferença real entre `"opt_out"` e `"conditional"` (Pitfall 5) | Nunca sem adicionar o check de `coldEmail`/`legalReview` |
| Verificação de site usando scraping direto de HTML de busca em vez de API licenciada | Mais rápido de prototipar, sem custo de API | Bloqueio de IP, quebra por captcha, risco de ToS (Pitfall 11) | Aceitável só em ambiente de desenvolvimento local, nunca em produção |
| Não adicionar teto diário de envio/IA antes de ligar a automação "porque ainda é baixo volume" | Lança mais rápido | Sem teto, o primeiro pico de volume já é o pico sem histórico de reputação (Pitfall 8, 14) | Nunca — o teto é mais barato de construir antes do que de reagir depois de uma suspensão |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|--------------------|
| Resend | Assumir que "já usamos manualmente, então automatizar é só mais do mesmo" | Ler a Acceptable Use Policy antes de aumentar volume; considerar domínio/provedor isolado para outreach automático (Pitfall 1) |
| Google Places API | Chamar Places Details na verificação de site sem medir consumo contra a cota de descoberta | Separar/medir a cota da nova chamada, e não deixar a verificação "roubar" cota da busca principal (Pitfall 13) |
| Meta (Instagram/Facebook) | Fazer scraping de busca/perfil para achar o link social do negócio | Priorizar tags do OSM; se precisar de busca, usar API de busca licenciada, nunca scraping direto (Pitfall 12) |
| Anthropic (Claude) | Deixar o pipeline retry indefinidamente em erro transitório | Número máximo de tentativas com backoff, teto diário por org (Pitfall 14) |
| Motor de busca (para "tem site?") | Fazer fetch direto de HTML de página de resultado | Usar Google Custom Search JSON API ou Bing Web Search API (Pitfall 11) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Pipeline processando todos os leads selecionados num único disparo síncrono | Timeout de action do Convex, ou um erro num lead derruba o lote inteiro | Processar em lote pequeno com cron/scheduler incremental, um lead por invocação, com retomada de onde parou | A partir de ~10-20 leads selecionados de uma vez, dependendo da latência da Anthropic/Resend |
| `outbox`/`leads.list` continuam usando `.collect()` sem paginação (já era backlog conhecido) | Query lenta conforme a base cresce | Paginação/`take`, já listada como pendência de Fase 2 no PROJECT.md | Quando o número de leads por org passar de alguns milhares |
| Cota de Google Places (30/dia) dividida entre descoberta manual e verificação automática sem contabilização separada | Descoberta manual da Duda falha por "cota excedida" no meio do dia sem ela saber por quê | Contabilizar e expor separadamente o consumo de cada consumidor da cota | Assim que a verificação automática entrar em produção |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Fetch de URL candidata (verificação de site) sem validar o host resolvido | SSRF: servidor Convex fazendo requisição a endereço interno/metadados a partir de dado de terceiro | Resolver DNS e bloquear IPs privados/loopback/link-local antes de conectar; nunca confiar em string matching do host (Pitfall 11) |
| Logar corpo de resposta de erro de APIs externas (Resend, Anthropic, Places) sem filtrar | Vazamento de PII do prospect (email, telefone) em logs do Convex, contra a regra já existente do projeto ("nunca logar PII") | Truncar/sanitizar antes de logar; o código atual já trunca a resposta do Resend em 200 chars, mas não filtra se o corpo contiver o email do destinatário |
| Consentimento de opt-in por ligação sem nenhuma trilha além do clique da própria usuária | Fraqueza probatória em caso de fiscalização (Pitfall 10) | Reforçar o registro com mais contexto no momento da gravação |
| Nenhuma trava atômica antes de chamadas de rede com efeito colateral (Resend, Anthropic) | Double-send / double-charge em corrida de concorrência do pipeline automático (Pitfall 7) | "Reivindicar" a operação numa mutation atômica antes do `fetch` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| Envio automático "na hora" sem nenhum jeito de cancelar antes do email sair | Duda descobre um erro (lead errado, empresa que na verdade tem site) só depois que o email já foi | Pequena janela de cancelamento (ex.: fila visível por alguns minutos antes do envio efetivo) |
| Fila de "ligação pendente" sem indicar quais mercados ainda estão em `legalReview: "pending"` | Duda liga achando que o mercado já está validado juridicamente | Manter e reforçar o banner "mercado em validação jurídica" já desenhado na Fase 4, estendendo a todos os mercados que precisarem (inclusive NO, Pitfall 5) |
| Follow-up automático sem mostrar por que ele está sendo enviado (qual sinal disparou) | Duda não consegue auditar rapidamente se o follow-up fez sentido | Registrar e exibir o motivo/gatilho de cada follow-up automático no histórico do lead |

## "Looks Done But Isn't" Checklist

- [ ] **Envio automático imediato:** parece pronto quando `draft`+`send` são encadeados, mas falta trava de idempotência (Pitfall 7), teto diário (Pitfall 8) e verificação de `warnings` (Pitfall 2) — conferir se algum desses três existe antes de declarar a feature pronta.
- [ ] **Follow-up automático:** parece pronto quando o scheduler dispara no prazo certo, mas falta checar bounce/reply reais (não só a marcação manual) antes de reenviar (Pitfall 6) — conferir se há webhook de resposta/bounce, não só o campo de status.
- [ ] **Verificação "tem site?":** parece pronta quando retorna true/false, mas falta tratar timeout/erro como "não verificado" em vez de "sem site" (Pitfall 11) — conferir o comportamento em caso de erro de rede, não só o caminho feliz.
- [ ] **Descoberta de redes sociais:** parece pronta quando mostra um link, mas falta confirmar que a origem do link não veio de scraping direto da Meta (Pitfall 12) — conferir a fonte de dado, não só o resultado final.
- [ ] **Fila de ligação pendente:** parece pronta quando registra `contactOptInAt`, mas falta considerar se esse registro sozinho é evidência suficiente para os mercados de maior risco (Pitfall 10).
- [ ] **Envio em mercado opt-out "NO":** parece pronto por herdar o mesmo caminho de GB/NL/IE/SE, mas falta resolver a inconsistência entre `coldEmail: "conditional"` e a ausência de `legalReview` (Pitfall 5).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| Suspensão de conta no Resend (Pitfall 1) | HIGH | Migrar domínio/provedor de envio de emergência; auditar quais leads ficaram sem status de envio correto durante a troca; comunicar a mudança de `RESEND_FROM` no DNS (SPF/DKIM novos) |
| Double-send detectado (Pitfall 7) | MEDIUM | Identificar os pares de eventos `email_sent` duplicados por lead/janela de tempo; considerar enviar um email de desculpa curto só quando o dano parecer relevante; corrigir a trava antes de reabilitar o envio automático |
| Follow-up enviado após resposta real (Pitfall 6) | MEDIUM | Adicionar o lead à supressão manualmente assim que percebido; priorizar a construção do webhook de resposta/bounce como ação imediata, não mais como backlog |
| Falso positivo de "tem site" ou "sem site" em volume (Pitfall 11) | LOW-MEDIUM | Reprocessar o lote afetado manualmente; ajustar a lista de exclusão/heurística e reexecutar só nos leads sinalizados, não em toda a base |
| Multa/reclamação formal em mercado opt-in por consentimento fraco (Pitfall 10) | HIGH | Reunir toda a trilha disponível (registro, roteiro usado, notas); pausar imediatamente o contato automático com aquele lead/mercado; buscar orientação jurídica local antes de continuar operando nesse mercado |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1. Resend proíbe cold outreach | Decisão pré-fase, antes de "Envio automático imediato" | Confirmação por escrito do Resend, ou troca de provedor documentada, antes do primeiro envio automático em produção |
| 2. `warnings` descartado sem revisão | Pipeline automático pós-seleção | Teste automatizado: lead sem sinal verificado nunca chega a `send` sem passar por fila de revisão |
| 3. Heurística de forma jurídica sem humano | Envio automático imediato | Auditoria manual de amostra de leads `emailable: true` antes de ligar 100% automação |
| 4. Alemanha: presumed consent na ligação | Fila de ligação pendente | `legalReview` de DE permanece `"pending"` até validação jurídica; volume de DE priorizado por último |
| 5. Noruega tratada como opt-out sem `legalReview` | Pipeline automático (decisão de canal) | NO recebe o mesmo tratamento de aviso/pending que os 6 mercados opt-in, ou decisão explícita documentada do porquê não |
| 6. Follow-up sem webhook de resposta/bounce | Follow-up automático por email | Webhook de inbound/bounce do Resend implementado e testado antes do follow-up automático ir ao ar |
| 7. Double-send por falta de trava atômica | Envio automático imediato | Teste de concorrência (dois disparos simultâneos do mesmo lead resultam em um único email enviado) |
| 8. Domínio novo sem warmup/teto diário | Envio automático imediato | SPF/DKIM/DMARC verificados; teto diário configurado e testado antes do lançamento |
| 9. Falta de aviso Art. 14 | Pipeline automático (mensagem por IA) | Prompt/template revisado para sempre mencionar a origem do dado |
| 10. Consentimento de ligação fraco | Fila de ligação pendente | Registro de opt-in reforçado com mais contexto factual |
| 11. Verificação de site: SSRF/falso positivo-negativo | Verificação de tem site na web | Uso de API licenciada de busca; validação de host antes de fetch; timeout tratado como "não verificado" |
| 12. Scraping de Instagram/Facebook | Descoberta de redes sociais | Fonte de descoberta documentada como OSM tags + API licenciada, nunca scraping direto |
| 13. Retenção de dado do Places além do ToS | Verificação de tem site na web (cota) + reabertura da decisão de purge | Consumo de cota medido por feature; decisão de purge revisitada no planejamento deste milestone |
| 14. Scheduler sem teto (custo/reenvio) | Pipeline automático pós-seleção | Teto diário de chamadas de IA/envio por org; política de retry com máximo de tentativas documentada |

## Sources

- Resend, Acceptable Use Policy (`https://resend.com/legal/acceptable-use`), lido diretamente em 2026-09-26. HIGH confidence, fonte primária oficial.
- ICO (UK), "Business-to-business marketing" (`https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/`) e "Key concepts and definitions", agregado via WebSearch 2026. HIGH confidence (fonte regulatória oficial, ainda que não fetchada página a página).
- Google Cloud, "Google Maps Platform Service Specific Terms" (`https://cloud.google.com/maps-platform/terms/maps-service-terms`), agregado via WebSearch citando o texto oficial, 2026. HIGH confidence para a regra de cache de 30 dias/place_id indefinido.
- Meta, "Automated Data Collection Terms" (`https://www.facebook.com/legal/automated_data_collection_terms`), agregado via WebSearch, 2026. HIGH confidence (fonte oficial), MEDIUM para a interpretação de "descoberta separada do envio" (raciocínio próprio aplicado ao caso do produto).
- Legiscope, "GDPR Article 14: Information When Data Collected From Third Party" (`https://www.legiscope.com/blog/gdpr-article-14-third-party.html`), 2025-2026. MEDIUM confidence (blog jurídico especializado, cita casos da CNIL sem link direto à decisão).
- Telecinco / Clearrows / Legiscope, cobertura de sanções AEPD sob LSSI/RGPD para email comercial não solicitado, 2026 (`telecinco.es`, publicado 2026-09-14; `clearrows.com`, 2026-07-17). MEDIUM confidence (imprensa/blog, valores de multa consistentes entre fontes).
- Telemarketing International / Matelso, sobre §7 UWG e "mutmaßliche Einwilligung" para ligação B2B na Alemanha, 2026. MEDIUM confidence (blogs jurídicos especializados em telemarketing, não o texto da lei em si).
- DLA Piper Data Protection Laws of the World, "Electronic marketing in Norway" (via agregação WebSearch), 2026. MEDIUM-HIGH confidence (fonte de referência jurídica reconhecida), mas em conflito parcial com outras fontes de marketing sobre a permissividade B2B na Noruega — sinalizado como zona cinzenta, não fato fechado.
- Security Boulevard, "Google and Yahoo Updated Email Authentication Requirements for 2025" (2025-11) e PowerDMARC/guias de deliverability agregados (2025-2026). MEDIUM confidence (imprensa técnica especializada, consistente com páginas de ajuda oficiais do Google/Yahoo referenciadas nos mesmos resultados).
- Diversos guias de warmup/cold email (topo.io, skylead.io, instantly.ai, mailreach.co), 2025-2026. MEDIUM-LOW confidence (conteúdo de marketing de ferramentas de outreach, números de "dias de warmup"/"limite diário" variam entre fontes e não são normas oficiais, só prática de mercado consolidada).
- IntuitionLabs / Sparrow Genie / Influencers Time, sobre risco de alucinação de IA em vendas/outreach, 2025. MEDIUM-LOW confidence (conteúdo de marketing/blog, mas consistente com o comportamento observado no próprio prompt de `outreachAi.ts`, que já mitiga o mesmo risco).
- Leitura direta do código do repositório (`convex/lib/domain.ts`, `convex/lib/compliance.ts`, `convex/outreach.ts`, `convex/schema.ts`, `convex/model/workspace.ts`, `convex/lib/outreachAi.ts`, `docs/CHECKLIST-MODO-REAL.md`, `.planning/PROJECT.md`, `.planning/phases/04-.../04-RESEARCH.md`) em 2026-09-26. HIGH confidence, fonte primária (o próprio codebase).

---
*Pitfalls research for: Osprano v1.3 "Automação da prospecção" (envio automático, fila de ligação, follow-up, IA, verificação web, redes sociais)*
*Researched: 2026-09-26*
