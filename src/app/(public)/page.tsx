import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Coins,
  FileText,
  Radar,
  Route,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import { HeroPanel } from "@/components/marketing/hero-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import {
  formatCurrency,
  getCurrentProductPrice,
  getProductCta,
  getPublicProduct,
} from "@/lib/services/billing";
import {
  ENEM_YEAR,
  PRODUCT_NAME,
} from "@/lib/product-config";

// Escala de display compartilhada pelos h2 de seção: 30px no mobile para a
// headline não virar um bloco de 6 linhas em telas de 320-375px.
const sectionHeadingClass =
  "font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl";

const LANDING_ACCESS_UNTIL_LABEL = "01 de dezembro de 2026";
const LANDING_ACCESS_COPY =
  "Pagamento único para acesso até 01 de dezembro de 2026.";

// Os números aqui são PISOS, não contagens exatas: o acervo é protegido por RLS
// e não pode ser contado por visitante anônimo, então a página não tem como se
// atualizar sozinha. Piso não vira mentira quando o banco cresce — só precisa
// ser revisto se questões forem REMOVIDAS. Medição de referência no banco em
// 27/07/2026: 1309 questões (1297 liberadas para treino), 1177 oficiais de 2020
// a 2025, 89 assuntos com questão vinculada.
const landingStats = [
  {
    value: "1.200+",
    label: "questões prontas para treino",
    detail: "organizadas por área, assunto e dificuldade",
  },
  {
    value: "1.100+",
    label: "questões oficiais classificadas",
    detail:
      "das provas do ENEM de 2020 a 2025, uma a uma, para medir a recorrência de cada assunto",
  },
  {
    value: "89",
    label: "assuntos mapeados",
    detail: "cada um com sua prioridade de estudo calculada",
  },
];

const bankUpdateNote = {
  label: "atualização do banco",
  title: "Novos lotes conforme a revisão avança",
  description:
    "Cada questão entra depois de conferência de gabarito e revisão. Não prometemos um número fixo por semana.",
};

const transparencyItems = [
  {
    title: "Não garantimos nota, vaga nem aprovação",
    description:
      "Ninguém pode garantir isso. O que entregamos é ordem de estudo, treino dirigido e acompanhamento da sua evolução.",
  },
  {
    title: "Não prevemos o que vai cair na prova",
    description:
      "A recorrência que você vê é o que já foi cobrado entre 2020 e 2025, medido questão por questão nas provas oficiais.",
  },
  {
    title: "Não substituímos escola nem cursinho",
    description:
      "Aqui você decide a ordem e o foco do estudo. O conteúdo em profundidade continua vindo das suas aulas e materiais.",
  },
  {
    title: "A correção de redação não é instantânea",
    description:
      "Cada redação passa por correção com acompanhamento humano. Você vê o andamento na plataforma até a devolutiva ficar pronta.",
  },
  {
    title: "Não temos vínculo com o Inep ou o MEC",
    description:
      "Somos uma plataforma independente de preparação. As prioridades são estimativas educacionais.",
  },
  {
    title: "Você paga uma vez e sabe o que recebe",
    description:
      "Sem mensalidade e sem renovação automática. Os 50 créditos vêm inclusos e o custo de cada uso aparece antes de você confirmar.",
  },
];

const problemItems = [
  "Estudar assuntos aleatórios sem saber quais têm maior peso na prova.",
  "Resolver muitas questões sem uma estratégia de priorização.",
  "Não saber em quais assuntos você está perdendo pontos.",
  "Gastar semanas com conteúdos de baixa prioridade.",
  "Chegar perto da data da prova sem saber se realmente evoluiu.",
];

const steps = [
  {
    title: "Faça o diagnóstico",
    description:
      "Informe seu objetivo e sua rotina e resolva uma sequência inicial de questões para mapear seu ponto de partida.",
  },
  {
    title: "Identifique onde perde pontos",
    description:
      "Descubra em quais assuntos sua taxa de acerto está abaixo do necessário para alcançar seu objetivo.",
  },
  {
    title: "Combine desempenho, frequência e relevância",
    description:
      "A análise de desempenho combina seus erros, a frequência dos assuntos no ENEM e o potencial de ganho para definir a ordem dos seus estudos.",
  },
  {
    title: "Siga sua rotina semanal",
    description:
      "Receba um plano com as atividades e questões certas para a semana, montado a partir das suas prioridades atuais.",
  },
];

