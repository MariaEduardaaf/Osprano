# Requirements: Osprano — Milestone "Pronto para produção: bloqueadores"

**Defined:** 2026-07-11
**Core Value:** O usuário prospecta e aborda negócios europeus sem risco legal — compliance garantido por código e contagem de plano/billing íntegra.

## v1 Requirements

Bloqueadores de produção identificados pela auditoria de 2026-07-11. Cada um mapeia para fases do roadmap.

### Billing & Quota

- [x] **BILL-01**: Nenhuma chamada consegue negativar a quota — `foursquare.search` clampa o count com piso 1 (como `places.ts` já faz) e `reserveUsage` rejeita `count <= 0` com erro (defesa em profundidade). (`convex/foursquare.ts:44`, `convex/model/workspace.ts:41-58`)
- [x] **BILL-02**: A quota de leads cobra o que foi entregue, não o que foi pedido — após a descoberta, o uso reservado é reconciliado com o nº de leads realmente inseridos (excedente estornado; falha total do fetch externo estorna tudo). (`convex/places.ts:44-53`, `convex/foursquare.ts:43-47`)
- [x] **BILL-03**: Upgrade/downgrade feito pelo Stripe Billing Portal reflete no workspace — o webhook deriva o plano do `price_id` atual da subscription (mapa price→plan via `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`), não de `metadata.plan`. (`convex/http.ts:41-53`, `convex/workspaces.ts:54-74`)

### Tracking & Funil

- [x] **TRCK-01**: Abertura do preview pelo próprio vendedor (sessão autenticada do mesmo workspace) não incrementa `openCount`, não gera evento `preview_open` e não move o lead de `base` para `approached` — só abertura real do prospect conta. (`convex/previews.ts:115-141`, `src/components/preview-tracker.tsx`)
- [x] **TRCK-02**: Usuário pode marcar um outreach como "respondeu" manualmente (no detalhe do lead e/ou na outbox), gravando status `replied` real com timestamp — a coluna "Respondeu" deixa de ser exclusiva do demo. (`convex/outreach.ts`, `src/app/(app)/outreach/page.tsx`, `src/components/crm/lead-detail.tsx`)

### Compliance de Email

- [x] **COMP-01**: Existe tabela de supressão (email normalizado + escopo org/global + origem + timestamp) e tanto `outreach.draft` quanto `outreach.send` recusam endereços suprimidos. (`convex/schema.ts`, `convex/outreach.ts`)
- [x] **COMP-02**: Existe endpoint HTTP público de unsubscribe (token por outreach/lead, sem auth) que grava na tabela de supressão e confirma ao prospect. (`convex/http.ts`)
- [x] **COMP-03**: Todo email enviado sai com rodapé de opt-out injetado por código (link do unsubscribe + identificação do remetente) e header `List-Unsubscribe` no payload do Resend — independente do que a IA gerar ou do fallback de parse. (`convex/outreach.ts:156-185`, `convex/lib/outreachAi.ts:82-88`)

### Compliance de WhatsApp

- [x] **COMP-04**: Follow-up por WhatsApp só é liberado com opt-in registrado do prospect (registro explícito com origem e timestamp — ex.: "respondeu o email pedindo contato"), não por estágio de Kanban arrastável. (`convex/whatsapp.ts:17`, `convex/schema.ts`)

### Segurança

- [x] **SEC-01**: O modo demo é inerte em produção — `NEXT_PUBLIC_DEMO` (proxy) e `DEMO_MODE` (backend/seed) só têm efeito fora de produção (guarda de ambiente), impossibilitando desligar a auth por env esquecida. (`src/proxy.ts:27`, `convex/model/tenant.ts:12`, `convex/demo.ts:133`)

### Outreach UX

- [x] **OUTR-01**: O que o usuário vê no composer é o que sai — edições de assunto/corpo são persistidas (mutation de update) e o envio via Resend usa o conteúdo atualizado. (`src/components/outreach-composer.tsx`, `convex/outreach.ts:165-166`)

### Localização

- [x] **L10N-01**: O preview de site renderiza no idioma do mercado do lead (EN para GB/IE, NL para NL, SV para SE, NO para NO) — nenhum copy em português hardcoded; strings centralizadas por locale. (`src/components/preview-site.tsx`, mapa de idiomas existente em `convex/lib/outreachAi.ts:5-11`)

### Modo Opt-in (ligação-primeiro) — Fase 4

