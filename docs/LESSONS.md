# Lições — Osprano

Erros de causa não-óbvia deste repo. Lições que valem em qualquer projeto
ficam em `~/.claude/licoes.md`.

## Modelagem de dados

**A tabela `outreach` é compartilhada por email E WhatsApp**
`sintoma:` "Respondeu" ou "Marcar enviado" não altera nada visível, ou a
caixa de saída mostra um envio que não existe. Só acontece em lead que já
recebeu follow-up de WhatsApp.
`causa:` `convex/whatsapp.ts` insere na MESMA tabela `outreach` com
`channel: "whatsapp"` e status `sent`. O índice `by_lead` não inclui o canal,
então `.first()` devolve o que vier primeiro — que pode ser a linha de
WhatsApp. `markSent`/`markReplied`/`updateDraft`/`getForLead` liam e
patchavam a linha errada.
`fix:` toda leitura por `by_lead` passa pelo helper `emailRowForLead` em
`convex/outreach.ts`, que filtra `channel === "email"`. Nunca `.first()` cru
nessa tabela. Se um canal novo entrar, o helper é o lugar de decidir.

## Compliance

**`canContactByEmail` é o único predicado de "dá pra abordar por email"**
`sintoma:` depois de registrar consentimento, o composer funciona mas a tela
insiste que o lead é "fora do escopo compliant" — e no Kanban ele some quando
o filtro "Abordável" é aplicado.
`causa:` `lead.emailable` responde "o regime do mercado e a forma jurídica
permitem?", não "posso abordar?". Consentimento explícito é base legal
própria e supera os dois. Seis telas liam o campo cru.
`fix:` `grep -rn "\.emailable" src/ convex/` — toda ocorrência que DECIDE
abordabilidade é bug; só exibir/gravar o dado bruto é legítimo. O guardrail
server-side vale para os TRÊS caminhos que produzem "email enviado":
`draft`, `send` e `markSent` (o fluxo "copiei e mandei do meu email" é fácil
de esquecer).

**O que o prospect lê nunca é português — e "português" tem duas variedades**
`sintoma:` prospect de Lisboa recebe email em pt-BR; prospect dinamarquês
clica em "Afmeld dig" e cai numa página em inglês.
`causa:` o idioma foi tratado como propriedade de UM artefato (o corpo do
email), não do caminho inteiro. O caminho do prospect tem 5 pontos: script de
ligação, assunto+corpo, rodapé de opt-out, página de confirmação do
unsubscribe e a prévia do site — mais o `lang` do documento. E `PT` no mapa
`LANG` precisa dizer "European Portuguese (pt-PT)", senão o modelo escreve em
pt-BR, ainda mais quando o mesmo prompt pede uma tradução pt-BR para a
usuária.
`fix:` os testes de paridade em `tests/prospect-lang.test.ts` e
`tests/preview-i18n.test.ts` travam o conjunto: mercado novo sem tradução
completa quebra a suíte em vez de sair silenciosamente em inglês. Ao abrir um
mercado, rode a suíte antes de qualquer coisa.

**O campo `city` tem TRÊS origens diferentes — não projete em cima de uma**
`sintoma:` você desenha um mapa de cidades a partir de "como o dado chega" e
erra a premissa inteira. Custou uma rodada de trabalho baseada em algo falso.
`causa:` `convex/places.ts` pede `languageCode: "en"` ao Google, o que parece
implicar que o lead chega com "Geneva". Não chega: a linha que grava é
`city: args.city` — a forma LOCAL que a usuária escolheu no select. O
`languageCode` só afeta `displayName` e `formattedAddress`, e o field mask
nem pede `addressComponents`. As três origens reais são: select da UI (forma
local), `foursquare.ts` com `p.location?.locality` (única origem externa — e
aí vem o SUBÚRBIO: "Chêne-Bougeries", "Paradiso"), e criação manual (texto
livre, qualquer exônimo).
`fix:` antes de modelar em cima de um campo, `grep` a linha que o GRAVA, não
a que o consulta. `Diagnóstico 1º:` `grep -n "city:" convex/*.ts`.

**Suíça não é monolíngue — e nenhum país "óbvio" é seguro**
`sintoma:` prospect em Genebra recebe script de ligação, email e prévia em
alemão. Nada falha, nada loga.
`causa:` `LANG.CH = "German"` tratava um país trilíngue como um idioma só.
`fix:` `swissLanguage(city)` em `convex/lib/domain.ts` resolve de/fr/it, e
`langForLead`/`localeForLead` são as fontes de verdade — `LANG[countryCode]`
cru só serve para país monolíngue. O teste distingue "cidade está no mapa" de
"caiu no fallback" (`isKnownSwissCity`), senão uma cidade nova no select vira
alemão silencioso. Bélgica e Canadá teriam o mesmo problema.

## CSS / Tailwind

**Tailwind v4 varre TODO arquivo fora do `.gitignore`, inclusive `docs/*.md`** (2026-09-16)
`sintoma:` todas as rotas caem com 500 e o erro vem do Lightning CSS, citando
um valor arbitrário que não existe em `src/`. Aparece logo depois de escrever
uma spec ou plano em `docs/`.
`causa:` o v4 não tem `content:`; ele lê tudo que o git não ignora. Um trecho
de doc parecido com classe (valor arbitrário com `|`) entra no CSS gerado e
derruba a compilação inteira, não só aquela classe.
`fix:` `@source not "../../docs";` logo abaixo do `@import "tailwindcss"` em
`src/app/globals.css` (commit `755a321`). Pasta nova só de texto vai pra
mesma lista. `Diagnóstico 1º:` o erro cita a "classe"; `grep -rn` dela fora
de `src/`.

