/**
 * Playbook de vendas: copy ESTÁTICA que a usuária lê e repete para um prospect
 * real (ligação ou reunião). Nada aqui é gerado por IA e nada aqui é verificado
 * contra dados do negócio do prospect.
 *
 * REGRA DE OURO DESTE ARQUIVO: só se afirma o que se verificou.
 * É PROIBIDO escrever neste arquivo:
 *   - percentuais, "a maioria", "quase sempre", "em média", "boa parte", "vários donos";
 *   - promessa de resultado ("vai trazer X clientes", "se paga em Y");
 *   - afirmação sobre o passado ou a operação do prospect que ninguém checou
 *     ("você pagou adiantado e ficou na mão") — use condicional ou pergunte;
 *   - comparação com concorrentes que a usuária não mediu ("na maioria dos outros lugares...");
 *   - FEATURE que a página não renderiza. A fonte de verdade do que o prospect vê
 *     é `src/components/preview-site.tsx` (com os textos de `src/lib/preview-i18n.ts`)
 *     e o conteúdo derivado do lead em `convex/previews.ts`. Hoje a página tem:
 *     nome, categoria, cidade, nota e nº de avaliações do Google, botão de ligar e
 *     botão de WhatsApp (só quando há telefone), três blocos curtos de apresentação
 *     e o bloco final com telefone e cidade. NÃO tem cardápio, galeria de fotos,
 *     mapa, horário, preço, formulário nem sistema de reserva — não venda nada disso;
 *   - EDIÇÃO como funcionalidade. Não existe editor: o conteúdo sai dos dados do lead
 *     e o layout é fixo. A usuária pode ajustar na mão, mas "tudo é ajustável" e
 *     qualquer sugestão de autoatendimento do prospect são falsos;
 *   - COMPROMISSO DE SERVIÇO CONTÍNUO (manutenção, suporte, "não fica sozinho"):
 *     o produto entrega o site; não há contrato de manutenção por trás;
 *   - MODELO COMERCIAL (mensal, assinatura, parcelado, desconto): o sistema não tem
 *     campo de preço/plano da usuária e ela não pratica recorrência. Fale de preço
 *     como número único que ela mesma define na hora;
 *   - POSIÇÃO na busca ("aparecer na frente", "primeiro lugar", "no topo"). O site
 *     publicado (/site/[slug]) é indexável; a PRÉVIA (/p/[token]) é `noindex` de
 *     propósito, por ser link privado pré-venda. Ser indexável não é ranquear, e o
 *     tempo até o Google encontrar não está sob controle de ninguém aqui.
 * O que é permitido: argumento, raciocínio, o que a usuária de fato entrega,
 * e convite para o próprio prospect verificar (ex.: "pesquisa no Google e vê").
 */

export type ObjectionCategory = "universal" | "site";

export interface Objection {
  id: string;
  label: string;
  category: ObjectionCategory;
  empatia: string;
  argumento: string;
  /**
   * Segundo argumento, que reforça o primeiro por outro ângulo.
   * NÃO é evidência: não existe dado medido por trás. Nunca preencher com
   * estatística, percentual ou promessa de resultado — veja a regra no topo.
   */
  reforco: string;
  pergunta: string;
}

export interface MeetingStep {
  n: number;
  title: string;
  body: string;
}

export interface ClosingObjection {
  id: string;
  label: string;
  response: string;
}