- [x] **OPTIN-01**: A descoberta funciona em mercados opt-in (ES/IT/PT/DE/DK/CH — adicionar PT ao `MARKETS` + cidades por país): "mercado pesquisável" é separado de "mercado emailável", e TODO lead de mercado opt-in nasce `emailable=false`, independente de forma jurídica/inbox. (`convex/lib/domain.ts`, `convex/places.ts`, `convex/scoring.ts`)
- [x] **OPTIN-02**: A página de Leads tem abas "Email primeiro" (mercados opt-out) e "Ligação primeiro" (mercados opt-in); na segunda, o card prioriza telefone (Ligar em destaque) e script de ligação, sem ação de cold email. (`src/app/(app)/leads/page.tsx`, `src/components/lead-card.tsx`)
- [x] **OPTIN-03**: Script de ligação gerado por IA no idioma do mercado + tradução pt-BR lado a lado, citando a dor específica do lead (mesmo padrão do `writeEmail`). (`convex/lib/outreachAi.ts`, `convex/outreach.ts`)
- [x] **OPTIN-04**: Consentimento de contato generalizado (email/WhatsApp) com origem + timestamp + evento — registrável pelo usuário; após registro, o composer de email destrava para o lead. (generalizar `waOptIn*` da Fase 2; `convex/leads.ts`, `convex/schema.ts`)
- [x] **OPTIN-05**: Guardrail server-side: `outreach.draft` e `outreach.send` recusam lead de mercado opt-in SEM consentimento registrado — nunca confiar só na UI. (`convex/outreach.ts`, `convex/lib/domain.ts`)
- [x] **OPTIN-06**: Mercados opt-in exibem aviso discreto "validação jurídica pendente" na UI até validação por país (flag por mercado no `MARKETS`).

## v1.1 Requirements

Milestone v1.1 (2026-09-16): visual da área logada e CRM. Executado com o workflow superpowers (specs e planos em `docs/superpowers/`), não com planos GSD. Fases 5 e 6 do roadmap.

### Redesenho vidro sobre névoa (Fase 5)

- [x] **UX-01**: Tokens novos (névoa `--mist`, `--surface` translúcida, `--elevated`, `--glass-border`, `--surface-solid`, `--danger-fg`, raio 18/22px, sombras) escopados a `:root:has(.app-shell)`; landing e páginas públicas de preview ficam com os tokens de antes (screenshots de `/` e `/site/[slug]` iguais antes e depois). (`src/app/globals.css`, `src/app/(app)/layout.tsx`)
- [x] **UX-02**: Classes `glass`, `glass-lite` e `glass-dense` em `@layer components`, só no primeiro nível (o bloco que encosta na névoa ou no overlay); inputs, selects e blocos internos sólidos (`bg-surface-solid` / `bg-surface-2`); nenhum `glass` dentro de `glass`. (`src/app/globals.css`, `src/components/**`, `src/app/(app)/**`)
- [x] **UX-03**: Header de 56px removido; rail de 72px em vidro com ícone e nome ("Início, Leads, CRM, Outreach, Sites, Ajustes"), `aria-current="page"` no ativo, ThemeToggle e UserButton (ou chip DEMO) na base; `UsageFooter` apagado (plano e uso já vivem em Settings → "Plano & uso"). (`src/components/sidebar.tsx`, `src/app/(app)/layout.tsx`)
- [x] **UX-04**: Tema escuro em névoa azul-marinho (não grafite) com `--foreground`/`--muted`/`--cold`/`--hot`/`--danger` em AA sobre a mancha mais escura; `prefers-reduced-transparency` deixa os vidros opacos com contorno; drawer e modal em `glass-dense` sobre overlay `bg-black/30`. (`src/app/globals.css`, `src/components/crm/lead-detail.tsx`, `src/components/crm/create-lead-modal.tsx`)
- [x] **UX-05**: Commit preparatório: `* { border-color }` movido para `@layer base` (os utilitários de cor de borda voltam a funcionar); `backdrop-filter` só sem prefixo; screenshots finais da área logada em `docs/redesign/` (7 telas, claro e escuro, 1440px). (commits `09fb2da`, `c781a5a`, `92f2704`)

### CRM: fluxo do dia e informação do lead (Fase 6)

