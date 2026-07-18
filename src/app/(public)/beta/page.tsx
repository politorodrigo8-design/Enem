import { AlertTriangle, CheckCircle2, ClipboardCheck, Radar, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { SectionHeader } from "@/components/ui/section-header";
import { BetaApplicationForm } from "./beta-application-form";

const betaItems = [
  "Diagnostico inicial e dashboard",
  "Radar ENEM",
  "Banco de questoes demonstrativas",
  "Simulados",
  "Resumo de desempenho",
  "Plano de estudos",
  "Treino de alta prioridade",
];

const transparencyItems = [
  "O produto esta em fase beta.",
  "Algumas informacoes ainda sao demonstrativas.",
  "Nao ha garantia de nota.",
  "O Radar nao preve exatamente o que caira.",
  "A recorrencia e uma estimativa educacional.",
  "Acesso beta depende de liberacao administrativa.",
];

export default function BetaPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div>
          <Badge tone="blue">Beta interna</Badge>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
            Beta interna do NexoENEM
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Acesso manual para testes, revisores e convidados. O produto
            comercial permanece como NexoENEM Completo em pagamento unico.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {betaItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="text-sm font-semibold leading-6 text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <BetaApplicationForm />
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Transparencia"
            title="Beta e teste, nao promessa."
            description="A plataforma ajuda a decidir prioridades, mas nao tem vinculo oficial com MEC ou Inep e nao garante nota especifica."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Card>
              <CardContent>
                <Radar className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-slate-950">Radar ENEM</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O Radar usa recorrencia historica e padroes de cobranca como
                  estimativa educacional. Ele nao preve questoes exatas.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <ClipboardCheck className="h-6 w-6 text-violet-600" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-slate-950">Conteudo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Questoes oficiais antigas so serao usadas com fonte,
                  atribuicao, integridade e revisao editorial adequadas.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <ShieldCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-slate-950">Acesso</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O acesso beta e liberado manualmente. Nao ha botao
                  administrativo publico.
                </p>
              </CardContent>
            </Card>
          </div>

          <Notice tone="warning" icon={AlertTriangle} className="mt-8">
            {transparencyItems.join(" ")}
          </Notice>
        </div>
      </section>
    </main>
  );
}