export const OBJECTIONS: Objection[] = [
  {
    id: "sem-verba-ta-caro",
    label: "Não tenho verba pra isso agora, tá caro",
    category: "universal",
    empatia:
      "Faz total sentido pensar no bolso, ninguém quer colocar dinheiro numa coisa sem ter certeza do retorno.",
    argumento:
      "Justamente por isso eu não vou te pedir nada agora: o site já está pronto e você pode ver ele funcionando sem pagar nem se comprometer com nada. Você só decide seguir depois de olhar e gostar.",
    reforco:
      "Enquanto você não vê, o site é só um custo imaginário na sua cabeça. Com a prévia aberta na sua frente você julga uma coisa concreta e decide sabendo exatamente o que está comprando.",
    pergunta:
      "Posso te mostrar como ficou primeiro, e aí você me diz se faz sentido pro seu momento?",
  },
  {
    id: "sem-tempo-ocupado",
    label: "Tô sem tempo, muito ocupado agora",
    category: "universal",
    empatia:
      "Eu sei que o dia de quem toca o próprio negócio é corrido e você tem mil coisas pra resolver antes disso.",
    argumento:
      "Por isso o trabalho pesado eu já fiz por você: o site está pronto, não precisa reunião longa nem você preparar nada. Em poucos minutos eu te mostro e você decide sem esforço.",
    reforco:
      "Você não precisa preparar nada, nem me explicar o negócio, nem me mandar material: o que eu montei já está de pé. É só olhar e me dizer o que achou.",
    pergunta:
      "Qual horário fica mais leve pra você essa semana, começo da manhã ou fim do dia?",
  },
  {
    id: "manda-por-email",
    label: "Me manda por email que eu vejo depois",
    category: "universal",
    empatia:
      "Sem problema, e faz sentido você querer olhar com calma no seu tempo.",
    argumento:
      "Vou te mandar o link da prévia por email sim, esse é o combinado. Só que pelo email você vê o site, mas não o porquê de cada escolha, então prefiro te mandar e reservar cinco minutinhos pra ver junto.",
    reforco:
      "Olhando junto, qualquer dúvida você tira na hora comigo e qualquer ajuste eu já anoto ali mesmo, em vez de você ficar com a pergunta guardada.",
    pergunta:
      "Te mando agora o link e marcamos uma call rápida pra ver juntos, pode ser?",
  },
  {
    id: "vou-pensar-depois-retorno",
    label: "Vou pensar e depois te retorno",
    category: "universal",
    empatia:
      "Claro, é uma decisão sua e você tem todo o direito de pensar com calma.",
    argumento:
      "Só quero garantir que você vai pensar com a coisa certa na mão: em vez de decidir no abstrato, deixa eu te mostrar o site pronto agora, aí você pensa em cima de algo real e não de uma ideia.",
    reforco:
      "Se parte da sua dúvida é como ficaria, isso eu resolvo em dois minutos: a prévia já existe e você pode ver antes de pensar, sem custo e sem compromisso nenhum.",
    pergunta:
      "O que exatamente você gostaria de pensar melhor, o preço ou se combina com o seu negócio?",
  },
  {
    id: "ja-tenho-quem-cuida",
    label: "Já tenho quem cuida disso pra mim",
    category: "universal",
    empatia:
      "Ótimo que você já tem alguém cuidando, isso mostra que você leva a presença online a sério.",
    argumento:
      "Eu não venho pra brigar com quem já te ajuda, venho como uma segunda opinião sem custo. Você vê o que eu montei, compara com o que já tem, e fica com o que for melhor pro seu negócio.",
    reforco:
      "Comparar não te custa nada e não te obriga a trocar nada. Se o que você já tem resolver melhor, você fica com ele e eu saio da sua frente sem insistir.",
    pergunta:
      "Topa comparar lado a lado o que você já tem com o que eu montei, só pra você decidir com clareza?",
  },
  {
    id: "ja-tenho-um-site",
    label: "Eu já tenho um site",
    category: "site",
    empatia:
      "Que bom que você já se preocupou com isso, então a gente já parte de um ponto em comum: você sabe que estar visível conta.",
    argumento:
      "Ter um site é meio caminho; o que importa é o que ele faz por você hoje. Eu montei uma versão que abre bem no celular e deixa o contato a um toque, ligar ou WhatsApp, e você pode comparar com o seu sem gastar nada. O link que eu te mando é privado, serve pra você ver como ficou; publicado, ele vira um site aberto, que o Google pode encontrar.",
    reforco:
      "Vale olhar os dois lado a lado com critério: qual abre mais rápido no celular, em qual dá pra te chamar em um toque e qual explica em cinco segundos quem você é. Isso você julga na hora, com os dois abertos na sua frente. Se o seu ganhar nesses pontos, ótimo.",
    pergunta:
      "Quando foi a última vez que o seu site atual te trouxe um cliente novo de fato?",
  },
  {
    id: "nao-preciso-uso-instagram",
    label: "Não preciso de site, eu uso o Instagram",
    category: "site",
    empatia:
      "O Instagram é ótimo mesmo e faz sentido você investir onde já tem público.",
    argumento:
      "O site não substitui o Instagram, ele completa: é um endereço seu fora do feed, onde quem te procura vê logo quem você é, onde fica e o que os clientes já acharam, e fala com você em um toque, ligando ou no WhatsApp, sem rolar publicação nem esperar resposta na mensagem.",
    reforco:
      "Faz o teste você mesmo agora: pesquisa no Google o seu tipo de negócio na sua cidade e vê o que aparece. O que estiver lá é exatamente o que um cliente novo encontra.",
    pergunta:
      "Se um cliente novo te procura no Google agora, o que ele encontra sobre o seu negócio?",
  },
  {
    id: "site-nao-traz-cliente",
    label: "Site não traz cliente pra mim",
    category: "site",
    empatia:
      "Entendo a frustração, e prefiro ouvir o que você já tentou antes de te dizer qualquer coisa sobre isso.",
    argumento:
      "Site parado é enfeite, você tem razão. O que eu montei é enxuto de propósito: quem abre vê o seu nome, a sua cidade, a sua nota do Google quando você já tem avaliação, e dois botões pra falar com você, ligar ou WhatsApp. Nada pra rolar sem fim, nada pra preencher. Não é ter um site, é ter um que leve a pessoa ao contato.",
    reforco:
      "Um site só pode trazer cliente se ele for encontrado e se o próximo passo for fácil. O segundo ponto você confere agora mesmo abrindo a prévia no seu celular; o primeiro depende de ele estar publicado como site aberto, que é o que muda quando a gente coloca no ar. O que eu não te prometo é em que posição você aparece na busca, porque isso ninguém aqui controla.",
    pergunta:
      "Posso te mostrar a prévia agora e depois te explicar o que muda quando ela vai pro ar como site aberto?",
  },
  {
    id: "ja-tentei-site-antes",
    label: "Já tentei site antes e não funcionou",
    category: "site",
    empatia:
      "Sinto que você já se decepcionou com isso antes, e é justo ficar com o pé atrás.",
    argumento:
      "Se da última vez você pagou adiantado e só depois viu no que dava, aqui a ordem é o contrário: o site já está pronto e funcionando pra você abrir antes de qualquer decisão. Você julga o resultado primeiro, no seu celular, e decide depois. O risco de pagar por algo que você ainda não viu simplesmente não existe aqui.",
    reforco:
      "E me conta o que travou naquela vez que eu te digo com honestidade se aqui seria diferente ou não. Se for a mesma história, eu prefiro te falar isso agora do que depois.",
    pergunta:
      "O que deu errado da última vez: o que entregaram não era o que você esperava, ou você só viu depois de já ter pago?",
  },
  {
    id: "negocio-pequeno-nao-precisa",
    label: "Meu negócio é pequeno, não precisa de site",
    category: "site",
    empatia:
      "Entendo, quando o negócio é enxuto a gente quer cortar tudo que parece supérfluo.",
    argumento:
      "Na internet, quem pode ser encontrado é quem está lá — e pra estar lá não precisa ser o maior, precisa existir. Um site simples e bem feito te dá esse endereço, e não te pede estrutura nenhuma pra manter de pé.",
    reforco:
      "Olhar a prévia não te compromete com nada e te mostra na prática como o seu negócio se apresenta pra quem chega pela internet, em vez de você imaginar.",
    pergunta:
      "Quantos clientes novos por mês fariam isso valer a pena pra você?",
  },
];