const features = [
  {
    title: "Desempenho",
    description:
      "Prioridades por área e assunto, relacionando a frequência histórica dos temas com o seu desempenho.",
    icon: Radar,
  },
  {
    title: "Simulado diagnóstico",
    description:
      "Uma sequência inicial de questões que identifica seu ponto de partida em cada área da prova.",
    icon: ClipboardCheck,
  },
  {
    title: "Banco de questões revisado",
    description:
      "Questões organizadas por área, assunto, dificuldade e prioridade, com a fonte indicada em cada uma.",
    icon: BookOpenCheck,
  },
  {
    title: "Correção de redação",
    description:
      "Envie redação digitada ou manuscrita, por foto ou PDF, e acompanhe o andamento da correção pela plataforma.",
    icon: FileText,
  },
  {
    title: "Plano semanal",
    description:
      "Uma rotina semanal de estudos objetiva, recalculada conforme seu desempenho.",
    icon: Route,
  },
  {
    title: "Painel de evolução",
    description:
      "Taxa de acerto, constância e evolução por área, acompanhadas ao longo das semanas.",
    icon: TrendingUp,
  },
  {
    title: "Créditos na conta",
    description:
      "Acompanhe saldo, consumo e histórico das funcionalidades que utilizam créditos.",
    icon: Coins,
  },
  {
    title: "Revisão de erros",
    description:
      "Revise suas questões erradas no momento certo e transforme erros em pontos.",
    icon: SearchCheck,
  },
];

const performanceDemo = [
  {
    area: "Matemática",
    items: [
      {
        topic: "Razão e proporção",
        priority: "Prioridade máxima",
        accuracy: "42%",
        recurrence: "Alta frequência",
        reason: "Alta frequência e taxa de acerto abaixo do seu objetivo.",
      },
      {
        topic: "Estatística",
        priority: "Prioridade alta",
        accuracy: "54%",
        recurrence: "Alta frequência",
        reason: "Aparece com frequência e ainda gera perda de pontos.",
      },
      {
        topic: "Geometria plana",
        priority: "Prioridade baixa",
        accuracy: "68%",
        recurrence: "Recorrente",
        reason: "Bom potencial de ganho para a próxima semana.",
      },
    ],
  },
  {
    area: "Ciências da Natureza",
    items: [
      {
        topic: "Ecologia",
        priority: "Prioridade máxima",
        accuracy: "41%",
        recurrence: "Alta frequência",
        reason: "Conteúdo recorrente com espaço claro para consolidar acertos.",
      },
      {
        topic: "Eletricidade",
        priority: "Prioridade alta",
        accuracy: "52%",
        recurrence: "Recorrente",
        reason: "Erros recentes indicam revisão antes de avançar.",
      },
      {
        topic: "Estequiometria",
        priority: "Prioridade baixa",
        accuracy: "68%",
        recurrence: "Recorrente",
        reason: "Base importante para questões de Química com cálculo.",
      },
    ],
  },
];

const planItems = [
  "Simulado diagnóstico e simulados",
  "Análise de desempenho",
  "Banco de questões com a fonte indicada",
  "Treino de alta prioridade",
  "Plano semanal de estudos",
  "Correção de redação",
  "Painel de desempenho e revisão de erros",
  "Novos lotes de questões até a prova",
];

