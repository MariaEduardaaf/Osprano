# Phase 9: Honestidade e superfície jurídica - Context

**Gathered:** 2026-10-12
**Status:** Ready for planning
**Source:** decisões da Duda na conversa de 2026-10-12 (milestone v1.3 "Pronto pra vender") + pesquisa em `.planning/research/commercial/`

<domain>
## Phase Boundary

Tirar da landing tudo que não é verdade, publicar as páginas legais que um SaaS vendido a partir da Espanha precisa, registrar o aceite no cadastro, deixar o suporte achável e permitir que o cliente apague a própria conta por inteiro. Requisitos: LEGAL-01..05.

Fora desta fase: planos novos (Fase 12), cobrança/IVA (Fase 11), mecanismo de idioma inglês (Fase 15), dados do Google (Fase 10).

</domain>

<decisions>
## Implementation Decisions

### Contexto do negócio (travado)
- **Correção de 2026-10-12 (fala da Duda): "não tenho empresa na Espanha, tudo é do Brasil".** O vendedor é uma empresa **brasileira** (tipo, razão social e CNPJ ainda não informados). A pesquisa `LEGAL.md` assumiu operadora estabelecida na Espanha (LSSI, autónoma, IVA espanhol): esses pontos **não** se aplicam como escritos. O que muda nesta fase:
  - A página "Aviso Legal" vira **"Informações da empresa"** (imprint): razão social, CNPJ, endereço, país, e-mail. Não citar LSSI como base.
  - Privacidade e DPA citam **GDPR (clientes e prospects na UE, art. 3(2)) e LGPD (empresa brasileira)**. A transferência UE → Brasil e o **representante na UE (GDPR art. 27)** entram como campos com placeholder; o texto marca isso como ponto para advogado.
  - A configuração de identidade é **genérica** (não amarrada a NIF/Espanha): `legalName`, `taxIdLabel` (ex.: "CNPJ"), `taxId`, `address`, `country`, `supportEmail`, `privacyEmail`, `euRepresentative` (opcional, placeholder).
- Osprano é vendido como SaaS por assinatura, **só para empresas e profissionais (B2B)**. Sem venda a consumidor.
- Lançamento **sem envio automático**: o cliente envia do próprio e-mail (Fase 13). Os Termos já devem descrever isso: o Osprano prepara, o cliente envia e é o responsável pelo contato que faz.
- Dados do Google: só `place_id` será guardado (Fase 10). Os Termos precisam avisar do conteúdo do Google Maps e linkar https://maps.google.com/help/terms_maps/ e https://policies.google.com/privacy.
- Papel GDPR (pesquisa LEGAL.md seção 1): Duda é **operadora (processor)** dos dados de prospects no workspace de cada cliente e **controladora** dos dados de conta/cobrança e da futura supressão global. O DPA (art. 28) reflete isso.
- Público final é inglês + português, mas o mecanismo de idioma é da Fase 15. **Nesta fase as páginas são escritas em português**; a versão em inglês entra na Fase 15.

### Landing (LEGAL-01)
- Remover a seção de depoimentos inteira (`TESTIMONIALS`, `src/app/page.tsx:74-77` e o bloco em ~451). Não substituir por outro depoimento.
- Remover/reescrever as promessas que não existem: "Saiba quando abriram ... você é notificado" (page.tsx:61), "hospedagem white-label na sua marca" (page.tsx:62 e ~208), domínio próprio, toggle "Anual -30%".
- Os planos exibidos na landing devem vir da fonte única `PLANS` em `convex/lib/domain.ts:664` (hoje free/pro/agency), para que a Fase 12 troque preços num lugar só. Nada de preço hardcoded na landing.
- Não reescrever o visual da landing: mudança cirúrgica de conteúdo.

### Páginas legais (LEGAL-02)
- Rotas públicas (fora do grupo `(app)`, sem login): Aviso Legal, Privacidade, Termos, Cookies, DPA, Subprocessadores, Aviso ao prospect (art. 14). Conteúdo base na pesquisa `.planning/research/commercial/LEGAL.md` (seções 2 e 4).
- Dados de identidade **ainda não foram fornecidos pela Duda**. Ficam num único arquivo de configuração (`convex/lib/legal.ts`, módulo puro) com placeholders explícitos e `legalPlaceholders()`.
- **Guard decidido pelo orquestrador:** o build de produção **NÃO falha** por placeholder nesta fase (falhar travaria qualquer deploy de produção até ela mandar os dados, inclusive correções). Em vez disso: faixa de aviso visível nas páginas legais e no rodapé enquanto houver placeholder, em qualquer ambiente. A checagem "zero placeholders" vira item obrigatório do portão de lançamento (Fase 16).
- Cada página mostra "versão" e "data de vigência". Os textos são rascunho técnico; um banner/nota interna lembra que precisam de revisão de advogado antes de cobrar (não mostrar isso ao público em produção).
- Cookies: hoje só há sessão do Clerk + localStorage de tema/assinatura (pesquisa LEGAL.md item 7). Sem analytics, logo **sem banner de consentimento** nesta fase; a política de cookies lista o que existe.
- Links no rodapé da landing (`src/app/page.tsx` footer ~549) e no app logado.

