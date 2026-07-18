import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Check,
  ClipboardCheck,
  Clock,
  Gauge,
  Layers3,
  Radar,
  Route,
  SearchCheck,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { HeroPanel } from "@/components/marketing/hero-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { SectionHeader } from "@/components/ui/section-header";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";

const problemItems = [
  "estudam assuntos aleatórios",
  "resolvem questões sem estratégia",
  "não sabem onde estão perdendo pontos",
  "gastam tempo demais em conteúdos de baixa prioridade",
  "não acompanham sua evolução",
];

const steps = [
  {
    title: "Faça um diagnóstico",
    description: "Informe objetivo, rotina e resolva uma trilha inicial de questões.",
    icon: ClipboardCheck,
  },
  {
    title: "Descubra seus pontos fracos",
    description: "Veja onde sua taxa de acerto está abaixo do necessário.",
    icon: SearchCheck,
  },
  {
    title: "Cruze dificuldade e recorrência",
    description: "Priorize conteúdos que pesam mais na prova e travam sua evolução.",
    icon: Radar,
  },
  {
    title: "Receba uma rota estratégica",
    description: "Siga um plano semanal com questões certas, na ordem certa.",
    icon: Route,
  },
];

const features = [
  { title: "Radar de assuntos recorrentes", icon: Radar },
  { title: "Simulado diagnóstico", icon: ClipboardCheck },
  { title: "Banco de questões", icon: BookOpenCheck },
  { title: "Plano personalizado", icon: Route },
  { title: "Painel de evolução", icon: TrendingUp },
  { title: "Análise inteligente de desempenho", icon: Brain },
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
  "acesso completo ate o ENEM 2026",
  "diagnostico personalizado",
  "banco de questoes",
  "Radar ENEM",
  "questoes antigas priorizadas quando revisadas",
  "treino de alta prioridade",
  "simulados",
  "plano semanal",
  "painel de desempenho",
  "revisao de erros",
  "atualizacoes ate a prova",
];

const faqs = [
  {
    question: "A plataforma garante uma nota específica?",
    answer:
      "Não. A NexoENEM ajuda a organizar prioridades e acompanhar evolução, mas não promete nota garantida.",
  },
  {
    question: "As questões são oficiais?",
    answer:
      "Nesta primeira versão, as questões são demonstrativas e autorais. A estrutura está preparada para receber bancos licenciados ou fontes autorizadas no futuro.",
  },
  {
    question: "O pagamento é mensal?",
    answer:
      "Nao. O produto e pagamento unico, sem mensalidade e sem renovacao automatica.",
  },
  {
    question: "Por quanto tempo tenho acesso?",
    answer:
      "O produto ativo concede acesso ate a data configurada para o ENEM 2026.",
  },
  {
    question: "Como funciona a análise de desempenho?",
    answer:
      "O MVP cruza acertos, dificuldades informadas e prioridades demonstrativas por assunto para sugerir uma rota de estudo.",
  },
  {
    question: "A plataforma usa inteligência artificial?",
    answer:
      "Ainda não. O produto já reserva créditos para recursos inteligentes futuros, mas nenhuma API de IA está integrada agora.",
  },
  {
    question: "O Radar ENEM prevê exatamente o que vai cair?",
    answer:
      "Não. O Radar organiza estimativas educacionais por recorrência histórica e desempenho do aluno. Ele não prevê questões exatas.",
  },
];

