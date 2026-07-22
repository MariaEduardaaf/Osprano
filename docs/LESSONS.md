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

## Ambiente

**`pnpm <script>` aborta neste repo (`..._NO_TTY`)**
`fix:` use `npx tsc --noEmit`, `npx eslint`,
`node --experimental-strip-types --test tests/*.test.ts`. Detalhe em
`~/.claude/licoes.md` §npm.

**Mudança de schema não chega ao banco sozinha**
`sintoma:` campo novo tipado, typecheck verde, e em runtime o dado não grava.
`causa:` `convex/_generated/` deriva genericamente do schema, então o
typecheck valida SEM o deployment ter visto a mudança.
`fix:` `npx convex dev` (passo 1 do `docs/CHECKLIST-MODO-REAL.md`) antes do
primeiro uso real. Ver também `~/.claude/licoes.md` §Convex.
