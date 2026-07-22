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
  ESSAY_ACCEPTED_FILE_LABEL,
  ESSAY_CREDIT_COST_LABEL,
  PRODUCT_NAME,
  formatAccessDate,
} from "@/lib/product-config";

const problemItems = [
  "Estudar assuntos aleatórios, sem saber o que pesa mais na prova.",
  "Resolver questões no volume, sem estratégia de priorização.",
  "Não saber em quais assuntos os pontos estão sendo perdidos.",
  "Gastar semanas em conteúdos de baixa prioridade.",
  "Chegar perto da prova sem saber se evoluiu de verdade.",
];

const steps = [
  {
    title: "Faça o diagnóstico",
    description:
      "Informe seu objetivo e rotina e resolva uma trilha inicial de questões que mapeia seu ponto de partida.",
  },
  {
    title: "Identifique onde perde pontos",
    description:
      "Descubra em quais assuntos sua taxa de acerto está abaixo do necessário para a nota que você quer.",
  },
  {
    title: "Cruze desempenho, recorrência e prioridade",
    description:
      "O Radar combina seus erros, a recorrência dos assuntos e a prioridade de estudo para ordenar o que vem primeiro.",
  },
  {
    title: "Siga sua rota semanal",
    description:
      "Receba um plano com as questões certas, na ordem certa, recalculado toda semana conforme você avança.",
  },
];

const features = [
  {
    title: "Radar ENEM",
    description:
      "Prioridades por área e assunto, cruzando a recorrência histórica dos temas com o seu desempenho.",
    icon: Radar,
  },
  {
    title: "Simulado diagnóstico",
    description:
      "Uma trilha inicial de questões que mapeia seu ponto de partida em cada área da prova.",
    icon: ClipboardCheck,
  },
  {
    title: "Banco de questões",
    description:
      "Questões organizadas por assunto, dificuldade, fonte e prioridade de estudo.",
    icon: BookOpenCheck,
  },
  {
    title: "Correção de redação",
    description:
      "Envie digitada, por foto ou PDF e acompanhe o andamento da correção pela plataforma.",
    icon: FileText,
  },
  {
    title: "Plano semanal",
    description:
      "Uma rota de estudo objetiva para cada semana, recalculada conforme você avança.",
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
      "Suas questões erradas voltam no momento certo para transformar erro em ponto.",
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
        recurrence: "Alta recorrência",
        reason: "Alta recorrência e taxa de acerto abaixo do seu objetivo.",
      },
      {
        topic: "Estatística",
        priority: "Prioridade alta",
        accuracy: "54%",
        recurrence: "Alta recorrência",
        reason: "Aparece com frequência e ainda gera perda de pontos.",
      },
      {
        topic: "Geometria plana",
        priority: "Prioridade alta",
        accuracy: "49%",
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
        accuracy: "57%",
        recurrence: "Alta recorrência",
        reason: "Conteúdo recorrente com espaço claro para consolidar acertos.",
      },
      {
        topic: "Eletricidade",
        priority: "Prioridade alta",
        accuracy: "48%",
        recurrence: "Recorrente",
        reason: "Erros recentes indicam revisão antes de avançar.",
      },
      {
        topic: "Estequiometria",
        priority: "Prioridade alta",
        accuracy: "51%",
        recurrence: "Recorrente",
        reason: "Base importante para questões de Química com cálculo.",
      },
    ],
  },
];

