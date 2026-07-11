export type ObjectionCategory = "universal" | "site";

export interface Objection {
  id: string;
  label: string;
  category: ObjectionCategory;
  empatia: string;
  argumento: string;
  evidencia: string;
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
    evidencia:
      "A maioria dos donos que abre a prévia já montada muda de ideia sobre preço na hora, porque para de imaginar um custo e passa a ver uma coisa concreta.",
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
    evidencia:
      "Quem começa vendo a prévia pronta gasta bem menos tempo do que imagina, porque não precisa explicar nada, é só olhar o que já existe.",
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
      "Vou te mandar o link da prévia por email sim, esse é o combinado. Só que ela ganha muito mais quando eu passo com você por cima e te mostro o porquê de cada parte, então prefiro te mandar e reservar cinco minutinhos pra ver junto.",
    evidencia:
      "O email sozinho costuma ficar pra depois no meio da correria; quem olha junto comigo entende o valor muito mais rápido.",
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
    evidencia:
      "Normalmente o que trava a decisão é dúvida sobre como vai ficar, e isso some no instante em que a pessoa vê a prévia funcionando.",
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
    evidencia:
      "Vários donos que já tinham alguém cuidando acabam ficando com a prévia porque veem na hora que ela resolve melhor, sem depender de ninguém pra atualizar.",
    pergunta:
      "Topa comparar lado a lado o que você já tem com o que eu montei, só pra você decidir com clareza?",
  },
  {
    id: "ja-tenho-um-site",
    label: "Eu já tenho um site",
    category: "site",
    empatia:
      "Que bom que você já se preocupou com isso, muita gente do seu ramo nem chegou nesse ponto.",
    argumento:
      "Ter um site é meio caminho; o que importa é se ele traz cliente hoje. Eu montei uma versão pensada pra aparecer no Google, funcionar bem no celular e converter quem chega, e você pode comparar com o seu sem gastar nada.",
    evidencia:
      "Boa parte dos donos que já tinham site acaba trocando quando vê a prévia, porque percebe que o antigo estava lento, desatualizado ou invisível na busca.",
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
      "O site não substitui o Instagram, ele completa: quando alguém te procura no Google ou quer ver preço, horário e reservar, é o site que fecha. Um trabalha pra descobrirem você, o outro pra decidirem por você.",
    evidencia:
      "Muito cliente pesquisa no Google antes de ir, e quem só tem Instagram some dessa busca; quem tem os dois costuma ser encontrado com muito mais facilidade.",
    pergunta:
      "Se um cliente novo te procura no Google agora, o que ele encontra sobre o seu negócio?",
  },
  {
    id: "site-nao-traz-cliente",
    label: "Site não traz cliente pra mim",
    category: "site",
    empatia:
      "Entendo a frustração, e se você já sentiu isso é porque provavelmente teve uma experiência que não deu retorno.",
    argumento:
      "Site parado é enfeite, você tem razão; a diferença é um site feito pra ser achado no Google e pra converter, com botão de contato, reserva e localização claros. Não é ter um site, é ter o site certo trabalhando por você.",
    evidencia:
      "A maioria dos casos de site que não traz cliente é porque ninguém o encontrava; quando o site aparece na busca da região, a história muda.",
    pergunta:
      "Posso te mostrar como a prévia foi pensada pra aparecer pra quem procura o seu tipo de negócio na sua cidade?",
  },
  {
    id: "ja-tentei-site-antes",
    label: "Já tentei site antes e não funcionou",
    category: "site",
    empatia:
      "Sinto que você já se decepcionou com isso antes, e é justo ficar com o pé atrás.",
    argumento:
      "Da última vez você provavelmente pagou adiantado e ficou na mão sem ver resultado. Aqui é o contrário: o site já está pronto pra você ver funcionando antes de qualquer decisão, e a manutenção fica comigo, você não fica sozinho.",
    evidencia:
      "Quase sempre o site anterior falhou por abandono, ninguém atualizava nem cuidava; começar já vendo a prévia pronta e com suporte contínuo evita exatamente isso.",
    pergunta:
      "O que deu errado da última vez, foi o resultado ou foi ficar sem suporte depois de pronto?",
  },
  {
    id: "negocio-pequeno-nao-precisa",
    label: "Meu negócio é pequeno, não precisa de site",
    category: "site",
    empatia:
      "Entendo, quando o negócio é enxuto a gente quer cortar tudo que parece supérfluo.",
    argumento:
      "Negócio pequeno é justamente quem mais ganha aparecendo, porque compete com os grandes na hora que o cliente pesquisa perto. Um site simples e bem feito te coloca no mapa sem você precisar de estrutura nenhuma.",
    evidencia:
      "Muitos donos de negócio pequeno que acham que não precisam mudam de ideia ao ver a prévia, porque percebem que ficam do lado dos concorrentes maiores na busca.",
    pergunta:
      "Se ser encontrado te trouxesse só alguns clientes novos por mês, já valeria pra você?",
  },
];