- [x] **CRM-01**: Uma próxima ação por lead (`nextActionAt` + `nextActionNote` no documento do lead, sem tabela de tarefas) com `setNextAction`/`clearNextAction`; linha no card do Kanban com status atrasada (`--hot`), hoje (`--warm`) ou futura (`--faint`); `NextActionForm` no detalhe. (`convex/schema.ts`, `convex/leads.ts`, `src/components/crm/next-action-form.tsx`, `next-action-line.tsx`)
- [x] **CRM-02**: Faixa "Hoje" entre o cabeçalho e a busca, com os grupos Atrasadas e Hoje e as ações Feito (limpa e abre o detalhe com o campo em foco) e Adiar (1/3/7 dias, update otimista); calculada no navegador com `useNow` (60 s), some quando vazia e não muda com busca ou filtro. (`src/components/crm/today-strip.tsx`, `src/lib/use-now.ts`, `src/app/(app)/crm/page.tsx`)
- [x] **CRM-03**: Lead parado = 7+ dias em `stageUpdatedAt` sem ação e fora de `converted`/`lost` (`stalledDays`, `isStalled`, `STALLED_AFTER_DAYS`); linha "parado há N dias" no card, filtro rápido Parados e ordenação "Próxima ação" (`compareByNextAction`). (`convex/lib/domain.ts`, `src/app/(app)/crm/page.tsx`)
- [x] **CRM-04**: Coluna "Perdido" recolhida por padrão (cabeçalho é alvo de drop); `markLost` exige motivo (`LOST_REASONS`: Caro demais, Já tem site, Sem resposta, Não quer, Outro) e nota opcional; `setStage` recusa `lost` no servidor ("Use markLost") e limpa o motivo ao sair de `lost`; `LostReasonModal` (role dialog, foco inicial, Esc só fecha o modal) nos quatro pontos de entrada: drop, seletor do card, pílula de Etapa e botão Status. (`convex/leads.ts`, `src/components/crm/lost-reason-modal.tsx`, `lead-detail.tsx`, `crm/page.tsx`)
- [x] **CRM-05**: Contato (nome, cargo) e valores do negócio (setup, mensal) com `updateInfo` (trim, `null` limpa, negativo/NaN → "Valor inválido"); moeda derivada do país (`currencyForCountry`, `formatMoney`); edição inline (blur/Enter salva, Esc descarta); cabeçalho da coluna soma a mensalidade dos leads visíveis. (`convex/leads.ts`, `convex/lib/domain.ts`, `src/components/crm/lead-info-fields.tsx`, `crm/page.tsx`)
- [x] **CRM-06**: Notas são eventos (`addNote` → `events` com `type: "note"`); `leads.timeline` via índice `by_lead`; aba "Histórico" com campo de nota (Enter salva, Shift+Enter quebra) e linha do tempo com texto por tipo; `event-glyph.tsx` extraído do Dashboard com o caso `note`; `events.recent` exclui notas. (`convex/events.ts`, `convex/leads.ts`, `src/components/crm/lead-timeline.tsx`, `src/components/event-glyph.tsx`)
- [x] **CRM-07**: 17 funções puras novas em `convex/lib/domain.ts` (moeda, dia civil local, próxima ação, parado, motivos, formatação relativa) com 17 testes em `tests/crm-domain.test.ts` (suíte 191 → 208, timestamps sempre pelo construtor local); seed do demo cobre atrasadas, de hoje, parados, perdidos com motivo, contato/valores e notas. (`tests/crm-domain.test.ts`, `convex/demo.ts`)

## v1.2 Requirements

Milestone v1.2 (2026-09-18): modelos de site por segmento e a base de descoberta que o precede. Fase 7 executada por commits diretos (sem spec/plano formal); Fase 8 com o workflow superpowers (spec + adendo e planos A/B em `docs/superpowers/`, plano C inline). Fases 7 e 8 do roadmap.

### Descoberta via OpenStreetMap e "Ver o que ele tem" (Fase 7)

- [x] **DISC-01**: Descoberta de leads também via OpenStreetMap/Overpass (fonte grátis, sem chave), com seletor de fonte na UI, fallback entre espelhos (incluindo o espelho suíço) em erro 429/503/504, atribuição ODbL no card e no CRM, e quota que cobra só o lead realmente inserido mesmo numa busca repetida no mesmo lugar.
- [x] **DISC-02**: Botão "Ver o que ele tem" ao lado do preview em cada lead, linkando para o site atual, o Google Maps ou uma busca pelo negócio (substitui o link "Site atual"). (`src/components/what-they-have-button.tsx`, `src/lib/lead-links.ts`)

### Modelos de site (Fase 8)

