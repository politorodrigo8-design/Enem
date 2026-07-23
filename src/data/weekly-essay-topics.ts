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
];

export function getActiveWeeklyEssayTopic() {
  return weeklyEssayTopics.find((topic) => topic.active) ?? null;
}
