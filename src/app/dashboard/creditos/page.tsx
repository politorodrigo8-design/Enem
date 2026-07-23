import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  PenLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CreditPackageCheckoutButton } from "@/components/dashboard/credit-package-checkout-button";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { creditPackageProducts } from "@/lib/credits/packages";
import type { CreditLedgerEntry, EssaySubmission } from "@/lib/db/types";
import { getCreditsData, getDashboardIdentity } from "@/lib/db/queries";
import { ESSAY_CREDIT_COST } from "@/lib/schemas/essay";
import { formatAppDateTime } from "@/lib/dates";
import { WEEKLY_ESSAY_TOPIC_UNLOCK_COST } from "@/data/weekly-essay-topics";

export const dynamic = "force-dynamic";
const LEDGER_PAGE_SIZE = 8;

const creditReasonLabels: Record<CreditLedgerEntry["reason"], string> = {
  initial_allowance: "Saldo inicial do ciclo",
  essay_correction: "Correção de redação",
  essay_refund: "Estorno de redação",
  manual_adjustment: "Ajuste manual",
  training_reward: "Recompensa de treino",
  simulation_reward: "Simulado finalizado",
  study_plan_reward: "Plano concluído",
  purchase: "Compra de créditos",
  ai_question_explanation: "Explicação de questão",
  ai_performance_analysis: "Análise de desempenho",
  ai_study_plan: "Plano inteligente",
  ai_credit_refund: "Estorno automático",
  purchase_refund: "Estorno de compra de créditos",
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

const essayStatusTones: Record<
  EssaySubmission["status"],
  "blue" | "green" | "red" | "slate" | "amber"
> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
};

type CreditUse = {
  title: string;
  description: string;
  cost: number;
  href: string;
  icon: LucideIcon;
  actionLabel?: string;
};