- [x] **SITE-01**: Catálogo de 4 modelos por segmento (Mesa, Estúdio, Ofício, Vitrine) com sugestão automática pela categoria do lead (`suggestTemplate`); o preview rastreado `/p/<token>` e o site publicado `/site/<slug>` renderizam o mesmo modelo com o mesmo `content` salvo (`SiteContent` v2); formato antigo sem `version` continua abrindo, convertido na leitura. (`convex/lib/site.ts`, `src/components/site-templates/`)
- [x] **SITE-02**: 12 paletas (3 por modelo) com contraste AA garantido por teste (`contrastRatio`); textos padrão de `templates.*` nos 10 idiomas nunca afirmam fato do negócio (sem dígito, sem horário/preço/ano/superlativo), regra de honestidade sobre o negócio de terceiro; seções com dado (itens, horário, galeria, avaliação) só renderizam quando `view.*` está preenchido. (`convex/lib/contrast.ts`, `src/lib/preview-i18n.ts`)
- [x] **SITE-03**: CTA primário por ordem de preferência (WhatsApp → telefone → e-mail → nenhum); WhatsApp vazio por padrão, nunca inferido do telefone. (`convex/lib/site.ts`, função `primaryCta`)
- [x] **SITE-04**: Upload de fotos (principal + galeria, até 6) para o storage do Convex, redimensionado no navegador (≤ 1600px, JPEG 0,82, respeita EXIF) com checagem de tipo/tamanho antes do envio; nada é apagado do storage antes do Salvar, o servidor apaga o que saiu do conteúdo antigo só depois de gravar o novo. (`src/lib/image-resize.ts`, `convex/previews.ts`, função `saveContent`, `convex/model/uploads.ts`)
- [x] **SITE-05**: Editor completo em `/crm/<leadId>/site`: modelo, paleta, textos, itens (nome/preço/nota), horário, contato (endereço, telefone, WhatsApp, Instagram, e-mail) e fotos, com prévia ao vivo (desktop/celular via container queries + `zoom`) e rodapé com Salvar/Abrir preview/Publicar/Voltar; salvar depois de publicado atualiza o site no ar na hora. (`src/app/(app)/crm/[leadId]/site/page.tsx`, `src/components/site-editor/`)
- [x] **SITE-06**: Aba Site do drawer vira resumo (modelo, Editar site, Abrir preview, Publicar); cards de lead e a página Sites mostram a miniatura do modelo (`TemplateThumb`) ao vivo, sem depender de screenshot. (`src/components/crm/lead-detail.tsx`, `src/app/(app)/sites/page.tsx`)
- [x] **SITE-07**: Endurecimento pós-UAT: `registerUpload` recusa arquivo cujo `contentType` real no storage não seja JPEG/PNG/WebP (não confia no que o cliente prometeu enviar); `getBySlug` não devolve o token rastreado da prévia; rodapé de opt-out garantido no servidor em todo e-mail persistido ou copiado; erro do "Escrever com IA" visível com o composer fechado; eventos de consentimento com rótulo próprio no feed do Dashboard. (`convex/previews.ts`, `convex/outreach.ts`, `src/components/outreach-composer.tsx`, `src/app/(app)/dashboard/`)

## v1.3 Requirements

Milestone v1.3 "Pronto pra vender" (redefinido em 2026-10-12; substitui "Automação da prospecção" de 2026-09-26, cujas Fases 9-14 nunca começaram). Objetivo: um desconhecido acha o Osprano, assina, configura e prospecta sozinho, com custo por cliente que cabe no preço e sem risco legal para a Duda como operadora. Decisões da Duda em 2026-10-12: (1) lançar **sem envio automático**: o app prepara tudo e o cliente envia do próprio e-mail; (2) dados do Google **conformes aos termos EEA**: só `place_id` é persistido; (3) público **inglês + português**. Pesquisa em `.planning/research/commercial/` (COST-PRICING, LEGAL, LAUNCH-READINESS) e, para verificação/pipeline/ligação, `.planning/research/SUMMARY.md`.

### Honestidade e jurídico

- [x] **LEGAL-01**: A landing descreve só o que o produto faz no lançamento: sem depoimentos inventados, sem "notificado quando abrem", sem white-label/domínio próprio, sem toggle anual sem preço; os planos mostrados são os planos reais.
- [x] **LEGAL-02**: Existem páginas públicas de Informações da empresa (razão social, CNPJ, endereço, país, e-mail; a vendedora é empresa brasileira), Privacidade (GDPR + LGPD), Termos, Cookies, DPA, Subprocessadores e Aviso ao prospect (GDPR art. 14), linkadas no rodapé da landing e do app. Os Termos dizem que o cliente é o responsável pelo contato que faz, que o uso é só profissional (B2B) e avisam do conteúdo do Google Maps com link aos termos do Google.
- [x] **LEGAL-03**: O cadastro exige aceite dos Termos e do DPA e a declaração de uso profissional; versão e data do aceite ficam gravadas no workspace, e uma versão nova pede novo aceite.
- [x] **LEGAL-04**: Um contato de suporte e de privacidade aparece na landing e dentro do app.
- [x] **LEGAL-05**: O cliente consegue excluir a própria conta: todos os dados do workspace no Convex são apagados e a assinatura no Stripe é cancelada (não só o usuário do Clerk).