**`-webkit-backdrop-filter` escrito à mão apaga o `backdrop-filter` sem prefixo** (2026-09-16)
`sintoma:` vidro com blur no Chrome e no Safari, sem blur no Firefox. O CSS
fonte tem as duas formas e parece completo.
`causa:` o Lightning CSS do Turbopack gera o `-webkit-` sozinho e, com o par
escrito à mão (sem prefixo primeiro), descarta a forma sem prefixo no CSS
compilado.
`fix:` escrever só `backdrop-filter` (commit `c781a5a`). Vale pra qualquer
propriedade que o Lightning CSS prefixa: nunca duplicar à mão. Conferir no
CSS compilado, não no fonte.

**Regra fora de `@layer` vence TODO utilitário, independente de especificidade** (2026-09-16)
`sintoma:` `border-brand`, `border-transparent`, `border-hot/30` etc. não têm
efeito em lugar nenhum; toda borda sai `#e2e6ef`. Nada loga, e a classe
parece errada.
`causa:` `globals.css` tinha `* { border-color: var(--border) }` fora de
camada. Estilo sem camada vence estilo em camada, e o Tailwind v4 põe todo
utilitário em `@layer utilities`. Bug pré-existente, invisível porque a cor
padrão coincidia com a maioria dos usos.
`fix:` mover para `@layer base { * { border-color: var(--border) } }`
(commit `09fb2da`), como o guia de upgrade do v4 manda. Regra global nova em
`globals.css` nasce dentro de `@layer base`. Fica registrado: a regra
`:focus-visible` sem camada ainda existe (troca o raio por 8px em card
focado); pré-existente, fora de escopo. `Diagnóstico 1º:` listar as regras de
`globals.css` que não estão dentro de um bloco `@layer`.

## Ambiente

**`pnpm <script>` aborta neste repo (`..._NO_TTY`)**
`fix:` use `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint`,
`node --experimental-strip-types --test tests/*.test.ts`. Ou `pnpm install`
num terminal com TTY (o pnpm 11 quer purgar o `node_modules` pra
ressincronizar e sem TTY aborta em vez de perguntar). Detalhe em
`~/.claude/licoes.md` §npm.

**Mudança de schema não chega ao banco sozinha**
`sintoma:` campo novo tipado, typecheck verde, e em runtime o dado não grava.
`causa:` `convex/_generated/` deriva genericamente do schema, então o
typecheck valida SEM o deployment ter visto a mudança.
`fix:` `npx convex dev` antes do primeiro uso real. Ver também
`~/.claude/licoes.md` §Convex.

**"You don't have access to the selected project" depois de renomear o repo**
`sintoma:` TODO comando Convex (`dev`, `codegen`, `run`) morre com essa
mensagem e pede input interativo. Parece problema de login — não é: o token
autentica normalmente.
`causa:` o `CONVEX_DEPLOYMENT` do `.env.local` carrega o nome do PROJETO
(`local:local-<team>-<projeto>  # team: X, project: Y`). O projeto tinha o
nome antigo do repo (`sitescout`); depois do rename para `osprano` a conta
não tinha mais nada com aquele nome, e o CLI só sabe perguntar.
`fix:` `npx convex dev --once --configure new --project osprano
--dev-deployment local` reconfigura sem prompt. Passar `--team` só atrapalha
se o slug não bater — omita e ele resolve sozinho. `Diagnóstico 1º:`
`grep "^CONVEX_DEPLOYMENT" .env.local` — o comentário na própria linha diz
qual projeto ele está procurando.

**`npx convex run` sobe e derruba o backend a cada chamada**
`sintoma:` `convex run` funciona, mas `curl` no endpoint HTTP (porta 3211)
devolve resposta vazia e nada aparece escutando na porta.
`causa:` em deployment local, `run` e `codegen` iniciam o backend, executam e
encerram. Só `npx convex dev` (sem `--once`) o mantém de pé.
`fix:` para testar httpAction (unsubscribe, webhooks), deixe `npx convex dev`
rodando em background e use `curl --retry-connrefused` para esperar a porta.

**`npx convex run … | head` trava** (2026-09-16)
`sintoma:` o comando nunca termina e o terminal fica preso; parece o backend
travado.
`causa:` não investigada a fundo: o CLI não encerra quando a saída vai pra um
pipe que fecha cedo (`head`, `grep -m1`).
`fix:` redirecionar pra arquivo (`> /tmp/out.json`) e ler depois com `head`
ou `jq`.

**Chrome headless com tempo virtual: o websocket do Convex muitas vezes não entrega dados** (2026-09-16)
`sintoma:` screenshot da área logada sai com a casca certa mas listas vazias
(ou o skeleton), sem erro no console. Parece bug de query.
`causa:` sob `--virtual-time-budget` o relógio avança sem tempo real passar; o
sync do websocket do Convex nem sempre completa dentro do orçamento.
`fix:` repetir com orçamento maior (e mais de uma tentativa), ou confirmar o
dado direto no backend com `npx convex run` antes de suspeitar do código.