export const MEETING_PLAYBOOK: MeetingStep[] = [
  {
    n: 1,
    title: "Quebra-gelo e rapport",
    body:
      "Comece humano, não com discurso de venda. Elogie algo real do negócio (uma avaliação boa, o tempo de casa, uma foto) e pergunte como anda o movimento. Deixe a pessoa falar primeiro; o objetivo aqui é baixar a guarda e criar confiança, não vender.",
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
      "Percorra a prévia com calma, de cima pra baixo, narrando cada parte: topo com o nome e a chamada, fotos, cardápio ou serviços, botão de contato, localização e reservas. Diga sempre o porquê de cada bloco (\"esse botão aqui é pra ele te ligar sem pensar duas vezes\"). Vá devagar e deixe a pessoa absorver.",
  },
  {
    n: 4,
    title: "\"O que você achou?\" — pergunta aberta e escuta",
    body:
      "Depois de mostrar, faça uma pergunta aberta e cale a boca: \"e aí, o que você achou?\". Não preencha o silêncio nem antecipe objeção. Escute de verdade, porque a reação dele te diz exatamente por onde seguir e o que ainda falta destravar.",
  },
  {
    n: 5,
    title: "\"Qualquer mudança a gente faz\"",
    body:
      "Assim que surgir um \"mas eu mudaria isso\", comemore por dentro: é sinal de interesse. Reforce que tudo é ajustável, cor, foto, texto, ordem das seções, e que ele não está preso a nada do que viu. Tirar o medo de ficar com algo imperfeito derruba a maior barreira antes do preço.",
  },
  {
    n: 6,
    title: "A oferta — ancoragem, mensal e silêncio",
    body:
      "Ancore no valor cheio primeiro (\"um site assim, feito do zero, sairia por bem mais\") e só então apresente a condição real em euros, puxando pro mensal ou parcelado pra caber no caixa dele. Diga o preço com firmeza e faça silêncio total depois. Quem falar primeiro depois do preço perde; segure e deixe ele responder.",
  },
];

export const CLOSING_OBJECTIONS: ClosingObjection[] = [
  {
    id: "ta-caro-sem-dinheiro",
    label: "Tá caro, não tenho esse dinheiro agora",
    response:
      "Eu entendo, e é por isso que trabalho no mensal, pra virar um custo pequeno que cabe no seu caixa em vez de um valor grande de uma vez. Pensa que basta um ou dois clientes novos vindos do site pra ele já se pagar sozinho. Quer que eu te mostre a condição parcelada que fica mais leve?",
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
      "Entendo, só que o site já está pronto agora e cada semana sem ele é cliente pesquisando e não te encontrando. Como não tem custo pra começar a ver funcionando, adiar não te protege de nada, só adia o resultado. Que tal a gente deixar tudo no ar hoje e você já começa a colher, sem risco?",
  },
  {
    id: "quero-ver-mais-opcoes-cotar",
    label: "Quero ver mais opções / cotar em outro lugar",
    response:
      "Super justo comparar, é o seu dinheiro. Só lembra que na maioria dos outros lugares você vai pagar adiantado pra só depois ver como fica, e aqui você já está vendo o resultado pronto de graça. Compara com calma, mas me diz: o que você viu hoje deixou faltando alguma coisa?",
  },
  {
    id: "nao-sei-se-vai-funcionar",
    label: "Não sei se vai funcionar pra mim",
    response:
      "É uma dúvida honesta e eu prefiro que você tenha ela agora. Por isso o combinado é sem amarras: você começa, acompanha o site no ar e a manutenção fica comigo, então você nunca fica sozinho pra fazer dar certo. Se a gente ajustar o que for preciso pra caber no seu negócio, você topa dar o primeiro passo?",
  },
  {
    id: "continuar-com-site-atual",
    label: "Vou continuar com o meu site atual",
    response:
      "Perfeito, e se o seu atual estivesse te trazendo cliente eu seria o primeiro a dizer pra ficar com ele. A gente acabou de ver lado a lado a diferença de como o novo aparece e converte, então a pergunta não é trocar por trocar, é escolher o que te traz mais gente. Quer que eu te mostre de novo o ponto exato onde eles se diferenciam?",
  },
];
