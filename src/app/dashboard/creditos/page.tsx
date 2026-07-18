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

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Saldo fictício</p>
                <h2 className="mt-2 text-4xl font-bold text-slate-950">
                  42 de 50
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  créditos disponíveis
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Coins className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <Progress className="mt-6" value={84} label="Uso disponível" tone="green" />
            <Notice tone="info" className="mt-5">
              {checkout.message}
            </Notice>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exemplos de consumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {usageExamples.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 p-4">
                <item.icon className="h-5 w-5 text-violet-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm text-slate-600">{item.cost} créditos</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-950">Pacotes adicionais</h2>
          <Badge tone="slate">Disponível em breve</Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {creditPackages.map((pack) => (
            <Card key={pack.id}>
              <CardContent>
                <p className="text-sm font-semibold text-blue-700">{pack.title}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {pack.credits}
                </p>
                <p className="mt-1 text-sm text-slate-500">créditos</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {pack.description}
                </p>
                <p className="mt-4 text-lg font-bold text-slate-950">{pack.price}</p>
                <Button full disabled className="mt-5">
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