export const MEETING_PLAYBOOK: MeetingStep[] = [
  {
    n: 1,
    title: "Quebra-gelo e rapport",
    body:
      "Comece humano, não com discurso de venda. Elogie algo que você de fato viu no negócio (uma avaliação, o tempo de casa, uma foto) — nunca um elogio genérico ou um detalhe que você supôs, porque o dono percebe na hora. Depois pergunte como anda o movimento e deixe a pessoa falar primeiro; o objetivo aqui é criar confiança, não vender.",
  },
  {
    n: 2,
    title: "Espelhar e compartilhar a tela",
    body:
      "Peça licença pra compartilhar a tela: \"posso te mostrar uma coisa que preparei pro seu negócio?\". Confirme que ele está vendo antes de seguir. Compartilhar a tela transforma a conversa de abstrata em concreta e coloca vocês dois olhando pra mesma coisa.",
  },
  {
    n: 3,
    title: "Apresentar o site seção por seção",
    body:
      "Percorra a prévia com calma, de cima pra baixo, narrando o que está na tela e nada além: o topo com o nome do negócio e o botão de ligar, a chamada de abertura, a nota e o número de avaliações do Google quando o negócio tem, os três blocos curtos de apresentação e o fecho com telefone e cidade, com ligar e WhatsApp a um toque. Diga sempre o porquê de cada bloco (\"esse botão aqui é pra ele te ligar sem pensar duas vezes\"). NÃO narre o que não está ali: a página não tem cardápio, galeria de fotos, mapa, horário nem sistema de reserva, e prometer isso com a tela compartilhada é o jeito mais rápido de perder a confiança que você acabou de construir. Vá devagar e deixe a pessoa absorver.",
  },
  {
    n: 4,
    title: "\"O que você achou?\" — pergunta aberta e escuta",
    body:
      "Depois de mostrar, faça uma pergunta aberta e cale a boca: \"e aí, o que você achou?\". Não preencha o silêncio nem antecipe objeção. Escute de verdade, porque a reação dele te diz exatamente por onde seguir e o que ainda falta destravar.",
  },
  {
    n: 5,
    title: "\"O que estiver errado eu acerto\"",
    body:
      "Assim que surgir um \"mas eu mudaria isso\", comemore por dentro: é sinal de interesse. Anote o pedido e responda com o que é verdade. O que varia de negócio pra negócio são os dados dele: nome, categoria, cidade, telefone e a nota do Google — se algum estiver errado, você corrige. O texto de apresentação e a ordem das seções são iguais pra todo mundo e só mudam se você mexer no sistema depois, na mão: é trabalho seu, não um botão que ele aperta. Então prometa no singular (\"isso aí eu acerto\"), nunca \"tudo é ajustável\", e nunca sugira que ele mesmo edita. Se o pedido for algo que a página não faz, diga na hora e trate como trabalho à parte. Ainda assim a barreira cai: o que tira o medo dele é saber que não vai ficar preso a um erro no próprio nome ou telefone.",
  },
  {
    n: 6,
    title: "A oferta — ancoragem, preço firme e silêncio",
    body:
      "Ancore no SEU valor cheio primeiro (\"o projeto do zero, feito sob medida, é X\") e só então diga o número que você está praticando neste caso. Duas travas: ancore só em valor que você pratica de verdade, porque \"o mercado cobra Y\" você não mediu e ele pode ter cotado ontem; e não ofereça condição que você não pratica — mensalidade, parcelamento, desconto — só pra destravar a conversa, porque combinar o que você não cumpre sai mais caro que perder a venda. Diga o preço com firmeza e faça silêncio depois: não preencha o vazio com desconto nem justificativa, deixe ele responder.",
  },
];