### Dados do Google conformes

- [x] **GPLC-01**: Lead vindo do Google persiste só o `place_id` (e latitude/longitude por no máximo 30 dias); nome, endereço, telefone, nota e site vindos do Google não são gravados.
- [x] **GPLC-02**: Ao ver um lead ou a lista de leads, os dados do Google aparecem buscados sob demanda, sem serem gravados, com o custo contado na cota do cliente e sem estourar o custo por cliente previsto no plano.
- [x] **GPLC-03**: O cliente confirma ou edita os dados do lead (nome, telefone, e-mail, endereço); só dado confirmado pelo cliente ou vindo do OpenStreetMap entra no preview público, na mensagem e no prompt da IA.
- [x] **GPLC-04**: Os leads já existentes com dados do Google são migrados para o modelo novo sem perder estágio, notas, histórico, site gerado nem dados confirmados.
- [x] **GPLC-05**: Toda tela que mostra conteúdo do Google exibe a atribuição do Google Maps, e conteúdo do Google nunca aparece junto de um mapa.

### Remetente e envio pelo e-mail do cliente

- [ ] **SEND-01**: O workspace tem um perfil de remetente (nome, empresa, endereço, e-mail de resposta), exigido antes da primeira mensagem; assinatura, rodapé de opt-out e prompt da IA usam esses dados, nunca os da Duda.
- [ ] **SEND-02**: "Enviar" abre a mensagem pronta no e-mail do próprio cliente (Gmail, Outlook ou o app padrão) ou copia o texto; o Osprano não transmite e-mail de cliente pelo provedor dele.
- [ ] **SEND-03**: Antes de abrir ou copiar, o servidor confere na hora `canContactByEmail`, supressão e mercado; o corpo sempre leva o rodapé de opt-out com link de descadastro e a fonte do dado (art. 14).
- [ ] **SEND-04**: O cliente marca a mensagem como enviada e o lead vai para Abordado com o registro no Histórico.
- [ ] **SEND-05**: A supressão é global: quem se descadastra pelo link de qualquer cliente não pode mais ser contatado por nenhum cliente.
- [ ] **BASE-03**: A Noruega passa a ser mercado de ligação primeiro (fora de `LAUNCH_MARKETS`, `legalReview: "pending"`) até validação jurídica.

### Planos e custo por cliente

- [ ] **PLAN-01**: Existem os planos Solo (EUR 29), Pro (EUR 59) e Agência (EUR 149), com limites mensais de leads (150 / 500 / 1.500), gerações por IA (300 / 1.000 / 3.000) e verificações de site, definidos num único lugar do código e espelhados no Stripe.
- [ ] **PLAN-02**: Toda geração por IA (mensagem, roteiro de ligação) reserva cota antes de chamar a Anthropic; sem cota, o botão fica bloqueado com aviso e link para o upgrade.
- [ ] **PLAN-03**: Cada cliente tem teto diário de buscas no Google e de verificações; o app tem um teto global de segurança que pausa as buscas no Google e avisa a Duda antes de passar do orçamento.
- [ ] **PLAN-04**: Um teste grátis único por pessoa (25 leads e 25 gerações) substitui o plano grátis permanente; criar outra conta ou workspace não renova o teste.
- [ ] **PLAN-05**: A cota renova no ciclo de cobrança do Stripe, não numa janela solta de 30 dias.
- [ ] **PLAN-06**: O uso e os limites aparecem no topo do app, com aviso em 80% e 100%.

### Cobrança