function buildFaqs() {
  return [
    {
      question: "A plataforma garante uma nota específica?",
      answer:
        "Não. O Pontua Enem organiza prioridades, treino e acompanhamento da evolução, mas não garante nota, aprovação ou previsão exata da prova.",
    },
    {
      question: "As questões são oficiais do ENEM?",
      answer:
        "A maior parte vem das provas oficiais do ENEM de 2020 a 2025, revisadas uma a uma; o restante são questões autorais escritas no mesmo padrão de cobrança. Cada questão mostra a sua fonte, então você sempre sabe o que está resolvendo. Novos lotes entram conforme a revisão editorial avança, sem quantidade fixa por semana.",
    },
    {
      question: "Como funcionam o acesso e o pagamento?",
      answer: `${LANDING_ACCESS_COPY} Não há mensalidade nem renovação automática. Depois da confirmação do pagamento, o dashboard é liberado na sua conta.`,
    },
    {
      question: "Como funciona a análise de desempenho?",
      answer:
        "A análise de desempenho não prevê a prova. Ela considera em conjunto a frequência histórica dos assuntos no ENEM, seus acertos e seus erros para indicar prioridades de estudo e pontos com maior potencial de evolução.",
    },
    {
      question: "Como funcionam a correção de redação e os créditos?",
      answer:
        "Você pode enviar uma redação digitada ou manuscrita, por foto ou PDF. O acesso inclui 50 créditos para recursos de inteligência artificial, como correção de redação. A quantidade necessária é informada antes de cada confirmação. Caso os 50 créditos terminem, créditos adicionais podem ser comprados separadamente em recargas opcionais pagas.",
    },
    {
      question: "O Pontua Enem funciona no celular e substitui um cursinho?",
      answer:
        "Funciona no celular, tablet e computador. Um cursinho ele não substitui necessariamente — complementa a preparação com prioridades personalizadas, banco de questões, simulados, análise de desempenho, plano de estudos e correção de redação.",
    },
    {
      question: "O Pontua Enem tem vínculo oficial com Inep ou MEC?",
      answer:
        "Não. O Pontua Enem não possui vínculo oficial com o Inep, com o MEC ou com os organizadores do ENEM. As prioridades indicadas são estimativas educacionais e não representam previsão da prova.",
    },
  ];
}

