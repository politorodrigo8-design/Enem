import Link from "next/link";
import { ArrowRight, Coins, FileText, History, PenLine } from "lucide-react";
import { CreditPackageCheckoutButton } from "@/components/dashboard/credit-package-checkout-button";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { creditPackageProducts } from "@/lib/credits/packages";
import type { CreditLedgerEntry, EssaySubmission } from "@/lib/db/types";
import { getCreditsData } from "@/lib/db/queries";
import { ESSAY_CREDIT_COST } from "@/lib/schemas/essay";
import { ESSAY_CREDIT_COST_LABEL } from "@/lib/product-config";
import { formatAppDateTime } from "@/lib/dates";
import { WEEKLY_ESSAY_TOPIC_UNLOCK_COST } from "@/data/weekly-essay-topics";

export const dynamic = "force-dynamic";

const creditReasonLabels: Record<CreditLedgerEntry["reason"], string> = {
  initial_allowance: "Saldo inicial do ciclo",
  essay_correction: "Correção de redação",
  essay_refund: "Estorno de redação",
  manual_adjustment: "Ajuste manual",
  training_reward: "Recompensa de treino",
  simulation_reward: "Simulado finalizado",
  study_plan_reward: "Plano concluído",
  purchase: "Compra de créditos",
  ai_question_explanation: "Explicação de questão com IA",
  ai_performance_analysis: "Análise de desempenho com IA",
  ai_study_plan: "Plano inteligente com IA",
  ai_credit_refund: "Estorno de IA",
  weekly_essay_topic: "Proposta de redação semanal",
};

const essayStatusLabels: Record<EssaySubmission["status"], string> = {
  uploading: "Enviando",
  pending: "Aguardando correção",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const essayStatusTones: Record<EssaySubmission["status"], "blue" | "green" | "red" | "slate" | "amber"> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
};

const creditTools = [
  {
    title: "Correção de redação",
    description: "Envio e acompanhamento da correção completa.",
    cost: ESSAY_CREDIT_COST_LABEL,
    status: "Disponível",
    href: "/dashboard/correcao-redacao",
    cta: "Enviar redação",
    available: true,
  },
  {
    title: "Proposta semanal de redação",
    description: "Libere o comando completo, textos motivadores, eixos e repertórios para treinar.",
    cost: `Custo: ${WEEKLY_ESSAY_TOPIC_UNLOCK_COST} crédito`,
    status: "Disponível",
    href: "/dashboard/correcao-redacao",
    cta: "Ver proposta",
    available: true,
  },
  {
    title: "Explicar questão",
    description: "Tirar dúvida rápida sobre enunciado, alternativa ou resolução.",
    cost: "Custo: 1 crédito",
    status: "Disponível",
    href: "/dashboard/praticar?tab=banco",
    cta: "Ver no treino",
    available: true,
  },
  {
    title: "Análise de desempenho",
    description: "Entenda seus erros recentes, identifique padrões e veja quais conteúdos devem ser priorizados nos próximos estudos.",
    cost: "Custo: 2 créditos",
    status: "Disponível",
    href: "/dashboard/radar?tab=desempenho",
    cta: "Ver desempenho",
    available: true,
  },
  {
    title: "Plano inteligente",
    description: "Ajuste sua semana com base no Radar ENEM, nos erros recentes e na sua rotina de estudos.",
    cost: "Custo: 2 créditos",
    status: "Disponível",
    href: "/dashboard#plano-semana",
    cta: "Ver no plano",
    available: true,
  },
];