- [ ] **BILL-05**: O webhook do Stripe rejeita evento com timestamp fora de ±5 min e compara a assinatura em tempo constante.
- [ ] **BILL-06**: Pagamento atrasado ou falho (`past_due`, `invoice.payment_failed`, `incomplete_expired`) mostra aviso no app, restringe o uso depois de um prazo de carência e volta ao normal quando o pagamento entra.
- [ ] **BILL-07**: Não dá para assinar duas vezes; quem já assina troca ou cancela o plano pelo portal do Stripe.
- [ ] **BILL-08**: O checkout aplica o tratamento fiscal correto para uma empresa brasileira vendendo SaaS B2B a clientes na UE (exportação de serviço no Brasil; reverse charge do IVA para o cliente UE, a confirmar com contador), coleta VAT ID e nome da empresa e gera o documento fiscal exigido; só empresa ou profissional pode assinar. Conta Stripe da empresa brasileira (ou alternativa) definida na pesquisa da Fase 11.
- [ ] **BILL-09**: Depois do checkout há uma tela de sucesso; `APP_URL` ausente falha de forma visível em vez de cair em localhost; evento de assinatura sem workspace ou com preço desconhecido gera log de erro.
- [ ] **BILL-10**: O fluxo de cobrança é verificado ponta a ponta em modo teste (assinar, trocar, cancelar, pagamento falho) e com um pagamento real reembolsado em produção.

### Idioma

- [ ] **I18N-01**: A landing, as páginas legais, o app logado e os e-mails do sistema existem em inglês e português; o idioma segue o navegador e pode ser trocado pelo usuário.
- [ ] **I18N-02**: A mensagem ao prospect continua no idioma do mercado do lead, independente do idioma da interface.

### Verificação de site e redes sociais

- [ ] **VERIF-01**: Cada lead selecionado para preparação é conferido na web (Serper.dev); se tiver site de verdade, sai do fluxo marcado como "já tem site", com o link encontrado como prova.
- [ ] **VERIF-02**: A mesma conferência encontra Instagram e Facebook do negócio e o cliente vê os links no lead.
- [ ] **VERIF-03**: O cliente tem uma mensagem pronta para copiar e enviar manualmente pela rede social do negócio.
- [ ] **VERIF-04**: A régua de "tem site" é a mesma do resto do produto (`classifyWebsite`: rede social e agregadores contam como sem site); o servidor não busca URL de terceiro sem validar o host.

### Fila de ligação

- [ ] **CALL-01**: Leads de mercados de ligação primeiro aparecem num filtro "Ligar" no CRM, com telefone, roteiro e redes sociais.
- [ ] **CALL-02**: O cliente registra o resultado da ligação: vai fechar (avança o lead), não vai (pede motivo), pediu por e-mail (registra consentimento e libera o envio), não atendeu (reagenda).
- [ ] **CALL-03**: Em lead da Alemanha, o card pede o motivo concreto da ligação (consentimento presumido, UWG §7) antes de liberar o roteiro.

### Preparação automática (sem envio)

- [ ] **PIPE-01**: O cliente seleciona um ou vários leads e aciona "Preparar"; o app confere o site, gera o preview, escreve a mensagem e escolhe o canal sem outro clique, reservando cota em cada etapa.
- [ ] **PIPE-02**: Cada lead em preparação mostra a etapa atual e, se falhar, o erro e a opção de tentar de novo.
- [ ] **PIPE-03**: O canal é escolhido pela regra do país: e-mail onde `canContactByEmail` permite; ligação em mercado opt-in com telefone; rede social quando for o único contato; "sem contato" quando não houver nenhum.
- [ ] **PIPE-04**: Tudo que a preparação produz cai numa fila de revisão; nada é enviado sem o clique do cliente (SEND-02), e mensagem com aviso da IA (dado não confirmado) vem destacada.

### Primeiro uso e operação

- [ ] **ONB-01**: No primeiro acesso, o cliente vê as boas-vindas com os passos (perfil do remetente, primeira busca, primeiro site, primeira mensagem), e o checklist some quando termina.
- [ ] **ONB-02**: Cada tela vazia explica o que fazer e tem o botão da próxima ação.
- [ ] **OPS-01**: Erros do Next e do Convex em produção chegam à Duda com alerta, sem PII de prospect no log.
- [ ] **OPS-02**: A Duda tem uma visão interna dos clientes (plano, uso, status, último acesso) e consegue suspender uma conta abusiva, que passa a ver uma tela de conta suspensa.

### Escala

- [x] **SCAL-01**: Paginação/take nas queries `.collect()` (`leads.list/stats/analytics`, `previews.listSites`, `outreach.outbox`, `isEmailSuppressed`)
- [ ] **SCAL-02**: Quota aplicada também em `leads.create` (criação manual)
- [ ] **SCAL-03**: Rate-limit/dedupe em `previews.recordOpen`; confirmar que `getBySlug` não devolve `token`

## v2 Requirements

Depois do lançamento. Rastreados, fora do roadmap atual.

### Envio automático e follow-up (adiados em 2026-10-12, decisão A)

