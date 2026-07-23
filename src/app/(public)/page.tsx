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

const LANDING_ACCESS_UNTIL_LABEL = "01 de dezembro de 2026";
const LANDING_ACCESS_COPY =
  "Pagamento único para acesso até 01 de dezembro de 2026.";

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
    title: "Cruze desempenho, frequência e relevância",
    description:
      "O Radar combina seus erros, a frequência dos assuntos no ENEM e o potencial de ganho para definir a ordem dos seus estudos.",
  },
  {
    title: "Siga sua rotina semanal",
    description:
      "Receba um plano com as atividades e questões certas, recalculado semanalmente conforme seu desempenho.",
  },
];

const features = [
  {
    title: "Radar ENEM",
    description:
      "Prioridades por área e assunto, cruzando a frequência histórica dos temas com o seu desempenho.",
    icon: Radar,
  },
  {
    title: "Simulado diagnóstico",
    description:
      "Uma sequência inicial de questões que identifica seu ponto de partida em cada área da prova.",
    icon: ClipboardCheck,
  },
  {
    title: "Banco de questões atualizado",
    description:
      "Questões organizadas por área, assunto, dificuldade e prioridade, com novas questões adicionadas semanalmente e fonte identificada quando aplicável.",
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

const radarDemo = [
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
  `Acesso completo até ${LANDING_ACCESS_UNTIL_LABEL}`,
  "Simulado diagnóstico",
  "Banco de questões com fonte identificada",
  "Radar ENEM",
  "Treino de alta prioridade",
  "Simulados",
  "Plano semanal de estudos",
  "Correção de redação com uso de créditos",
  "Saldo e histórico de créditos",
  "Painel de desempenho",
  "Revisão de erros",
  "Atualizações até a prova",
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
        "O banco reúne questões organizadas por área, assunto, dificuldade e prioridade. Novas questões são adicionadas semanalmente, com fonte identificada quando aplicável. Questões oficiais, autorais ou demonstrativas são sinalizadas conforme a origem.",
    },
    {
      question: "Como funcionam o acesso e o pagamento?",
      answer: `${LANDING_ACCESS_COPY} Não há mensalidade nem renovação automática. Depois da confirmação do pagamento, o dashboard é liberado na sua conta.`,
    },
    {
      question: "Como funcionam o Radar ENEM e a análise de desempenho?",
      answer:
        "O Radar ENEM não prevê a prova. Ele cruza a frequência histórica dos assuntos no ENEM com seus acertos e erros para indicar prioridades de estudo e pontos com maior potencial de evolução.",
    },
    {
      question: "Como funcionam a correção de redação e os créditos?",
      answer:
        "Você pode enviar uma redação digitada ou manuscrita, por foto ou PDF. A correção utiliza créditos da conta, e a quantidade necessária é informada antes da confirmação. O acesso inclui 50 créditos para funcionalidades de inteligência artificial. Caso esses créditos terminem, créditos adicionais poderão ser adquiridos separadamente.",
    },
    {
      question: "O Pontua Enem funciona no celular e substitui um cursinho?",
      answer:
        "Sim. As telas principais são responsivas para celular, tablet, notebook e desktop. O Pontua Enem não substitui necessariamente um cursinho, mas complementa a preparação com prioridades personalizadas, banco de questões, simulados, análise de desempenho, plano de estudos e correção de redação.",
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
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="animate-rise text-xs font-semibold uppercase tracking-widest text-blue-700">
              Preparação estratégica para o ENEM {ENEM_YEAR}
            </p>
            <h1
              className="animate-rise mt-5 max-w-xl font-display text-5xl font-semibold leading-[1.08] tracking-tight text-slate-950 md:text-6xl"
              style={{ "--rise-delay": "70ms" } as React.CSSProperties}
            >
              Pare de estudar no escuro. Descubra{" "}
              <span className="highlight">o&nbsp;que&nbsp;priorizar</span>.
            </h1>
            <p
              className="animate-rise mt-6 max-w-lg text-lg leading-8 text-slate-600"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              O Pontua Enem analisa seu desempenho, identifica os assuntos em
              que você mais perde pontos e transforma esses dados em uma rotina
              semanal de estudos com banco de questões, simulados e correção de
              redação.
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
                "Sem promessa de nota garantida — com método para evoluir.",
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

      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-lg font-semibold leading-8 text-slate-950">
              O Pontua Enem cruza seu desempenho com a frequência dos assuntos
              no ENEM para indicar o que deve ser priorizado nos estudos.
            </p>
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
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
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
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight">
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

      {/* Radar */}
      <section id="radar" className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                Radar ENEM
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
                Suas prioridades, visíveis por área e assunto.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                O Radar cruza a frequência histórica dos assuntos no ENEM com o
                seu desempenho para mostrar onde existe maior potencial de ganho
                de pontos.
              </p>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                As prioridades são estimativas educacionais criadas para
                organizar seus estudos. Nenhuma plataforma pode prever com
                exatidão o conteúdo da prova.
              </p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-2">
              {radarDemo.map((group, groupIndex) => (
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
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
                Envie redações e acompanhe tudo no mesmo painel.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Envie sua redação digitada ou manuscrita, por foto ou PDF, e
                acompanhe a correção pela plataforma. O histórico fica integrado
                ao seu plano semanal, ao banco de questões, ao Radar ENEM e ao
                painel de desempenho.
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
                  title: "Banco de questões atualizado",
                  icon: BookOpenCheck,
                  lines: [
                    "Filtros por área, assunto, dificuldade e prioridade",
                    "Novas questões adicionadas semanalmente",
                    "Fonte identificada quando aplicável",
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
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
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

      {/* Preço */}
      <section id="precos" className="scroll-mt-24 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Acesso
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Pagamento único. Acesso até {accessUntil}.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Algumas funcionalidades de inteligência artificial utilizam
              créditos. A quantidade necessária é sempre informada antes da
              confirmação.
            </p>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-800">
              O acesso inclui 50 créditos. Créditos adicionais podem ser
              adquiridos separadamente quando necessário.
            </p>
          </Reveal>
          <Reveal
            delay={100}
            className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
          >
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center bg-slate-950 p-6 text-white sm:p-10">
                <p className="text-sm font-semibold text-blue-300">{PRODUCT_NAME}</p>
                <p className="tnum mt-4 flex items-start font-display text-6xl font-semibold tracking-tight">
                  <span>{formatCurrency(price)}</span>
                  <sup
                    className="ml-1 mt-1 text-2xl leading-none text-blue-300"
                    aria-label="Consulte as condições do acesso"
                  >
                    *
                  </sup>
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Inclui 50 créditos para recursos de inteligência artificial.
                </p>
                <p className="mt-6 rounded-lg border border-white/15 bg-white/10 p-4 text-sm leading-6 text-slate-100">
                  <span className="font-semibold text-blue-200" aria-hidden="true">
                    *
                  </span>{" "}
                  Pagamento único, sem mensalidade ou renovação automática. O
                  acesso é válido até {accessUntil}. O plano inclui 50 créditos
                  de inteligência artificial. Caso esses créditos terminem,
                  créditos adicionais poderão ser adquiridos separadamente.
                </p>
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
                <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
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
                <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  <p className="font-semibold">Como funcionam os créditos</p>
                  <p className="mt-1">
                    O acesso inclui 50 créditos para funcionalidades de
                    inteligência artificial, como correção de redação,
                    explicação de questões, análise de desempenho e plano de
                    estudos inteligente. Cada funcionalidade utiliza uma
                    quantidade específica de créditos, sempre informada antes da
                    confirmação. O saldo e o histórico de uso ficam disponíveis
                    na conta. Quando os créditos incluídos terminarem, créditos
                    adicionais poderão ser adquiridos separadamente.
                  </p>
                </div>
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
      <section className="bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Perguntas frequentes
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Transparência antes de promessa
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
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            A prova já tem data marcada. Seu plano de estudos{" "}
            <span className="highlight text-slate-950">também precisa ter</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Comece pelo simulado diagnóstico e chegue ao ENEM {ENEM_YEAR}
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
