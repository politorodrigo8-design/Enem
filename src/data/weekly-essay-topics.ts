export type WeeklyEssayTopic = {
  id: string;
  title: string;
  shortDescription: string;
  command: string;
  motivatingTexts: Array<{
    title: string;
    text: string;
  }>;
  discussionAxes: string[];
  suggestedRepertoires: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export const WEEKLY_ESSAY_TOPIC_UNLOCK_COST = 1;

export const weeklyEssayTopics: WeeklyEssayTopic[] = [
  {
    id: "2026-07-20-desinformacao-jovens",
    title: "Desafios para combater a desinformação entre jovens no Brasil",
    shortDescription:
      "Treine sua argumentação com uma proposta atual e estruturada no formato do ENEM.",
    command:
      'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema "Desafios para combater a desinformação entre jovens no Brasil", apresentando uma proposta de intervenção que respeite os direitos humanos.',
    motivatingTexts: [
      {
        title: "Texto I",
        text:
          "A circulação de conteúdos enganosos nas redes sociais costuma atingir jovens em ambientes de alta velocidade, nos quais imagens, vídeos curtos e manchetes chamativas disputam atenção antes que haja tempo para verificar fontes.",
      },
      {
        title: "Texto II",
        text:
          "A educação midiática ajuda estudantes a reconhecer autoria, contexto, evidências e interesses por trás de uma publicação. Essa formação não depende apenas de tecnologia, mas também de leitura crítica, diálogo e prática cotidiana.",
      },
      {
        title: "Texto III",
        text:
          "Algoritmos de recomendação podem ampliar conteúdos parecidos com aqueles que o usuário já consome. Sem transparência e responsabilidade, esse mecanismo tende a reforçar bolhas informacionais e dificultar o contato com perspectivas diversas.",
      },
    ],
    discussionAxes: [
      "educação midiática",
      "uso responsável das redes sociais",
      "funcionamento dos algoritmos",
      "checagem de informações",
      "responsabilidade das plataformas",
      "atuação das escolas e famílias",
    ],
    suggestedRepertoires: [
      "Conceito de cidadania digital e participação responsável em ambientes virtuais.",
      "Marco Civil da Internet como referência geral sobre direitos, deveres e responsabilidades no uso da rede.",
      "Projetos escolares de letramento midiático, leitura crítica e verificação de fontes.",
      "Debates contemporâneos sobre regulação de plataformas, liberdade de expressão e proteção de usuários.",
    ],
    startsAt: "2026-07-20",
    endsAt: "2026-07-27",
    active: true,
  },
  {
    id: "2026-07-27-envelhecimento-populacional",
    title: "Desafios para garantir qualidade de vida à população idosa no Brasil",
    shortDescription:
      "Pratique um tema social recorrente, com foco em direitos, saúde pública e inclusão.",
    command:
      'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema "Desafios para garantir qualidade de vida à população idosa no Brasil", apresentando uma proposta de intervenção que respeite os direitos humanos.',
    motivatingTexts: [
      {
        title: "Texto I",
        text:
          "O envelhecimento populacional amplia a necessidade de políticas públicas voltadas à saúde preventiva, à mobilidade urbana, à proteção social e ao cuidado continuado. Quando esses serviços não acompanham a mudança demográfica, desigualdades já existentes tendem a se aprofundar.",
      },
      {
        title: "Texto II",
        text:
          "A participação de pessoas idosas na vida comunitária depende de acesso a espaços seguros, transporte adequado, oportunidades de aprendizagem e combate a estereótipos que associam envelhecimento à incapacidade.",
      },
      {
        title: "Texto III",
        text:
          "A Constituição Federal e o Estatuto da Pessoa Idosa reconhecem direitos relacionados à dignidade, à convivência familiar e comunitária, à saúde, à cultura e à prioridade no atendimento. O desafio está em transformar garantias legais em ações efetivas no cotidiano.",
      },
    ],
    discussionAxes: [
      "saúde pública",
      "acessibilidade urbana",
      "previdência e proteção social",
      "combate ao etarismo",
      "convivência familiar e comunitária",
      "efetivação de direitos",
    ],
    suggestedRepertoires: [
      "Estatuto da Pessoa Idosa como marco legal de proteção e prioridade de atendimento.",
      "Conceito de envelhecimento ativo, associado à participação social, saúde e autonomia.",
      "Debates sobre acessibilidade em cidades, transporte público e adaptação de serviços.",
      "A Constituição Federal de 1988 e o princípio da dignidade da pessoa humana.",
    ],
    startsAt: "2026-07-27",
    endsAt: "2026-08-03",
    active: true,
  },
];

export function getActiveWeeklyEssayTopic(currentDate = todayInSaoPaulo()) {
  return (
    weeklyEssayTopics.find(
      (topic) =>
        topic.active && currentDate >= topic.startsAt && currentDate < topic.endsAt,
    ) ?? null
  );
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