- **AUTO-01**: Em GB/NL/IE/SE, lead com canal e-mail que passa em todas as travas recebe o e-mail automaticamente, sem aprovação.
- **AUTO-02**: O envio automático respeita um teto diário; o excedente sai no dia seguinte.
- **AUTO-03**: O cliente liga e desliga todo o envio automático com um controle único.
- **AUTO-04**: O envio sai pelo domínio verificado do cliente, por provedor cuja política permite cold outreach B2B (não a Resend), com parecer jurídico antes.
- **AUTO-05**: E-mail devolvido ou denunciado como spam marca o lead e suprime o endereço automaticamente.
- **BASE-02**: O mesmo e-mail nunca é enviado duas vezes, mesmo com retry ou execução concorrente.
- **FUP-01**: Um follow-up automático após 4 dias, só onde e-mail é permitido.
- **FUP-02**: O follow-up é cancelado se qualquer trava disparar, conferida de novo na hora do envio.
- **FUP-03**: Sequência com mais de um follow-up
- **AUTO-06**: Detecção automática de resposta marcando `replied` sozinho
- **PIPE-05**: Descoberta de leads agendada, sem o cliente escolher
- **SEND-06**: Envio pelo Gmail/Outlook do cliente via OAuth (escopo restrito do Gmail exige avaliação de segurança do Google)

### Conta e operação

- **TEAM-01**: Mais de uma pessoa no mesmo workspace (Clerk Organizations; hoje é um login por conta)
- **DATA-01**: Exportação dos dados do workspace (GDPR art. 20)
- **OPS-03**: E-mails transacionais próprios (boas-vindas, 80%/100% da cota); recibo e falha de pagamento ficam com os e-mails nativos do Stripe
- **BILL-11**: Plano anual com desconto

### Itens absorvidos pela v1.3

- GDPR-01 (purge 30 dias + deleção) virou GPLC-01..04 e LEGAL-05; BASE-01 virou SEND-03; BASE-04 virou PLAN-02/03; BILL-04 (gating) virou PLAN-01..04; GDPR-02 (webhooks Resend) só volta com AUTO-05.


