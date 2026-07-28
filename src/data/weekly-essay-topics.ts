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
  {
    id: "2026-08-03-acesso-a-leitura",
    title: "Caminhos para ampliar o acesso à leitura no Brasil",
    shortDescription:
      "Um tema de educação e cultura com repertório abundante — bom para treinar proposta de intervenção.",
    command:
      'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema "Caminhos para ampliar o acesso à leitura no Brasil", apresentando uma proposta de intervenção que respeite os direitos humanos.',
    motivatingTexts: [
      {
        title: "Texto I",
        text:
          "O hábito de leitura depende de condições concretas: tempo livre, mediação de alguém que leia junto e disponibilidade de livros por perto. Onde faltam bibliotecas abertas, acervo atualizado e transporte até elas, ler deixa de ser escolha e passa a ser privilégio.",
      },
      {
        title: "Texto II",
        text:
          "A escola costuma ser o primeiro e, para muitos estudantes, o único espaço de contato sistemático com o texto literário. Quando a leitura aparece apenas como tarefa avaliativa, ela é associada à obrigação, e o vínculo com o livro se desfaz depois da última prova.",
      },
      {
        title: "Texto III",
        text:
          "Formatos digitais, audiolivros e acervos públicos on-line ampliaram as formas de ler, mas exigem conexão estável e equipamento adequado. Sem isso, a tecnologia repõe a mesma desigualdade que promete resolver.",
      },
    ],
    discussionAxes: [
      "bibliotecas públicas e escolares",
      "mediação de leitura na escola",
      "preço e distribuição do livro",
      "leitura digital e acesso à internet",
      "leitura na primeira infância",
      "formação de professores leitores",
    ],
    suggestedRepertoires: [
      "A leitura como condição para o exercício pleno da cidadania e para a compreensão de direitos.",
      "O papel das bibliotecas públicas como equipamento cultural de acesso gratuito.",
      "Programas de distribuição de livros e formação de acervo nas escolas públicas.",
      "A relação entre letramento, desempenho escolar e oportunidades de trabalho.",
    ],
    startsAt: "2026-08-03",
    endsAt: "2026-08-10",
    active: true,
  },
  {
    id: "2026-08-10-inclusao-no-trabalho",
    title:
      "Desafios para a inclusão de pessoas com deficiência no mercado de trabalho brasileiro",
    shortDescription:
      "Treine um tema de direitos e trabalho, com dados de repertório legal fáceis de sustentar.",
    command:
      'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema "Desafios para a inclusão de pessoas com deficiência no mercado de trabalho brasileiro", apresentando uma proposta de intervenção que respeite os direitos humanos.',
    motivatingTexts: [
      {
        title: "Texto I",
        text:
          "Contratar não é o mesmo que incluir. Sem acessibilidade no trajeto, no prédio, nos sistemas internos e na comunicação da equipe, a pessoa contratada permanece isolada no posto de trabalho e tende a sair pouco tempo depois.",
      },
      {
        title: "Texto II",
        text:
          "A legislação brasileira prevê reserva de vagas em empresas de médio e grande porte. A fiscalização, porém, alcança sobretudo o número de contratos, e menos a qualidade das funções oferecidas, da remuneração e das chances de crescimento.",
      },
      {
        title: "Texto III",
        text:
          "A trajetória escolar antecede a profissional: sem acessibilidade e apoio pedagógico na educação básica e na formação técnica, uma parcela grande de candidatos chega ao processo seletivo sem a qualificação que as vagas exigem.",
      },
    ],
    discussionAxes: [
      "acessibilidade nos espaços de trabalho",
      "cumprimento da reserva legal de vagas",
      "qualificação profissional e educação inclusiva",
      "capacitismo nos processos seletivos",
      "tecnologia assistiva",
      "permanência e crescimento na carreira",
    ],
    suggestedRepertoires: [
      "A Lei Brasileira de Inclusão como marco de direitos e de acessibilidade obrigatória.",
      "A reserva legal de vagas em empresas e o debate sobre fiscalização efetiva.",
      "O conceito de capacitismo e seu efeito sobre expectativas de desempenho.",
      "A Constituição Federal de 1988 e o valor social do trabalho como fundamento da República.",
    ],
    startsAt: "2026-08-10",
    endsAt: "2026-08-17",
    active: true,
  },
];

export const ESSAY_TOPIC_ROTATION_DAYS = weeklyEssayTopics.length >= 7 ? 1 : 2;

export function getActiveWeeklyEssayTopic(currentDate = todayInSaoPaulo()) {
  const activeTopics = weeklyEssayTopics
    .filter((topic) => topic.active)
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  if (!activeTopics.length) return null;

  const firstStart = activeTopics[0].startsAt;
  if (currentDate < firstStart) return null;

  const periodIndex = Math.floor(daysBetween(firstStart, currentDate) / ESSAY_TOPIC_ROTATION_DAYS);
  const topic = activeTopics[periodIndex % activeTopics.length];
  const startsAt = addDaysISO(firstStart, periodIndex * ESSAY_TOPIC_ROTATION_DAYS);

  return {
    ...topic,
    startsAt,
    endsAt: addDaysISO(startsAt, ESSAY_TOPIC_ROTATION_DAYS),
  };
}

export type WeeklyEssayTopicSuggestion = {
  topic: WeeklyEssayTopic;
  /** Falso quando a janela da semana já passou e a proposta é reaproveitada para treino. */
  isCurrentWeek: boolean;
};

/**
 * A tela de Redação nunca pode ficar sem proposta: quando nenhuma janela semanal
 * está aberta, a mais recente já publicada volta como proposta de treino.
 */
export function getWeeklyEssayTopicSuggestion(
  currentDate = todayInSaoPaulo(),
): WeeklyEssayTopicSuggestion | null {
  const current = getActiveWeeklyEssayTopic(currentDate);
  if (current) return { topic: current, isCurrentWeek: true };

  const published = weeklyEssayTopics
    .filter((topic) => topic.active && topic.startsAt <= currentDate)
    .sort((first, second) => second.startsAt.localeCompare(first.startsAt));

  return published[0] ? { topic: published[0], isCurrentWeek: false } : null;
}

function daysBetween(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const endUtc = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.max(0, Math.floor((endUtc - startUtc) / 86_400_000));
}

function addDaysISO(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
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