export default async function HomePage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);

  return (
    <main>
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge tone="blue" className="mb-5 w-fit">
              Estratégia aplicada ao ENEM
            </Badge>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              Descubra o que estudar para aumentar sua nota no ENEM.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Analise seu desempenho, encontre seus maiores gargalos e receba
              uma rota personalizada com os conteúdos mais importantes para sua
              evolução.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Sem previsão exata", ShieldCheck],
                ["Sem nota garantida", Target],
                ["Com foco em evolução", TrendingUp],
              ].map(([label, Icon]) => {
                const TypedIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={String(label)} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                      <TypedIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {String(label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <HeroPanel />
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="O problema"
            title="Muito esforço ainda é desperdiçado por falta de prioridade."
            description="O ENEM exige repertório, leitura e constância, mas estudar sem mapa faz o aluno gastar energia onde o impacto é menor."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {problemItems.map((item) => (
              <Card key={item}>
                <CardContent>
                  <AlertCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                    Muitos alunos {item}.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            align="center"
            eyebrow="Como funciona"
            title="Da dúvida ao plano semanal em quatro etapas."
            description="O MVP já demonstra o fluxo completo, com dados simulados e arquitetura pronta para integrações reais."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Card key={step.title}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-700 text-white">
                      <step.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Diferenciais"
            title="Um SaaS acadêmico para decidir o próximo melhor estudo."
            description="A primeira versão foca em clareza, priorização e acompanhamento, sem prometer atalhos irreais."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent>
                  <feature.icon className="h-6 w-6 text-violet-600" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Estrutura visual pronta para evoluir com dados reais,
                    autenticação, pagamento e análises futuras.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="radar" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionHeader
                eyebrow="Radar ENEM"
                title="Prioridades visíveis por área, assunto e dificuldade."
                description="O Radar cruza recorrência demonstrativa com o desempenho do estudante para mostrar onde existe maior potencial de ganho."
              />
              <Notice tone="warning" className="mt-6">
                Dados demonstrativos nesta primeira versão. As prioridades não
                representam previsão exata da prova.
              </Notice>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {radarDemo.map((group) => (
                <Card key={group.area}>
                  <CardContent>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
                        <Gauge className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-950">{group.area}</h3>
                    </div>
                    <div className="space-y-3">
                      {group.items.map(([topic, priority]) => (
                        <div
                          key={topic}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3"
                        >
                          <span className="text-sm font-semibold text-slate-800">
                            {topic}
                          </span>
                          <Badge tone={priority.includes("máxima") ? "red" : priority.includes("alta") ? "violet" : "blue"}>
                            {priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="precos" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            align="center"
            eyebrow="Produto"
            title="NexoENEM Completo"
            description="Pagamento unico. Sem mensalidade. Acesso completo ate o ENEM 2026."
          />
          <Card className="mt-10 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-[0.85fr_1.15fr]">
                <div className="bg-slate-950 p-8 text-white">
                  <p className="text-sm font-semibold text-blue-200">NexoENEM Completo</p>
                  <p className="mt-3 text-4xl font-bold">{formatCurrency(price)}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Pagamento unico. Sem mensalidade. Acesso completo ate o ENEM 2026.
                  </p>
                  <Link
                    href="/checkout"
                    className={buttonClasses({
                      variant: "secondary",
                      size: "lg",
                      full: true,
                      className: "mt-6",
                    })}
                  >
                    Comprar acesso
                  </Link>
                </div>
                <div className="p-8">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {planItems.map((item) => (
                      <div key={item} className="flex gap-3">
                        <Check className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
                        <span className="text-sm font-medium leading-6 text-slate-700">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {!product.launch_ready ? (
            <Notice tone="warning" className="mt-6">
              Checkout real desativado enquanto launch_ready=false. As telas
              mostram a oferta preparada, mas a cobranca so deve ser ativada
              apos conteudo minimo, gateway, termos e testes estarem prontos.
            </Notice>
          ) : null}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent>
                <p className="text-sm font-bold text-slate-950">Garantia e reembolso</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Politica provisoria preparada para revisao juridica antes da
                  venda. O canal de solicitacao sera suporte@nexoenem.com.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm font-bold text-slate-950">Independencia</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  NexoENEM nao possui vinculo com MEC ou Inep e nao promete
                  nota, aprovacao ou previsao exata da prova.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            align="center"
            eyebrow="FAQ"
            title="Transparência antes de promessa."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent>
                  <h3 className="text-base font-bold text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Questões certas", Layers3],
              ["Ordem certa", Clock],
              ["Evolução acompanhada", BarChart3],
            ].map(([label, Icon]) => {
              const TypedIcon = Icon as typeof Layers3;
              return (
                <div
                  key={String(label)}
                  className="flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800"
                >
                  <TypedIcon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  {String(label)}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