export const CLOSING_OBJECTIONS: ClosingObjection[] = [
  {
    id: "ta-caro-sem-dinheiro",
    label: "Tá caro, não tenho esse dinheiro agora",
    response:
      "Eu entendo, e não vou fingir que é troco. Faz a conta com o seu número: quanto vale pra você um cliente novo? Aí você mesmo vê quantos precisariam vir pra isso valer a pena, e a conta é sua, não minha. O que eu te peço é que decida olhando o site pronto, que você já viu funcionando, e não um valor solto no ar. Se ainda assim não couber no seu momento, prefiro que você me diga isso agora.",
  },
  {
    id: "vou-pensar-falar-socio",
    label: "Vou pensar melhor / preciso falar com meu sócio",
    response:
      "Faz todo sentido decidir junto com quem toca o negócio com você. Pra facilitar essa conversa, deixa eu te mandar o link da prévia pra você mostrar pra ele ver com os próprios olhos, é bem mais fácil do que explicar. Que tal já deixarmos um horário rápido nós três pra tirar dúvida na hora?",
  },
  {
    id: "vou-deixar-pra-depois",
    label: "Vou deixar pra depois",
    response:
      "Entendo, só que o site já está pronto agora e ver não te custa nada, então adiar não te protege de nada, só empurra a decisão pra frente. E tem um detalhe de tempo: enquanto ele não está publicado ele nem existe pra quem procura na internet, e depois de publicado ainda leva um tempo até o Google encontrar. Quanto antes entra no ar, antes esse relógio começa a correr. Que tal a gente publicar e você acompanha de perto o que acontece?",
  },
  {
    id: "quero-ver-mais-opcoes-cotar",
    label: "Quero ver mais opções / cotar em outro lugar",
    response:
      "Super justo comparar, é o seu dinheiro. Só compara também uma coisa além do preço: o quanto cada um te pede antes de te mostrar o resultado. Aqui você já viu o site pronto sem pagar nada e sem assinar nada. Compara com calma, mas me diz: o que você viu hoje deixou faltando alguma coisa?",
  },
  {
    id: "nao-sei-se-vai-funcionar",
    label: "Não sei se vai funcionar pra mim",
    response:
      "É uma dúvida honesta e eu prefiro que você tenha ela agora. Repara que você não está apostando no escuro como quem encomenda um site: o que você está avaliando já existe, você abriu no seu celular e viu funcionando, então sabe exatamente o que recebe — não é promessa de como vai ficar. O que eu não vou fazer é te garantir resultado, porque isso não depende só do site. Decidindo com o que você já viu na mão, você topa dar o primeiro passo?",
  },
  {
    id: "continuar-com-site-atual",
    label: "Vou continuar com o meu site atual",
    response:
      "Perfeito, e se o seu atual estivesse te trazendo cliente eu seria o primeiro a dizer pra ficar com ele. A gente acabou de ver lado a lado como cada um se apresenta e como é entrar em contato por ele, então a pergunta não é trocar por trocar, é escolher o que deixa mais fácil pro cliente chegar até você. Quer que eu te mostre de novo o ponto exato onde eles se diferenciam?",
  },
];
