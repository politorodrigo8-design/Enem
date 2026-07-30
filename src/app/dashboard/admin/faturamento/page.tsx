import Link from "next/link";
import { Coins, Receipt, TrendingUp, Wallet } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminBilling } from "@/lib/db/admin-queries";
import { formatCentsBRL } from "@/lib/admin/rules.mjs";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  expired: "Expirado",
  charged_back: "Chargeback",
};

const kindLabels: Record<string, string> = {
  access: "Acesso",
  credit_package: "Pacote de créditos",
};

export default async function AdminBillingPage() {
  const billing = await getAdminBilling();
  const maxMonth = Math.max(...billing.byMonth.map((month) => month.netCents), 0);

  return (
    <div>
      <DashboardPageHeader
        title="Faturamento"
        description="Receita consolidada desde o início, por mês, produto e cliente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receita líquida"
          value={formatCentsBRL(billing.totals.netCents)}
          helper="aprovados menos estornos"
          icon={TrendingUp}
        />
        <StatCard
          label="Receita bruta"
          value={formatCentsBRL(billing.totals.grossCents)}
          icon={Wallet}
        />
        <StatCard
          label="Estornos"
          value={formatCentsBRL(billing.totals.refundedCents)}
          helper={
            billing.totals.grossCents
              ? `${Math.round((billing.totals.refundedCents / billing.totals.grossCents) * 100)}% da bruta`
              : undefined
          }
          icon={Receipt}
        />
        <StatCard
          label="Créditos em circulação"
          value={String(billing.credits.outstanding)}
          helper={`${billing.credits.consumed} já consumidos`}
          icon={Coins}
        />
      </div>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita por mês</CardTitle>
          </CardHeader>
          <CardContent>
            {billing.byMonth.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma venda registrada até agora.</p>
            ) : (
              <ul className="space-y-3">
                {billing.byMonth.map((month) => (
                  <li key={month.month}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{monthLabel(month.month)}</span>
                      <span className="tnum font-semibold text-slate-950">
                        {formatCentsBRL(month.netCents)}
                        <span className="ml-2 text-xs font-medium text-slate-500">
                          {month.orders} pedido(s)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-md bg-slate-100">
                      <div
                        className="h-full rounded-md bg-blue-700"
                        style={{
                          width: `${maxMonth ? Math.max((month.netCents / maxMonth) * 100, 2) : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por produto</CardTitle>
          </CardHeader>
          <CardContent>
            {billing.byProduct.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum produto vendido.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold">Produto</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Tipo</th>
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">Pedidos</th>
                      <th scope="col" className="py-2 text-right font-semibold">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billing.byProduct.map((product) => (
                      <tr key={product.productId}>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{product.name}</td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">
                          {kindLabels[product.kind] ?? product.kind}
                        </td>
                        <td className="tnum py-2.5 pr-4 text-right text-slate-700">
                          {product.orders}
                        </td>
                        <td className="tnum py-2.5 text-right font-semibold text-slate-950">
                          {formatCentsBRL(product.netCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {billing.byStatus.map((status) => (
                <li key={status.status} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">
                    {statusLabels[status.status] ?? status.status}
                  </span>
                  <span className="tnum text-slate-950">
                    <span className="font-semibold">{status.count}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {formatCentsBRL(status.cents)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maiores clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {billing.topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma compra registrada.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {billing.topCustomers.map((customer, index) => (
                  <li key={customer.userId} className="flex items-center gap-3 py-2.5">
                    <span className="tnum w-5 shrink-0 text-xs font-bold text-slate-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/admin/clientes/${customer.userId}`}
                        className="truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                      >
                        {customer.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{customer.email}</p>
                    </div>
                    <span className="tnum shrink-0 text-sm font-semibold text-slate-950">
                      {formatCentsBRL(customer.cents)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Economia de créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <CreditRow label="Comprados pelos alunos" value={billing.credits.purchased} />
              <CreditRow label="Concedidos (bônus, prêmios)" value={billing.credits.granted} />
              <CreditRow label="Consumidos" value={billing.credits.consumed} />
              <CreditRow
                label="Saldo em circulação"
                value={billing.credits.outstanding}
                emphasis
              />
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
              Saldo em circulação é passivo: representa correções e recursos de IA já pagos
              que ainda serão entregues.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CreditRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd
        className={
          emphasis
            ? "tnum text-lg font-bold text-slate-950"
            : "tnum font-semibold text-slate-800"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function monthLabel(month: string) {
  const [year, monthPart] = month.split("-");
  const names = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${names[Number(monthPart) - 1] ?? monthPart}/${year}`;
}
