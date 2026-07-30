import Link from "next/link";
import { AlertTriangle, CreditCard, Search } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { getAdminPayments } from "@/lib/db/admin-queries";
import { formatCentsBRL, isRevenueOrder } from "@/lib/admin/rules.mjs";
import { formatAdminDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  expired: "Expirado",
  charged_back: "Chargeback",
};

const statusTones: Record<string, "green" | "red" | "amber" | "slate"> = {
  approved: "green",
  pending: "amber",
  rejected: "red",
  refunded: "red",
  charged_back: "red",
  cancelled: "slate",
  expired: "slate",
};

const providerLabels: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  stripe: "Stripe",
  manual: "Manual",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    status: getParam(params.status) || "all",
    provider: getParam(params.provedor) || "all",
    search: getParam(params.busca),
  };

  const { rows, unprocessedEvents } = await getAdminPayments(filters);

  const approved = rows.filter((row) => isRevenueOrder(row.status));
  const approvedCents = approved.reduce((sum, row) => sum + row.amount_cents, 0);
  const pending = rows.filter((row) => row.status === "pending");
  const failedWebhooks = rows.filter((row) => row.failedEvents > 0);

  return (
    <div>
      <DashboardPageHeader
        title="Pagamentos"
        description="Todos os pedidos criados na plataforma e o estado da conciliação com o provedor."
      />

      {unprocessedEvents > 0 ? (
        <Notice tone="warning" className="mb-6" icon={AlertTriangle}>
          <strong>{unprocessedEvents}</strong> evento(s) de pagamento chegaram do provedor e ainda
          não foram processados. Pedidos podem estar sem acesso liberado.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pedidos listados"
          value={String(rows.length)}
          icon={CreditCard}
        />
        <StatCard label="Aprovados" value={String(approved.length)} helper={formatCentsBRL(approvedCents)} />
        <StatCard
          label="Pendentes"
          value={String(pending.length)}
          helper={pending.length ? "aguardando confirmação" : "nenhum em aberto"}
        />
        <StatCard
          label="Com falha de webhook"
          value={String(failedWebhooks.length)}
          helper={failedWebhooks.length ? "exige conferência" : "conciliação limpa"}
        />
      </div>

      <Card className="mt-6">
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <div>
              <label htmlFor="busca" className="text-sm font-medium text-slate-700">
                Buscar
              </label>
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={filters.search}
                placeholder="Cliente, e-mail ou id do pagamento"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select id="status" name="status" defaultValue={filters.status} className={fieldClass}>
                <option value="all">Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provedor" className="text-sm font-medium text-slate-700">
                Provedor
              </label>
              <select
                id="provedor"
                name="provedor"
                defaultValue={filters.provider}
                className={fieldClass}
              >
                <option value="all">Todos</option>
                {Object.entries(providerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonClasses({ size: "lg" })}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={CreditCard}
            title="Nenhum pedido encontrado"
            description="Ajuste os filtros ou aguarde o primeiro pagamento entrar."
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <Th>Cliente</Th>
                  <Th>Produto</Th>
                  <Th>Status</Th>
                  <Th align="right">Valor</Th>
                  <Th>Provedor</Th>
                  <Th>Criado</Th>
                  <Th>Conciliação</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/clientes/${row.user_id}`}
                        className="font-semibold text-slate-950 hover:text-blue-700"
                      >
                        {row.customer_name}
                      </Link>
                      <p className="text-xs text-slate-500">{row.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.product_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTones[row.status] ?? "slate"}>
                        {statusLabels[row.status] ?? row.status}
                      </Badge>
                    </td>
                    <td className="tnum px-4 py-3 text-right font-semibold text-slate-950">
                      {formatCentsBRL(row.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {providerLabels[row.provider] ?? row.provider}
                      {row.provider_order_id ? (
                        <p className="truncate text-xs text-slate-400" title={row.provider_order_id}>
                          {row.provider_order_id}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatAdminDateTime(row.created_at)}
                      {row.paid_at ? (
                        <p className="text-xs text-emerald-700">
                          pago {formatAdminDateTime(row.paid_at)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.failedEvents > 0 ? (
                        <span className="font-semibold text-rose-700">
                          {row.failedEvents} evento(s) com falha
                        </span>
                      ) : row.events > 0 ? (
                        <span className="text-slate-500">{row.events} evento(s) ok</span>
                      ) : (
                        <span className="text-slate-400">sem evento</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
