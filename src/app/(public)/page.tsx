import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Radar,
  Route,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import { HeroPanel } from "@/components/marketing/hero-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";

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
    title: "Veja seus pontos fracos",
    description:
      "Descubra em quais assuntos sua taxa de acerto está abaixo do necessário para a nota que você quer.",
  },
  {
    title: "Cruze peso e dificuldade",
    description:
      "O Radar prioriza o que mais cai na prova e mais trava a sua nota — nessa ordem.",
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
      "Questões no estilo ENEM organizadas por assunto, dificuldade e prioridade de estudo.",
    icon: BookOpenCheck,
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
      ["Razão e proporção", "Prioridade máxima"],
      ["Estatística", "Prioridade alta"],
      ["Geometria plana", "Prioridade alta"],
      ["Funções", "Prioridade média"],
    ],
  },
  {
    area: "Ciências da Natureza",
    items: [
      ["Ecologia", "Prioridade máxima"],
      ["Eletricidade", "Prioridade alta"],
      ["Estequiometria", "Prioridade alta"],
      ["Termologia", "Prioridade média"],
    ],
  },
];

const planItems = [
  "Acesso completo até o ENEM 2026",
  "Diagnóstico personalizado",
  "Banco de questões",
  "Radar ENEM",
  "Treino de alta prioridade",
  "Simulados",
  "Plano semanal de estudos",
  "Painel de desempenho",
  "Revisão de erros",
  "Atualizações até a prova",
];

const faqs = [
  {
    question: "A plataforma garante uma nota específica?",
    answer:
      "Não. A NexoENEM organiza suas prioridades e acompanha sua evolução — quem faz a nota é você. Desconfie de quem promete nota garantida.",
  },
  {
    question: "As questões são oficiais do ENEM?",
    answer:
      "As questões são autorais, criadas no formato e no nível da prova, e organizadas pelos assuntos que mais caem no ENEM.",
  },
  {
    question: "O pagamento é mensal?",
    answer:
      "Não. O acesso é comprado uma única vez, sem mensalidade e sem renovação automática.",
  },
  {
    question: "Por quanto tempo tenho acesso?",
    answer: "Da compra até a prova do ENEM 2026, com todas as atualizações incluídas.",
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
];

export default async function HomePage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);

  return (
    <main>
      {/* Hero */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Preparação estratégica para o ENEM 2026
            </p>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-semibold leading-[1.08] tracking-tight text-slate-950 md:text-6xl">
              Pare de estudar no escuro. Descubra{" "}
              <span className="highlight">o que estudar</span> para subir sua
              nota.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Faça um diagnóstico, encontre seus maiores gargalos e siga uma
              rota semanal com os conteúdos que mais valem pontos para você.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/checkout"
                className={buttonClasses({ variant: "primary", size: "lg" })}
              >
                Comprar acesso
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="#como-funciona"
                className={buttonClasses({ variant: "outline", size: "lg" })}
              >
                Ver como funciona
              </Link>
            </div>
            <ul className="mt-10 space-y-2.5">
              {[
                "Sem promessa de nota garantida — com método para evoluir",
                "Prioridades baseadas no seu desempenho real",
                "Pagamento único, acesso até a prova",
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
          <HeroPanel />
        </div>
      </section>

      {/* O problema */}
      <section className="border-t border-slate-100 bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="max-w-md">
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
          </div>
          <ol className="lg:mt-2">
            {problemItems.map((item, index) => (
              <li
                key={item}
                className="flex items-start gap-5 border-b border-slate-100 py-5 first:pt-0 last:border-b-0"
              >
                <span className="tnum text-sm font-semibold text-slate-300">
                  0{index + 1}
                </span>
                <p className="text-lg font-medium leading-7 text-slate-800">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Como funciona — banda escura */}
      <section id="como-funciona" className="bg-slate-950 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Como funciona
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight">
              Da dúvida ao plano semanal em quatro etapas.
            </h2>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative border-t border-white/15 pt-6">
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
            ))}
          </div>
        </div>
      </section>

      {/* Radar */}
      <section id="radar" className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="max-w-md">
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
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {radarDemo.map((group) => (
                <div
                  key={group.area}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
                >
                  <h3 className="mb-4 text-lg font-bold text-slate-950">{group.area}</h3>
                  <div className="space-y-2.5">
                    {group.items.map(([topic, priority]) => (
                      <div
                        key={topic}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3"
                      >
                        <span className="text-sm font-semibold text-slate-800">
                          {topic}
                        </span>
                        <Badge
                          tone={
                            priority.includes("máxima")
                              ? "red"
                              : priority.includes("alta")
                                ? "amber"
                                : "blue"
                          }
                        >
                          {priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* O que você recebe */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              O que você recebe
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Tudo para decidir o{" "}
              <span className="highlight">próximo melhor estudo</span>.
            </h2>
          </div>
          <div className="mt-12 grid gap-x-16 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-5 border-b border-slate-100 py-7"
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="precos" className="bg-paper py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Acesso
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Um pagamento. Acesso até a prova.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Sem mensalidade, sem renovação automática e sem venda casada de
              cursinho.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center bg-slate-950 p-10 text-white">
                <p className="text-sm font-semibold text-blue-300">NexoENEM Completo</p>
                <p className="tnum mt-4 font-display text-6xl font-semibold tracking-tight">
                  {formatCurrency(price)}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Pagamento único. Acesso completo até o ENEM 2026.
                </p>
                <Link
                  href="/checkout"
                  className={buttonClasses({
                    variant: "primary",
                    size: "lg",
                    full: true,
                    className: "mt-8",
                  })}
                >
                  Comprar acesso
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
              </div>
            </div>
          </div>
          {!product.launch_ready ? (
            <Notice tone="warning" className="mt-6">
              As vendas ainda não estão abertas. Estamos finalizando os últimos
              detalhes da plataforma para o lançamento.
            </Notice>
          ) : null}
          <p className="mt-8 text-center text-sm leading-6 text-slate-500">
            Reembolso conforme a{" "}
            <Link href="/reembolso" className="underline underline-offset-2 hover:text-slate-700">
              política de reembolso
            </Link>
            . A NexoENEM não possui vínculo com o MEC ou com o Inep e não
            promete nota, aprovação ou previsão exata da prova.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Perguntas frequentes
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-slate-950">
              Transparência antes de promessa.
            </h2>
          </div>
          <div className="mt-12 divide-y divide-slate-100 border-y border-slate-100">
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
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            A prova tem data marcada. Seu plano de estudos{" "}
            <span className="highlight text-slate-950">também deveria ter</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Comece pelo diagnóstico hoje e chegue no ENEM 2026 sabendo
            exatamente onde investiu cada hora de estudo.
          </p>
          <Link
            href="/checkout"
            className={buttonClasses({
              variant: "primary",
              size: "lg",
              className: "mt-9",
            })}
          >
            Comprar acesso
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