## Out of Scope
| Feature | Reason |
|---------|--------|
| Webhook inbound/bounce do Resend nesta fase | Decisão da usuária: "respondeu" manual destrava o lançamento; automação na Fase 2 |
| Geração de preview por IA / múltiplos templates | Decisão da usuária: localizar o template atual primeiro; IA é a Fase 3 |
| Domínio próprio white-label (Agency) | Fase 3 — promessa de produto, não bloqueador |
| Plugar ou remover Foursquare da UI | Fase 3 — hoje é código órfão; BILL-01 corrige o bug de quota nele mesmo assim |
| Cold WhatsApp / novos canais | Ilegal na UE; contradiz o posicionamento do produto |
| Envio automático em Instagram/Facebook/LinkedIn | ToS das plataformas proíbe automação; envio em rede social é manual (v1.3) |
| Raspagem de Google Maps ou de redes sociais | Viola ToS do Google e da Meta; descoberta de redes sociais é via busca web (v1.3) |
| Discador automático / IA respondendo o prospect | Fora do posicionamento; a conversa depois da resposta é da usuária |
| Warmup multi-caixa estilo Instantly | Infra desproporcional para volume solo |
| Guardar nome/endereço/telefone/nota do Google | Termos EEA do Google Maps (3.3.2) proíbem; decisão de 2026-10-12: só `place_id` |
| Chave própria do cliente (BYOK) para Google/Anthropic | Complexidade e suporte; reavaliar só para o plano Agência |
| Venda para consumidor final (B2C) | Só empresas e profissionais: evita direito de desistência e simplifica IVA |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BILL-01 | Phase 1 | Complete |
| BILL-02 | Phase 1 | Complete |
| BILL-03 | Phase 1 | Complete |
| TRCK-01 | Phase 3 | Complete |
| TRCK-02 | Phase 3 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| SEC-01 | Phase 1 | Complete |
| OUTR-01 | Phase 3 | Complete |
| L10N-01 | Phase 3 | Complete |
| OPTIN-01 | Phase 4 | Complete |
| OPTIN-02 | Phase 4 | Complete |
| OPTIN-03 | Phase 4 | Complete |
| OPTIN-04 | Phase 4 | Complete |
| OPTIN-05 | Phase 4 | Complete |
| OPTIN-06 | Phase 4 | Complete |
| UX-01 | Phase 5 | Complete |
| UX-02 | Phase 5 | Complete |
| UX-03 | Phase 5 | Complete |
| UX-04 | Phase 5 | Complete |
| UX-05 | Phase 5 | Complete |
| CRM-01 | Phase 6 | Complete |
| CRM-02 | Phase 6 | Complete |
| CRM-03 | Phase 6 | Complete |
| CRM-04 | Phase 6 | Complete |
| CRM-05 | Phase 6 | Complete |
| CRM-06 | Phase 6 | Complete |
| CRM-07 | Phase 6 | Complete |
| DISC-01 | Phase 7 | Complete |
| DISC-02 | Phase 7 | Complete |
| SITE-01 | Phase 8 | Complete |
| SITE-02 | Phase 8 | Complete |
| SITE-03 | Phase 8 | Complete |
| SITE-04 | Phase 8 | Complete |
| SITE-05 | Phase 8 | Complete |
| SITE-06 | Phase 8 | Complete |
| SITE-07 | Phase 8 | Complete |
| LEGAL-01 | Phase 9 | Complete |
| LEGAL-02 | Phase 9 | Complete |
| LEGAL-03 | Phase 9 | Complete |
| LEGAL-04 | Phase 9 | Complete |
| LEGAL-05 | Phase 9 | Complete |
| GPLC-01 | Phase 10 | Complete |
| GPLC-02 | Phase 10 | Complete |
| GPLC-03 | Phase 10 | Complete |
| GPLC-04 | Phase 10 | Complete |
| GPLC-05 | Phase 10 | Complete |
| SCAL-01 | Phase 10 | Complete |
| BILL-05 | Phase 11 | Pending |
| BILL-06 | Phase 11 | Pending |
| BILL-07 | Phase 11 | Pending |
| BILL-08 | Phase 11 | Pending |
| BILL-09 | Phase 11 | Pending |
| PLAN-01 | Phase 12 | Pending |
| PLAN-02 | Phase 12 | Pending |
| PLAN-03 | Phase 12 | Pending |
| PLAN-04 | Phase 12 | Pending |
| PLAN-05 | Phase 12 | Pending |
| PLAN-06 | Phase 12 | Pending |
| SCAL-02 | Phase 12 | Pending |
| SEND-01 | Phase 13 | Pending |
| SEND-02 | Phase 13 | Pending |
| SEND-03 | Phase 13 | Pending |
| SEND-04 | Phase 13 | Pending |
| SEND-05 | Phase 13 | Pending |
| BASE-03 | Phase 13 | Pending |
| VERIF-01 | Phase 14 | Pending |
| VERIF-02 | Phase 14 | Pending |
| VERIF-03 | Phase 14 | Pending |
| VERIF-04 | Phase 14 | Pending |
| CALL-01 | Phase 14 | Pending |
| CALL-02 | Phase 14 | Pending |
| CALL-03 | Phase 14 | Pending |
| PIPE-01 | Phase 14 | Pending |
| PIPE-02 | Phase 14 | Pending |
| PIPE-03 | Phase 14 | Pending |
| PIPE-04 | Phase 14 | Pending |
| ONB-01 | Phase 15 | Pending |
| ONB-02 | Phase 15 | Pending |
| OPS-01 | Phase 15 | Pending |
| OPS-02 | Phase 15 | Pending |
| SCAL-03 | Phase 15 | Pending |
| I18N-01 | Phase 15 | Pending |
| I18N-02 | Phase 15 | Pending |
| BILL-10 | Phase 16 | Pending |

**Coverage:**
- v1 requirements: 18 total (12 do milestone de produção + 6 do modo opt-in)
- v1.1 requirements: 12 total (5 do redesenho + 7 do CRM)
- v1.2 requirements: 9 total (2 da descoberta via OpenStreetMap + 7 dos modelos de site)
- v1.3 requirements: 48 total (Fases 9-16: jurídico, Google conforme, cobrança, planos, envio, prospecção assistida, operação/idioma, portão de lançamento)
- Mapped to phases: 87 (39 de v1 a v1.2 + 48 de v1.3; see ROADMAP.md)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-11*
*Last updated: 2026-10-12: roadmap do v1.3 criado (Fases 9-16), 48/48 mapeados; antes, 2026-10-12: requisitos do v1.3 redefinidos para "Pronto pra vender" (48 requisitos); antes, 2026-09-26: roadmap do milestone v1.3 criado (Fases 9-14), 22/22 requisitos mapeados; antes, definidos os requisitos do milestone v1.3; antes, 2026-09-18: milestone v1.2 (Fases 7 e 8) concluído; 18/18 requisitos v1, 12/12 v1.1 e 9/9 v1.2 completos*