const creditUses: CreditUse[] = [
  {
    title: "Correção de redação",
    description: "Envio com correção completa pelas cinco competências.",
    cost: ESSAY_CREDIT_COST,
    href: "/dashboard/correcao-redacao",
    icon: PenLine,
  },
  {
    title: "Análise de desempenho",
    description: "Padrões dos seus erros e o que priorizar em seguida.",
    cost: 2,
    href: "/dashboard/desempenho",
    icon: BarChart3,
  },
  {
    title: "Plano inteligente",
    description: "Reorganiza sua semana com base no seu desempenho.",
    cost: 2,
    href: "/dashboard#plano-semana",
    icon: CalendarCheck,
  },
  {
    title: "Explicação de questão",
    description: "Resolução passo a passo de qualquer questão do banco.",
    cost: 1,
    href: "/dashboard/praticar",
    icon: BookOpen,
  },
  {
    title: "Proposta semanal de redação",
    description: "Comando completo, textos motivadores e repertórios.",
    cost: WEEKLY_ESSAY_TOPIC_UNLOCK_COST,
    href: "/dashboard/correcao-redacao",
    icon: PenLine,
    actionLabel: "Ver proposta",
  },
];

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ledgerPage = parsePageParam(params.historico);
  const [data, identity] = await Promise.all([
    getCreditsData({ ledgerPage, ledgerPageSize: LEDGER_PAGE_SIZE }),
    getDashboardIdentity(),
  ]);
  const used = Math.max(0, data.account.monthly_allowance - data.account.balance);
  const balancePercentage = data.account.monthly_allowance
    ? Math.round((data.account.balance / data.account.monthly_allowance) * 100)
    : 0;
  const lowCredits = data.account.balance < ESSAY_CREDIT_COST;
  const ledger = data.ledger.map(formatLedgerEntry);
  const ledgerPageCount = Math.max(1, Math.ceil(data.ledgerTotal / data.ledgerPageSize));
  const hasLedgerPagination = ledgerPageCount > 1;

  return (
    <div>
      <DashboardPageHeader
        title="Créditos"
        description="Seu saldo do mês e o que dá para fazer com ele."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Reveal delay={0}>
          <Card className="h-full">
            <CardContent className="flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saldo atual
                </p>
                <Coins className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
              </div>
              <p className="tnum mt-3 text-5xl font-bold tracking-tight text-slate-950">
                {data.account.balance}
                <span className="ml-2 text-lg font-semibold text-slate-500">
                  de {data.account.monthly_allowance} créditos
                </span>
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Todo mês você recebe {data.account.monthly_allowance} créditos.
                Neste ciclo, {used} {used === 1 ? "foi usado" : "foram usados"}.
              </p>
              <div className="mt-auto pt-5">
                <Progress
                  value={balancePercentage}
                  label="Disponível na conta"
                  tone={lowCredits ? "red" : "green"}
                />
                {lowCredits ? (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium leading-6 text-amber-800 ring-1 ring-inset ring-amber-200">
                    Saldo abaixo do custo de uma correção de redação (
                    {ESSAY_CREDIT_COST} créditos). Os pacotes abaixo completam o
                    saldo na hora.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>O que os créditos pagam</CardTitle>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                O custo aparece sempre antes de confirmar; se algo falhar, o
                crédito volta sozinho.
              </p>
            </CardHeader>
            <CardContent className="pt-1">
              <ul className="divide-y divide-slate-100">
                {creditUses.map((use) => (
                  <li key={use.title}>
                    <Link
                      href={use.href}
                      className="group flex items-center gap-4 py-3 transition-colors hover:bg-slate-50 sm:-mx-2 sm:rounded-lg sm:px-2"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <use.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-950">
                          {use.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
                          {use.description}
                        </span>
                      </span>
                      <span className="tnum shrink-0 rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200">
                        {use.cost} {use.cost === 1 ? "crédito" : "créditos"}
                      </span>
                      {use.actionLabel ? (
                        <span className="hidden shrink-0 text-xs font-bold text-blue-700 sm:inline">
                          {use.actionLabel}
                        </span>
                      ) : null}
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-700"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              {hasLedgerPagination ? (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  {data.ledgerPage > 1 ? (
                    <Link
                      href={getLedgerPageHref(data.ledgerPage - 1)}
                      className={buttonClasses({
                        variant: "outline",
                        size: "sm",
                        className: "h-9 w-9 shrink-0 px-0",
                      })}
                      aria-label="Página anterior do histórico"
                      title="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      className={buttonClasses({
                        variant: "outline",
                        size: "sm",
                        className: "h-9 w-9 shrink-0 px-0 opacity-55",
                      })}
                      aria-disabled="true"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  <p className="tnum text-xs font-semibold text-slate-500">
                    Página {data.ledgerPage} de {ledgerPageCount}
                  </p>
                  {data.ledgerPage < ledgerPageCount ? (
                    <Link
                      href={getLedgerPageHref(data.ledgerPage + 1)}
                      className={buttonClasses({
                        variant: "outline",
                        size: "sm",
                        className: "h-9 w-9 shrink-0 px-0",
                      })}
                      aria-label="Próxima página do histórico"
                      title="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      className={buttonClasses({
                        variant: "outline",
                        size: "sm",
                        className: "h-9 w-9 shrink-0 px-0 opacity-55",
                      })}
                      aria-disabled="true"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
                {ledger.length ? (
                  ledger.map((item, index) => (
                    <li
                      key={`${item.label}-${item.date}-${index}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
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
                  ))
                ) : (
                  <li className="py-3 text-sm leading-6 text-slate-500">
                    Nenhuma movimentação de créditos registrada ainda.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={160}>
          <Card className="h-fit">
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
                    <li
                      key={essay.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {essay.theme || "Redação sem tema informado"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(essay.submitted_at)} · {essay.credit_cost}{" "}
                          créditos
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
                  Redações enviadas aparecerão aqui com status e créditos
                  utilizados.
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={200}>
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              Precisa de mais créditos?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Os pacotes completam seu saldo na hora — sem assinatura, sem
              renovação automática.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {creditPackageProducts.map((pack) => (
              <Card
                key={pack.id}
                className={
                  pack.highlight
                    ? "relative h-full border-blue-300 ring-1 ring-inset ring-blue-100"
                    : "h-full"
                }
              >
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold tracking-tight text-slate-950">
                      {pack.title}
                    </h3>
                    {pack.highlight ? (
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">
                        Mais escolhido
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {pack.description}
                  </p>
                  <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-5">
                    <p className="tnum text-3xl font-bold tracking-tight text-slate-950">
                      {pack.credits}
                      <span className="ml-1.5 text-base font-semibold text-slate-500">
                        créditos
                      </span>
                    </p>
                    <div className="text-right">
                      <p className="tnum text-xl font-bold text-blue-800">
                        {pack.price}
                      </p>
                      <p className="tnum text-xs font-semibold text-slate-500">
                        {formatCreditUnitPrice(pack.priceCents, pack.credits)} por
                        crédito
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <CreditPackageCheckoutButton
                      productSlug={pack.productSlug}
                      credits={pack.credits}
                      price={pack.price}
                      accountEmail={identity.email}
                      variant={pack.highlight ? "primary" : "outline"}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Pagamento processado pelo Mercado Pago. O saldo é creditado
            automaticamente após a confirmação.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Os créditos são unidades internas de uso, pessoais e intransferíveis, e não
            podem ser convertidos em dinheiro. O saldo é liberado após a confirmação do
            pagamento. Consulte as regras de consumo e reembolso antes de comprar.
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

function parsePageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function getLedgerPageHref(page: number) {
  return page > 1
    ? `/dashboard/creditos?historico=${page}#historico`
    : "/dashboard/creditos#historico";
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