export default async function CreditsPage() {
  const data = await getCreditsData();
  const used = Math.max(0, data.account.monthly_allowance - data.account.balance);
  const balancePercentage = data.account.monthly_allowance
    ? Math.round((data.account.balance / data.account.monthly_allowance) * 100)
    : 0;
  const lowCredits = data.account.balance < ESSAY_CREDIT_COST;
  const ledger = data.ledger.map(formatLedgerEntry);

  return (
    <div>
      <DashboardPageHeader
        title="Créditos"
        description="Acompanhe saldo, consumo e histórico das funcionalidades que utilizam créditos."
      />

      <Notice tone="info" className="mb-6">
        O saldo e o histórico vêm do banco. Envio de redação confirmado consome{" "}
        {ESSAY_CREDIT_COST_LABEL}; créditos adicionais podem ser comprados nesta página.
      </Notice>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Reveal delay={0}>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saldo atual
                </p>
                <Coins className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
              </div>
              <p className="tnum mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {data.account.balance}{" "}
                <span className="text-lg font-semibold text-slate-500">
                  de {data.account.monthly_allowance}
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {used} créditos consumidos no ciclo atual
              </p>
              <Progress
                className="mt-5"
                value={balancePercentage}
                label="Disponível na conta"
                tone={lowCredits ? "red" : "green"}
              />
              {lowCredits ? (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium leading-6 text-amber-800 ring-1 ring-inset ring-amber-200">
                  Saldo abaixo do custo atual de uma submissão de redação.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Uso com redação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge tone="blue">Disponível</Badge>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                    Correção de redação
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Envie texto digitado, fotos ou PDF e acompanhe o status pela
                    plataforma. O custo é mostrado antes da confirmação.
                  </p>
                </div>
                <p className="tnum shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 ring-1 ring-inset ring-slate-200">
                  {ESSAY_CREDIT_COST_LABEL}
                </p>
              </div>
              <Link href="/dashboard/correcao-redacao" className={buttonClasses({ className: "mt-5" })}>
                Enviar redação
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Usos dos créditos
            </h2>
            <Badge tone="blue">IA operacional</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {creditTools.map((tool) => (
              <Card key={tool.title} className="h-full">
                <CardContent className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Coins className="h-4.5 w-4.5" aria-hidden="true" />
                    </div>
                    <Badge tone={tool.available ? "green" : "slate"}>{tool.status}</Badge>
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-slate-950">
                    {tool.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {tool.description}
                  </p>
                  <p className="tnum mt-4 text-sm font-bold text-slate-950">{tool.cost}</p>
                  <Link
                    href={tool.href}
                    className={buttonClasses({ variant: "outline", className: "mt-4" })}
                  >
                    {tool.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Reveal delay={120}>
          <Card id="historico">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Histórico recente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="divide-y divide-slate-100">
                {ledger.length ? ledger.map((item) => (
                  <li key={`${item.label}-${item.date}`} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.date}</p>
                    </div>
                    <p
                      className={`tnum text-sm font-bold ${
                        item.value > 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {item.value > 0 ? "+" : ""}
                      {item.value}
                    </p>
                  </li>
                )) : (
                  <li className="py-3 text-sm leading-6 text-slate-500">
                    Nenhuma movimentação de créditos registrada ainda.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={160}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Redações recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {data.recentEssays.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.recentEssays.map((essay) => (
                    <li key={essay.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {essay.theme || "Redação sem tema informado"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(essay.submitted_at)} · {essay.credit_cost} créditos
                        </p>
                      </div>
                      <Badge tone={essayStatusTones[essay.status]}>
                        {essayStatusLabels[essay.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Redações enviadas aparecerão aqui com status e créditos utilizados.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={200}>
        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_52%,#f8fafc_100%)] p-4 shadow-sm shadow-slate-900/5 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                Créditos adicionais
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Complete o saldo quando precisar de mais correções, análises ou revisões.
              </p>
            </div>
            <Badge tone="green" className="shrink-0">Disponível</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {creditPackageProducts.map((pack) => (
              <Card
                key={pack.id}
                className={
                  pack.highlight
                    ? "relative h-full border-blue-300 shadow-md shadow-blue-900/10 ring-1 ring-inset ring-blue-100"
                    : "h-full border-white/80 bg-white/90 shadow-sm shadow-slate-900/5"
                }
              >
                <CardContent className="flex h-full flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className={`text-base font-bold tracking-tight ${
                          pack.highlight ? "text-blue-950" : "text-slate-950"
                        }`}
                      >
                        {pack.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {pack.description}
                      </p>
                    </div>
                    {pack.highlight ? (
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">
                        Mais escolhido
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-5 rounded-lg p-4 ring-1 ring-inset ${
                      pack.highlight
                        ? "bg-blue-50 ring-blue-200"
                        : "bg-slate-50 ring-slate-200"
                    }`}
                  >
                    <p
                      className={`tnum text-3xl font-bold tracking-tight ${
                        pack.highlight ? "text-blue-950" : "text-slate-950"
                      }`}
                    >
                      {pack.credits}
                      <span
                        className={`ml-1.5 text-base font-semibold ${
                          pack.highlight ? "text-blue-700" : "text-slate-500"
                        }`}
                      >
                        créditos
                      </span>
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="tnum text-xl font-bold text-blue-800">
                        {pack.price}
                      </p>
                      <p
                        className={`tnum text-xs font-semibold ${
                          pack.highlight ? "text-blue-700" : "text-slate-500"
                        }`}
                      >
                        {formatCreditUnitPrice(pack.priceCents, pack.credits)} / crédito
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <CreditPackageCheckoutButton
                      productSlug={pack.productSlug}
                      variant={pack.highlight ? "primary" : "outline"}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Pagamento processado pelo Mercado Pago. O saldo é creditado
            automaticamente após confirmação do pagamento.
          </p>
        </section>
      </Reveal>
    </div>
  );
}

function formatLedgerEntry(entry: CreditLedgerEntry) {
  return {
    label: creditReasonLabels[entry.reason] ?? "Movimentação de créditos",
    date: formatDate(entry.created_at),
    value: entry.amount,
  };
}

function formatDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCreditUnitPrice(priceCents: number, credits: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / credits / 100);
}