const planItems = [
  `Acesso completo até o ENEM ${ENEM_YEAR}`,
  "Diagnóstico personalizado",
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

function buildFaqs(product: { access_valid_until: string }) {
  const accessUntil = formatAccessDate(product.access_valid_until);

  return [
  {
    question: "A plataforma garante uma nota específica?",
    answer:
      "Não. A Pontua Enem organiza suas prioridades e acompanha sua evolução — quem faz a nota é você. Desconfie de quem promete nota garantida.",
  },
  {
    question: "As questões são oficiais do ENEM?",
    answer:
      "O banco pode combinar questões antigas do ENEM, sempre identificadas pela fonte, com questões autorais ou demonstrativas quando usadas. Antes da abertura comercial, o conteúdo passa por revisão editorial e jurídica.",
  },
  {
    question: "O pagamento é mensal?",
    answer:
      "Não. O acesso é comprado uma única vez, sem mensalidade e sem renovação automática.",
  },
  {
    question: "Por quanto tempo tenho acesso?",
    answer: `Da compra até ${accessUntil}, conforme a data configurada para o produto, com atualizações incluídas nesse período.`,
  },
  {
    question: "Como funciona a análise de desempenho?",
    answer:
      "A plataforma cruza seus acertos e erros com a recorrência histórica de cada assunto para indicar onde estudar rende mais pontos.",
  },
  {
    question: "O Radar ENEM prevê o que vai cair?",
    answer:
      "Não. O Radar mostra os assuntos que historicamente mais aparecem na prova e como você está em cada um. É priorização, não adivinhação.",
  },
  {
    question: "Como funciona a correção de redação?",
    answer:
      "Você envia a redação digitada, por foto ou PDF, acompanha o status pela plataforma e acessa a correção quando ela for disponibilizada.",
  },
  {
    question: "Posso enviar a redação por foto ou PDF?",
    answer: `Sim. A página de redação aceita ${ESSAY_ACCEPTED_FILE_LABEL}, dentro dos limites atuais de envio da plataforma.`,
  },
  {
    question: "A correção de redação é instantânea?",
    answer:
      "Não. A redação fica com status de acompanhamento na plataforma até a correção ser disponibilizada.",
  },
  {
    question: "Como funcionam os créditos?",
    answer:
      "O acesso principal é adquirido uma vez. Algumas funcionalidades, como o envio de redações para correção, usam créditos internos; o saldo e o histórico ficam disponíveis na conta.",
  },
  {
    question: "A correção de redação está incluída no acesso?",
    answer: `A funcionalidade está disponível dentro da plataforma, mas cada submissão confirmada consome ${ESSAY_CREDIT_COST_LABEL}.`,
  },
  {
    question: "Posso comprar mais créditos?",
    answer:
      "Créditos adicionais poderão ser adquiridos quando essa opção estiver habilitada. Enquanto isso, a plataforma mostra saldo e histórico sem liberar compra avulsa.",
  },
  {
    question: "A plataforma funciona pelo celular?",
    answer:
      "Sim. As telas principais são responsivas para celular, tablet, notebook e desktop.",
  },
  {
    question: "A Pontua Enem substitui um cursinho?",
    answer:
      "Não necessariamente. A Pontua Enem organiza prioridade, treino, desempenho, simulados e redação; ela pode complementar uma rotina de estudo ou cursinho.",
  },
  {
    question: "Como compro o acesso?",
    answer:
      "Crie ou entre na sua conta e siga para a página de checkout. Depois da confirmação do pagamento, o acesso ao dashboard é liberado na própria conta.",
  },
  ];
}

export default async function HomePage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);
  const cta = getProductCta();
  const accessUntil = formatAccessDate(product.access_valid_until);
  const faqs = buildFaqs(product);

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
              Pare de estudar no escuro. Saiba{" "}
              <span className="highlight">o que estudar primeiro</span>.
            </h1>
            <p
              className="animate-rise mt-6 max-w-lg text-lg leading-8 text-slate-600"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              A Pontua Enem analisa seu desempenho, cruza erros, recorrência dos
              conteúdos e prioridade, e transforma isso em uma rota semanal com
              banco de questões, simulados e correção de redação.
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
                "Sem promessa de nota garantida — com método para evoluir",
                "Prioridades baseadas no seu desempenho real",
                `Pagamento único, acesso até ${accessUntil}`,
                "Redação digitada, por foto ou PDF",
              ].map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-sm font-medium text-slate-700"
                >
                  <Check className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
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
              A Pontua Enem cruza seu desempenho, a recorrência dos assuntos e a
              prioridade de estudo para mostrar o que estudar primeiro.
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
              Esforço sem prioridade <span className="highlight">não vira nota</span>.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              O ENEM exige repertório, leitura e constância — mas estudar sem
              mapa faz você gastar energia exatamente onde o impacto é menor. Os
              padrões se repetem todo ano:
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
                O Radar cruza a recorrência histórica dos temas com o seu
                desempenho para mostrar onde existe maior potencial de ganho de
                nota.
              </p>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                As prioridades são estimativas educacionais para organizar seu
                estudo — nenhuma plataforma prevê a prova, e quem promete isso
                não está sendo honesto com você.
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
                Envie sua redação digitada, por foto ou PDF e acompanhe a
                correção dentro da plataforma. O histórico fica junto do seu
                plano, banco de questões, Radar e desempenho.
              </p>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Correção de redação",
                  icon: FileText,
                  lines: [
                    "Envio digitado, por foto ou PDF",
                    "Status: aguardando, em análise ou concluída",
                    `Custo por submissão: ${ESSAY_CREDIT_COST_LABEL}`,
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
                  title: "Banco de questões",
                  icon: BookOpenCheck,
                  lines: [
                    "Filtro por área, assunto e prioridade",
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
              <span className="highlight">próximo melhor estudo</span>.
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
      <section id="precos" className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Acesso
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Um pagamento. Acesso até {accessUntil}.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Sem mensalidade, sem renovação automática. Funcionalidades
              específicas podem consumir créditos internos.
            </p>
          </Reveal>
          <Reveal
            delay={100}
            className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
          >
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center bg-slate-950 p-10 text-white">
                <p className="text-sm font-semibold text-blue-300">{PRODUCT_NAME}</p>
                <p className="tnum mt-4 font-display text-6xl font-semibold tracking-tight">
                  {formatCurrency(price)}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Pagamento único. Acesso completo até {accessUntil}.
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
              <div className="p-10">
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
                  <p className="font-semibold">Como entram os créditos</p>
                  <p className="mt-1">
                    O acesso principal é adquirido uma vez. Envios de redação
                    para correção usam {ESSAY_CREDIT_COST_LABEL} por submissão
                    confirmada. Saldo e histórico ficam disponíveis na conta;
                    créditos adicionais poderão ser adquiridos quando essa
                    opção estiver habilitada.
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
            . A Pontua Enem não possui vínculo com o MEC ou com o Inep e não
            promete nota, aprovação ou previsão exata da prova.
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
              Transparência antes de promessa.
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
            A prova tem data marcada. Seu plano de estudos{" "}
            <span className="highlight text-slate-950">também deveria ter</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Comece pelo diagnóstico hoje e chegue no ENEM {ENEM_YEAR} sabendo
            exatamente onde investiu cada hora de estudo.
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