export default async function HomePage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);
  const cta = getProductCta();
  const accessUntil = LANDING_ACCESS_UNTIL_LABEL;
  const faqs = buildFaqs();

  return (
    <main>
      {/* Hero */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.95fr] lg:gap-14 lg:px-8 lg:py-24">
          <div>
            <p className="animate-rise text-xs font-semibold uppercase tracking-widest text-blue-700">
              Preparação estratégica para o ENEM {ENEM_YEAR}
            </p>
            <h1
              className="animate-rise mt-5 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl md:text-6xl"
              style={{ "--rise-delay": "70ms" } as React.CSSProperties}
            >
              Um novo jeito de estudar. Descubra{" "}
              <span className="highlight">o que priorizar</span>.
            </h1>
            <p
              className="animate-rise mt-6 max-w-lg text-lg leading-8 text-slate-600"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              O Pontua Enem analisa seu desempenho, mostra onde você perde
              pontos e transforma isso em uma rotina semanal de estudos.
            </p>
            <div
              className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row"
              style={{ "--rise-delay": "210ms" } as React.CSSProperties}
            >
              <Link
                href={cta.href}
                className={buttonClasses({ variant: "primary", size: "lg" })}
              >
                {cta.label}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="#como-funciona"
                className={buttonClasses({ variant: "outline", size: "lg" })}
              >
                Ver como funciona
              </Link>
            </div>
            <ul
              className="animate-rise mt-10 space-y-2.5"
              style={{ "--rise-delay": "280ms" } as React.CSSProperties}
            >
              {[
                "Prioridades baseadas no seu desempenho real.",
                LANDING_ACCESS_COPY,
                "Redação digitada ou manuscrita, enviada por foto ou PDF.",
              ].map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 text-sm font-medium leading-6 text-slate-700"
                >
                  <Check className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="animate-rise"
            style={{ "--rise-delay": "180ms" } as React.CSSProperties}
          >
            <HeroPanel />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-9 sm:py-11">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid gap-y-8 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0">
              <dl className="contents">
                {landingStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-slate-100 lg:border-l lg:pl-7 lg:first:border-l-0 lg:first:pl-0"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {stat.label}
                    </dt>
                    <dd className="tnum mt-2 font-display text-4xl font-semibold leading-none text-slate-950">
                      {stat.value}
                    </dd>
                    <p className="mt-3 max-w-52 text-sm leading-6 text-slate-500">
                      {stat.detail}
                    </p>
                  </div>
                ))}
              </dl>
              <div className="border-slate-100 lg:border-l lg:pl-7">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {bankUpdateNote.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-7 text-slate-950">
                  {bankUpdateNote.title}
                </h3>
                <p className="mt-3 max-w-56 text-sm leading-6 text-slate-500">
                  {bankUpdateNote.description}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* O problema */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <Reveal className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              O problema
            </p>
            <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
              Esforço sem prioridade{" "}
              <span className="highlight">não resulta em nota para aprovação</span>.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              O ENEM exige repertório, leitura e constância, mas estudar sem uma
              estratégia faz você gastar energia justamente nos conteúdos de
              menor impacto. Alguns padrões se repetem todos os anos:
            </p>
          </Reveal>
          <ol className="lg:mt-2">
            {problemItems.map((item, index) => (
              <Reveal key={item} delay={index * 70}>
                <li className="flex items-start gap-5 border-b border-slate-100 py-5 first:pt-0 last:border-b-0">
                  <span className="tnum text-sm font-semibold text-slate-300">
                    0{index + 1}
                  </span>
                  <p className="text-lg font-medium leading-7 text-slate-800">{item}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Como funciona — banda escura */}
      <section id="como-funciona" className="bg-slate-950 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Como funciona
            </p>
            <h2 className={`mt-4 ${sectionHeadingClass}`}>
              Da dúvida ao plano semanal em quatro etapas.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 80}>
                <div className="relative h-full border-t border-white/15 pt-6 lg:after:absolute lg:after:left-[calc(100%+0.75rem)] lg:after:top-6 lg:after:h-px lg:after:w-6 lg:after:bg-white/15 lg:last:after:hidden">
                  <span
                    className="absolute -top-px left-0 h-px w-12 bg-blue-500"
                    aria-hidden="true"
                  />
                  <span className="tnum font-display text-3xl font-semibold text-blue-400">
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Desempenho */}
      <section id="desempenho" className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                Desempenho
              </p>
              <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
                Suas prioridades, visíveis por área e assunto.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                A análise leva em conta a frequência histórica dos assuntos no ENEM,
                o seu desempenho para mostrar onde existe maior potencial de
                ganho de pontos.
              </p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {performanceDemo.map((group, groupIndex) => (
                <Reveal
                  key={group.area}
                  delay={groupIndex * 90}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
                >
                  <h3 className="mb-4 text-lg font-bold text-slate-950">{group.area}</h3>
                  <div className="space-y-2.5">
                    {group.items.map((item) => (
                      <div
                        key={item.topic}
                        className="rounded-lg bg-slate-50 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-sm font-semibold text-slate-800">
                              {item.topic}
                            </span>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {item.reason}
                            </p>
                          </div>
                          <Badge
                            tone={
                              item.priority.includes("máxima")
                                ? "red"
                                : item.priority.includes("alta")
                                  ? "amber"
                                  : "blue"
                            }
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-inset ring-slate-200">
                            Acerto {item.accuracy}
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-inset ring-slate-200">
                            {item.recurrence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <Reveal className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                Redação e produto real
              </p>
              <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
                Envie redações e acompanhe tudo no mesmo painel.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Redação, plano semanal, questões e créditos ficam integrados no
                mesmo lugar — sem planilha paralela para se organizar.
              </p>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Correção de redação",
                  icon: FileText,
                  lines: [
                    "Redação digitada ou manuscrita, enviada por foto ou PDF",
                    "Status: aguardando, em análise ou concluída",
                    "Uso de créditos informado antes da confirmação",
                  ],
                },
                {
                  title: "Plano semanal",
                  icon: Route,
                  lines: [
                    "Atividades por data",
                    "Meta de questões por tópico",
                    "Progresso da semana",
                  ],
                },
                {
                  title: "Banco de questões revisado",
                  icon: BookOpenCheck,
                  lines: [
                    "Filtros por área, assunto, dificuldade e prioridade",
                    "Fonte indicada em cada questão",
                    "Novos lotes conforme a revisão avança",
                    "Revisão de erros integrada",
                  ],
                },
                {
                  title: "Histórico e créditos",
                  icon: Coins,
                  lines: [
                    "Saldo atual na conta",
                    "Consumo registrado no histórico",
                    "Redações recentes vinculadas ao saldo",
                  ],
                },
              ].map((item, index) => (
                <Reveal
                  key={item.title}
                  delay={index * 60}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-inset ring-slate-200">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-slate-950">{item.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {item.lines.map((line) => (
                      <li key={line} className="flex gap-2 text-sm leading-6 text-slate-600">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* O que você recebe */}
      <section className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              O que você recebe
            </p>
            <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
              Tudo para decidir o{" "}
              <span className="highlight">próximo passo nos estudos</span>.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-16 md:grid-cols-2">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 2) * 80 + Math.floor(index / 2) * 50}>
                <div className="flex gap-5 border-b border-slate-100 py-7">
                  <feature.icon
                    className="mt-1 h-6 w-6 shrink-0 text-blue-700"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Transparência */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Transparência
            </p>
            <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
              O que o Pontua Enem{" "}
              <span className="highlight">não promete</span>.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Você decide melhor sabendo os limites antes de pagar. Estas são as
              linhas que não cruzamos:
            </p>
          </Reveal>
          <div className="mt-10 grid gap-x-16 md:grid-cols-2">
            {transparencyItems.map((item, index) => (
              <Reveal
                key={item.title}
                delay={(index % 2) * 80 + Math.floor(index / 2) * 50}
              >
                <div className="border-b border-slate-100 py-6">
                  <h3 className="text-base font-bold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="precos" className="scroll-mt-24 bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Acesso
            </p>
            <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
              Pagamento único para acesso até {accessUntil}.
            </h2>
          </Reveal>
          <Reveal
            delay={100}
            className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
          >
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center bg-slate-950 p-6 text-white sm:p-10">
                <p className="text-sm font-semibold text-blue-300">{PRODUCT_NAME}</p>
                <p className="tnum mt-4 font-display text-5xl font-semibold tracking-tight lg:text-6xl">
                  {formatCurrency(price)}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Pagamento único — sem mensalidade nem renovação automática",
                    `Acesso válido até ${accessUntil}`,
                    "50 créditos de IA incluídos — recargas extras pagas à parte",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm leading-6 text-slate-200"
                    >
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-blue-300"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={cta.href}
                  className={buttonClasses({
                    variant: "primary",
                    size: "lg",
                    full: true,
                    className: "mt-8",
                  })}
                >
                  {cta.label}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
              <div className="p-6 sm:p-10">
                <p className="text-sm font-semibold text-slate-500">Incluído no acesso</p>
                <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {planItems.map((item) => (
                    <div key={item} className="flex gap-3">
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium leading-6 text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-6 text-slate-500">
                  O acesso inclui 50 créditos usados em recursos de inteligência
                  artificial, como a correção de redação. O custo é informado
                  antes de cada confirmação. Se quiser usar mais após os 50
                  créditos, é possível comprar recargas opcionais pagas — detalhes
                  nas perguntas frequentes.
                </p>
              </div>
            </div>
          </Reveal>
          <p className="mt-8 text-center text-sm leading-6 text-slate-500">
            Reembolso conforme a{" "}
            <Link href="/reembolso" className="underline underline-offset-2 hover:text-slate-700">
              política de reembolso
            </Link>
            . O Pontua Enem não possui vínculo oficial com o Inep, com o MEC ou
            com os organizadores do ENEM. As prioridades indicadas são
            estimativas educacionais e não representam previsão da prova.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Perguntas frequentes
            </p>
            <h2 className={`mt-4 text-slate-950 ${sectionHeadingClass}`}>
              O que perguntam antes de comprar
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-12 divide-y divide-slate-100 border-y border-slate-100">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-slate-950 transition-colors hover:text-blue-800 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-5 pr-9 text-sm leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-slate-950 py-16 text-white sm:py-24">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className={`${sectionHeadingClass} md:text-5xl`}>
            A prova já tem data marcada. Seu plano de estudos{" "}
            <span className="highlight text-slate-950">também precisa ter</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Comece pelo simulado diagnóstico e chegue ao ENEM {ENEM_YEAR}{" "}
            sabendo exatamente onde concentrar cada hora de estudo.
          </p>
          <Link
            href={cta.href}
            className={buttonClasses({
              variant: "primary",
              size: "lg",
              className: "mt-9",
            })}
          >
            {cta.label}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
