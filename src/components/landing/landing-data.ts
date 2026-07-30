import {
  BookOpenCheck,
  Brain,
  ClipboardCheck,
  FileText,
  ListChecks,
  PenLine,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export const landingNavLinks = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Recursos", href: "/#recursos" },
  { label: "Preço", href: "/#preco" },
  { label: "Dúvidas", href: "/#duvidas" },
];

export const accessUntilLabel = "01/12/2026";
// Preço de referência exibido riscado na seção de preço (ancoragem de valor).
export const anchorPriceLabel = "R$ 239,00";
export const initialCreditsLabel = "50 créditos iniciais inclusos";
export const supportEmail = "pontuaenem.suporte@gmail.com";

export const benefits: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Veja suas prioridades",
    description: "Descubra quais áreas e assuntos precisam de mais atenção agora.",
    icon: Target,
  },
  {
    title: "Pratique o que mais importa",
    description: "Resolva questões e simulados conectados ao seu momento de preparação.",
    icon: BookOpenCheck,
  },
  {
    title: "Acompanhe sua evolução",
    description: "Entenda seus erros, acompanhe seus acertos e ajuste seus próximos estudos.",
    icon: TrendingUp,
  },
];

export const howItWorksSteps = [
  {
    title: "Descubra seu ponto de partida",
    description:
      "Informe sua rotina e faça o simulado diagnóstico para iniciar seu acompanhamento.",
  },
  {
    title: "Receba prioridades claras",
    description:
      "A plataforma relaciona seu desempenho com a recorrência dos assuntos no ENEM.",
  },
  {
    title: "Siga um plano que se adapta",
    description:
      "Sua rotina semanal é organizada com atividades, questões e revisões baseadas no seu progresso.",
  },
];

export const productTabs = [
  {
    id: "prioridades",
    label: "Prioridades",
    title: "Prioridades",
    description:
      "Entenda onde você perde mais pontos e quais assuntos merecem atenção primeiro.",
    icon: Target,
    preview: {
      eyebrow: "Exemplo de interface",
      heading: "Próximos focos de estudo",
      items: [
        "Áreas que pedem mais atenção",
        "Assuntos para revisar primeiro",
        "Erros recentes reunidos em um só lugar",
      ],
      note: "As prioridades mudam conforme você pratica e registra novos resultados.",
    },
  },
  {
    id: "questoes",
    label: "Questões e simulados",
    title: "Questões e simulados",
    description:
      "Monte sessões focadas, resolva questões revisadas e treine com simulados personalizados.",
    icon: ListChecks,
    preview: {
      eyebrow: "Exemplo de interface",
      heading: "Sessão focada",
      items: [
        "Filtros por área, assunto e dificuldade",
        "Fonte indicada em cada questão",
        "Revisão de erros integrada",
      ],
      note: "Você escolhe o tipo de treino e acompanha o resultado dentro da plataforma.",
    },
  },
  {
    id: "redacao",
    label: "Redação",
    title: "Redação",
    description:
      "Envie sua redação digitada ou manuscrita por foto ou PDF e acompanhe a correção.",
    icon: PenLine,
    preview: {
      eyebrow: "Exemplo de interface",
      heading: "Envio de redação",
      items: [
        "Texto digitado, imagem ou PDF",
        "Custo em créditos antes da confirmação",
        "Status de correção acompanhado no painel",
      ],
      note: "Cada envio de redação utiliza 10 créditos.",
    },
  },
  {
    id: "plano",
    label: "Plano semanal",
    title: "Plano semanal",
    description:
      "Receba uma rotina prática com metas e atividades organizadas para a semana.",
    icon: Route,
    preview: {
      eyebrow: "Exemplo de interface",
      heading: "Semana organizada",
      items: [
        "Atividades distribuídas por etapa",
        "Questões conectadas às prioridades",
        "Revisões ajustadas pelo progresso",
      ],
      note: "O plano transforma o diagnóstico em próximos passos possíveis.",
    },
  },
];

export const essentialFeatures: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Desempenho e prioridades",
    description: "Veja suas dificuldades por área e assunto.",
    icon: Target,
  },
  {
    title: "Banco de questões revisado",
    description: "Pratique com filtros por área, assunto, dificuldade e prioridade.",
    icon: BookOpenCheck,
  },
  {
    title: "Simulados personalizados",
    description: "Escolha o tamanho da sessão e acompanhe seu desempenho.",
    icon: ClipboardCheck,
  },
  {
    title: "Plano semanal",
    description: "Organize metas e atividades para cada etapa da semana.",
    icon: Route,
  },
  {
    title: "Correção de redação",
    description: "Envie o texto digitado ou manuscrito por foto ou PDF.",
    icon: FileText,
  },
  {
    title: "Explicações e análises com IA",
    description: "Use seus créditos para entender questões, desempenho e próximos passos.",
    icon: Brain,
  },
];

export const pricingItems = [
  `Acesso até ${accessUntilLabel}.`,
  "Sem mensalidade.",
  "Sem renovação automática.",
  "50 créditos iniciais inclusos.",
  "Banco de questões.",
  "Simulados.",
  "Análise de desempenho.",
  "Plano semanal.",
  "Correção de redação.",
  "Recursos de inteligência artificial.",
];

export const faqs = [
  {
    question: "O pagamento é mensal?",
    answer:
      "Não. O pagamento de R$ 99,90 libera o acesso até 01/12/2026, sem mensalidade e sem renovação automática.",
  },
  {
    question: "O que está incluído no acesso?",
    answer:
      "O acesso inclui desempenho e prioridades, banco de questões, simulados, plano semanal, revisão de erros, correção de redação e recursos de inteligência artificial.",
  },
  {
    question: "Como funcionam os créditos?",
    answer:
      "Você começa com 50 créditos. Eles são utilizados em funcionalidades específicas, como correção de redação e recursos de inteligência artificial. O custo aparece antes de cada confirmação. Recargas adicionais são opcionais.",
  },
  {
    question: "Como funciona a correção de redação?",
    answer:
      "A redação pode ser digitada ou enviada por foto ou PDF. Cada envio utiliza 10 créditos. O andamento da correção pode ser acompanhado dentro da plataforma.",
  },
  {
    question: "As questões são oficiais do ENEM?",
    answer:
      "O banco reúne questões oficiais do ENEM e questões revisadas, sempre com a fonte indicada em cada item.",
  },
  {
    question: "O Pontua Enem garante uma nota ou aprovação?",
    answer:
      "Não. A plataforma ajuda a organizar prioridades, prática e acompanhamento. Nenhuma plataforma pode garantir nota, vaga ou aprovação.",
  },
  {
    question: "Posso usar pelo celular?",
    answer:
      "Sim. A plataforma é responsiva e pode ser acessada pelo celular, tablet ou computador.",
  },
];

export const footerLinks = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Recursos", href: "/#recursos" },
  { label: "Preço", href: "/#preco" },
  { label: "Termos de uso", href: "/termos" },
  { label: "Política de privacidade", href: "/privacidade" },
  { label: "Política de reembolso", href: "/reembolso" },
  { label: "Contato", href: `mailto:${supportEmail}` },
];

export const finalCtaIcon = Sparkles;
