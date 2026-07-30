import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCustomerDetail } from "@/lib/db/admin-queries";
import { formatCentsBRL } from "@/lib/admin/rules.mjs";
import { formatAdminDateTime } from "@/lib/admin/format";
import { accessLevelLabel, normalizeAccessLevel } from "@/lib/access";
import { CustomerAdminActions } from "./customer-actions";

export const dynamic = "force-dynamic";

const orderStatusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  expired: "Expirado",
  charged_back: "Chargeback",
};

const orderStatusTones: Record<string, "green" | "red" | "amber" | "slate"> = {
  approved: "green",
  pending: "amber",
  rejected: "red",
  refunded: "red",
  charged_back: "red",
  cancelled: "slate",
  expired: "slate",
};

const essayStatusLabels: Record<string, string> = {
  uploading: "Enviando",
  pending: "Pendente",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const creditReasonLabels: Record<string, string> = {
  initial_allowance: "Saldo inicial",
  essay_correction: "Correção de redação",
  essay_refund: "Estorno de redação",
  manual_adjustment: "Ajuste manual",
  training_reward: "Prêmio de treino",
  simulation_reward: "Prêmio de simulado",
  study_plan_reward: "Prêmio de plano",
  purchase: "Compra de créditos",
  purchase_refund: "Estorno de compra",
  ai_question_explanation: "IA: explicação",
  ai_performance_analysis: "IA: análise",
  ai_study_plan: "IA: plano",
  ai_credit_refund: "IA: estorno",
  weekly_essay_topic: "Tema da semana",
  referral_referred_bonus: "Bônus de indicado",
  referral_referrer_bonus: "Bônus de indicador",
  referral_bonus_reversal: "Estorno de indicação",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminCustomerDetail(id);

  if (!detail) notFound();

  const level = normalizeAccessLevel(detail.profile.access_level);
  const netCents = detail.orders
    .filter((order) => order.status === "approved")
    .reduce((sum, order) => sum + order.amount_cents, 0);
  const accuracy = detail.activity.answers
    ? Math.round((detail.activity.correct / detail.activity.answers) * 100)
    : 0;

  return (
    <div>
      <Link
        href="/dashboard/admin/clientes"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:min-h-0"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para clientes
      </Link>

      <DashboardPageHeader
        title={detail.profile.full_name || "Cliente sem nome"}
        description={detail.profile.email}
        action={<Badge tone={level === "paid" ? "green" : "blue"}>{accessLevelLabel(level)}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Receita gerada" value={formatCentsBRL(netCents)} />
        <Metric label="Créditos" value={String(detail.credits.balance)} />
        <Metric
          label="Questões respondidas"
          value={String(detail.activity.answers)}
          helper={detail.activity.answers ? `${accuracy}% de acerto` : undefined}
        />
        <Metric
          label="Redações enviadas"
          value={String(detail.essays.length)}
          helper={
            detail.activity.lastActiveAt
              ? `ativo em ${formatAdminDateTime(detail.activity.lastActiveAt)}`
              : "sem atividade"
          }
        />
      </div>

      <section className="mt-6">
        <CustomerAdminActions
          userId={detail.profile.id}
          currentLevel={level}
          currentExpiresAt={detail.profile.access_expires_at}
          currentBalance={detail.credits.balance}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil de estudo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Field label="Curso desejado" value={detail.profile.target_course} />
              <Field label="Universidade" value={detail.profile.target_university} />
              <Field
                label="Nota alvo"
                value={detail.profile.target_score ? String(detail.profile.target_score) : null}
              />
              <Field
                label="Horas por semana"
                value={detail.profile.weekly_hours ? `${detail.profile.weekly_hours}h` : null}
              />
              <Field label="Código de indicação" value={detail.profile.referral_code} />
              <Field
                label="Cadastro"
                value={formatAdminDateTime(detail.profile.created_at)}
              />
              <Field
                label="Acesso expira"
                value={
                  detail.profile.access_expires_at
                    ? formatAdminDateTime(detail.profile.access_expires_at)
                    : "sem expiração"
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso da plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Field label="Sessões de treino" value={String(detail.activity.sessions)} />
              <Field label="Simulados" value={String(detail.activity.simulations)} />
              <Field label="Acertos" value={`${detail.activity.correct} de ${detail.activity.answers}`} />
              <Field
                label="Indicações feitas"
                value={`${detail.referrals.asReferrer} (${detail.referrals.rewarded} premiadas)`}
              />
              <Field
                label="Veio por indicação"
                value={detail.referrals.asReferred ? "sim" : "não"}
              />
              <Field
                label="Onboarding"
                value={detail.profile.onboarding_completed ? "concluído" : "pendente"}
              />
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos ({detail.orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.orders.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum pedido registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">Produto</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Valor</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Criado</th>
                      <th scope="col" className="py-2 font-semibold">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {order.product_name ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={orderStatusTones[order.status] ?? "slate"}>
                            {orderStatusLabels[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="tnum py-2.5 pr-4 text-right font-semibold text-slate-950">
                          {formatCentsBRL(order.amount_cents)}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">
                          {formatAdminDateTime(order.created_at)}
                        </td>
                        <td className="py-2.5 text-xs text-slate-500">
                          {order.paid_at ? formatAdminDateTime(order.paid_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Redações ({detail.essays.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.essays.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma redação enviada.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {detail.essays.slice(0, 10).map((essay) => (
                  <li key={essay.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{essay.theme}</p>
                      <p className="text-xs text-slate-500">
                        {formatAdminDateTime(essay.submitted_at)}
                      </p>
                    </div>
                    <Badge tone={essay.status === "completed" ? "green" : "amber"}>
                      {essayStatusLabels[essay.status] ?? essay.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extrato de créditos</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.credits.ledger.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma movimentação.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {detail.credits.ledger.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">
                        {creditReasonLabels[entry.reason] ?? entry.reason}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatAdminDateTime(entry.created_at)}
                      </p>
                    </div>
                    <span
                      className={`tnum shrink-0 text-sm font-bold ${
                        entry.amount > 0 ? "text-emerald-700" : "text-slate-600"
                      }`}
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {detail.feedbacks.length > 0 ? (
        <section className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feedbacks enviados ({detail.feedbacks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-slate-100">
                {detail.feedbacks.slice(0, 8).map((feedback) => (
                  <li key={feedback.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{feedback.feedback_type}</Badge>
                      <span className="text-xs text-slate-500">
                        {formatAdminDateTime(feedback.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{feedback.message}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tnum mt-3 break-words text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}
