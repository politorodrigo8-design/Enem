import { Brain, Coins, FileText, Lock, RefreshCw, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { creditPackages } from "@/data/performance";
import { getMockCheckoutState } from "@/lib/services/billing";

const usageExamples = [
  { label: "Análise de desempenho", cost: 5, icon: Brain },
  { label: "Explicação personalizada", cost: 1, icon: Sparkles },
  { label: "Atualização do plano", cost: 3, icon: RefreshCw },
  { label: "Análise de redação futura", cost: 10, icon: FileText },
];

export default function CreditsPage() {
  const checkout = getMockCheckoutState();

  return (
    <div>
      <DashboardPageHeader
        title="Créditos"
        description="Recursos inteligentes futuros terão uso controlado, sem chat ilimitado."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Exemplo de saldo
              </p>
              <Coins className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" />
            </div>
            <p className="tnum mt-3 text-3xl font-bold tracking-tight text-slate-950">
              42 <span className="text-lg font-semibold text-slate-500">de 50</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">créditos disponíveis</p>
            <Progress className="mt-5" value={84} label="Uso disponível" tone="green" />
            <Notice tone="info" className="mt-5">
              {checkout.message}
            </Notice>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Exemplos de consumo</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-slate-100">
              {usageExamples.map((item) => (
                <li key={item.label} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="tnum text-sm font-semibold text-slate-950">
                    {item.cost}{" "}
                    <span className="font-normal text-slate-500">
                      {item.cost === 1 ? "crédito" : "créditos"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Pacotes adicionais
          </h2>
          <Badge tone="slate">Disponível em breve</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {creditPackages.map((pack) => (
            <Card key={pack.id}>
              <CardContent className="flex h-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {pack.title}
                </p>
                <p className="tnum mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {pack.credits}
                  <span className="ml-1.5 text-sm font-normal text-slate-500">créditos</span>
                </p>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {pack.description}
                </p>
                <p className="tnum mt-4 border-t border-slate-100 pt-4 text-lg font-bold text-slate-950">
                  {pack.price}
                </p>
                <Button full disabled className="mt-4">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Disponível em breve
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