### Aceite no cadastro (LEGAL-03)
- O aceite de Termos + DPA + declaração de uso profissional é gravado no workspace com versão e data. Se a versão dos documentos subir, o próximo acesso pede novo aceite antes de usar o app.
- O cadastro usa o componente `<SignUp />` do Clerk (`src/app/sign-up/[[...sign-up]]/page.tsx`). Claude decide se o aceite acontece numa tela própria logo após o cadastro (gate no layout de `(app)`) ou via campos do Clerk; o requisito é que nenhum uso do app aconteça sem aceite registrado no Convex.

### Suporte (LEGAL-04)
- E-mail de suporte/privacidade vem do mesmo arquivo de configuração de identidade (placeholder até a Duda criar a caixa). Aparece no rodapé da landing e em Ajustes/rodapé do app.

### Exclusão de conta (LEGAL-05)
- Hoje "Apagar conta" só abre o perfil do Clerk (`src/app/(app)/settings/page.tsx:214-218`) e os dados no Convex ficam órfãos.
- Requisito: um fluxo em Ajustes com confirmação forte que apaga todos os dados do workspace no Convex (reaproveitar `deleteLeadCascade` em `convex/model/leads.ts`; cobrir leads, previews, uploads/storage, outreach, eventos, supressões do workspace), cancela a assinatura no Stripe e remove o usuário do Clerk.
- Atenção: supressões **não** devem sumir quando a supressão virar global (Fase 13); nesta fase, apagar só as do workspace, e documentar no código que a Fase 13 muda isso.
- Remover o usuário do Clerk e cancelar Stripe pelo servidor exigem chaves (Clerk secret, Stripe secret) no ambiente do Convex. **Não mexer em env**: se faltar alguma, o plano lista como "Depende de você" com o nome da variável.

### Decisões tomadas a partir da pesquisa da fase (09-RESEARCH.md)
- **Uma versão única** para o conjunto de documentos (não uma por página).
- **Usuário do Clerk apagado por rota do Next** (`clerkClient().users.deleteUser`, com a `CLERK_SECRET_KEY` que o Next já tem), não pelo cliente. Nenhuma env nova no Convex.
- `convex/_generated/api.d.ts`: gerar com `convex codegen` se houver deployment dev disponível; senão editar à mão seguindo o padrão do commit `33e73f5` (tipos gerados com lib/importLead).

### Claude's Discretion
- Estrutura de rotas das páginas legais (ex.: `/legal/<slug>`), componente de layout compartilhado, formato do conteúdo (TSX ou MDX, sem dependência nova).
- Como o gate de aceite é implementado.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pesquisa do milestone
- `.planning/research/commercial/LEGAL.md`: papéis GDPR, páginas exigidas (LSSI art. 10), cláusulas obrigatórias dos Termos, subprocessadores, cookies, o que bloqueia o primeiro cliente
- `.planning/research/commercial/LAUNCH-READINESS.md`: seção 3 (landing promete o que não existe, com linhas) e seção 4 (M1, M2, M9; exclusão de conta)

### Código
- `src/app/page.tsx`: landing (depoimentos, promessas, planos, rodapé)
- `convex/lib/domain.ts:664`: `PLANS`, fonte única dos planos
- `src/app/(app)/settings/page.tsx`: Ajustes (botão de apagar conta atual)
- `src/app/(app)/layout.tsx`: layout do app logado (lugar natural do gate de aceite)
- `convex/schema.ts`, `convex/model/workspace.ts`, `convex/model/tenant.ts`: workspace e `requireOrgId`
- `convex/model/leads.ts`: `deleteLeadCascade`
- `convex/billing.ts`, `convex/lib/stripe.ts`: Stripe (cancelamento)
- `AGENTS.md`: Next.js desta versão tem breaking changes; ler `node_modules/next/dist/docs/` antes de escrever código Next

</canonical_refs>

<specifics>
## Specific Ideas

- Verificação obrigatória do projeto: `typecheck`, `lint`, `test`, `build` (`pnpm <script>` aborta sem TTY nesta máquina; usar `./node_modules/.bin/...`).
- Nenhuma dependência npm nova sem aprovação da Duda.
- Textos em PT-BR, sem travessão (—).

</specifics>

<deferred>
## Deferred Ideas

- Versão em inglês das páginas legais e da landing: Fase 15 (I18N-01)
- Banner de cookies: só se entrar analytics
- Exportação de dados (art. 20): v2 (DATA-01)
- Supressão global: Fase 13 (SEND-05)

</deferred>

---

*Phase: 09-honestidade-e-superficie-juridica*
*Context gathered: 2026-10-12 a partir das decisões da conversa*
