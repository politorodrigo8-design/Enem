import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminCustomers } from "@/lib/db/admin-queries";
import { formatCentsBRL } from "@/lib/admin/rules.mjs";
import { formatAdminDateTime } from "@/lib/admin/format";
import { accessLevelLabel, normalizeAccessLevel } from "@/lib/access";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10";

const levelTones = {
  admin: "blue",
  paid: "green",
  beta: "amber",
  unpaid: "slate",
} as const;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    search: getParam(params.busca),
    level: getParam(params.nivel) || "all",
    status: getParam(params.status) || "all",
    sort: getParam(params.ordem) || "recent",
  };

  const customers = await getAdminCustomers(filters);
  const paying = customers.filter((customer) => customer.paidCents > 0);
  const totalCents = customers.reduce((sum, customer) => sum + customer.paidCents, 0);
  const active = customers.filter((customer) => customer.answers > 0);

  return (
    <div>
      <DashboardPageHeader
        title="Clientes"
        description="Todos os cadastros da plataforma, com acesso, consumo e histórico de compra."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cadastros listados" value={String(customers.length)} icon={Users} />
        <StatCard label="Já compraram" value={String(paying.length)} />
        <StatCard label="Receita destes clientes" value={formatCentsBRL(totalCents)} />
        <StatCard
          label="Estudaram ao menos 1 questão"
          value={String(active.length)}
          helper={
            customers.length
              ? `${Math.round((active.length / customers.length) * 100)}% dos listados`
              : undefined
          }
        />
      </div>

      <Card className="mt-6">
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
            <div>
              <label htmlFor="busca" className="text-sm font-medium text-slate-700">
                Buscar
              </label>
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={filters.search}
                placeholder="Nome ou e-mail"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="nivel" className="text-sm font-medium text-slate-700">
                Nível
              </label>
              <select id="nivel" name="nivel" defaultValue={filters.level} className={fieldClass}>
                <option value="all">Todos</option>
                <option value="paid">Cliente completo</option>
                <option value="beta">Beta</option>
                <option value="unpaid">Sem acesso</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-medium text-slate-700">
                Situação
              </label>
              <select id="status" name="status" defaultValue={filters.status} className={fieldClass}>
                <option value="all">Todas</option>
                <option value="paying">Compraram</option>
                <option value="expired">Acesso expirado</option>
                <option value="inactive">Nunca responderam</option>
              </select>
            </div>
            <div>
              <label htmlFor="ordem" className="text-sm font-medium text-slate-700">
                Ordenar por
              </label>
              <select id="ordem" name="ordem" defaultValue={filters.sort} className={fieldClass}>
                <option value="recent">Mais recentes</option>
                <option value="revenue">Maior receita</option>
                <option value="activity">Mais ativos</option>
              </select>
            </div>
            <button type="submit" className={buttonClasses({ size: "lg" })}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      {customers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Nenhum cliente encontrado"
            description="Ajuste os filtros para ampliar a busca."
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          {/* A tabela rola dentro do próprio card: em 320px ela tem mais colunas
              do que cabe, e deixar o body rolar horizontalmente quebraria o
              layout inteiro (DESIGN.md). */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <Th>Cliente</Th>
                  <Th>Acesso</Th>
                  <Th align="right">Receita</Th>
                  <Th align="right">Redações</Th>
                  <Th align="right">Créditos</Th>
                  <Th align="right">Questões</Th>
                  <Th>Cadastro</Th>
                  <Th aria-label="Ações" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const level = normalizeAccessLevel(customer.access_level);
                  const expired =
                    customer.access_expires_at &&
                    new Date(customer.access_expires_at).getTime() <= Date.now();

                  return (
                    <tr key={customer.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-950">
                          {customer.full_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-slate-500">{customer.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={levelTones[level]}>{accessLevelLabel(level)}</Badge>
                        {expired ? (
                          <p className="mt-1 text-xs font-semibold text-rose-700">expirado</p>
                        ) : null}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-semibold text-slate-950">
                        {customer.paidCents > 0 ? formatCentsBRL(customer.paidCents) : "—"}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-slate-700">
                        {customer.essays || "—"}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-slate-700">
                        {customer.creditBalance}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-slate-700">
                        {customer.answers || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatAdminDateTime(customer.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/admin/clientes/${customer.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                        >
                          Ver
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
  ...props
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
} & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
      {...props}
    >
      {children}
    </th>
  );
}

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
