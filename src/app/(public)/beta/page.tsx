import { AlertTriangle, CheckCircle2, ClipboardCheck, Radar, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { BetaApplicationForm } from "./beta-application-form";

const betaItems = [
  "Diagnóstico inicial e dashboard",
  "Radar ENEM",
  "Banco de questões (amostra inicial)",
  "Simulados",
  "Resumo de desempenho",
  "Plano de estudos",
  "Treino de alta prioridade",
];

const transparencyItems = [
  "O produto está em fase beta.",
  "Alguns indicadores ainda são estimativas educacionais.",
  "Não há garantia de nota.",
  "O Radar não prevê exatamente o que cairá.",
  "A recorrência é uma estimativa educacional.",
  "O acesso à beta é liberado manualmente pela equipe.",
];

export default function BetaPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div>
          <div className="animate-rise">
            <Badge tone="blue">Beta interna</Badge>
          </div>
          <h1
            className="animate-rise mt-5 text-4xl font-display font-semibold tracking-tight leading-tight text-slate-950 md:text-5xl"
            style={{ "--rise-delay": "70ms" } as React.CSSProperties}
          >
            Beta interna do NexoENEM
          </h1>
          <p
            className="animate-rise mt-5 text-lg leading-8 text-slate-600"
            style={{ "--rise-delay": "140ms" } as React.CSSProperties}
          >
            Acesso por convite para revisores e convidados. O produto
            completo continua sendo o NexoENEM Completo, em pagamento único.
          </p>

          <div
            className="animate-rise mt-8 grid gap-4 sm:grid-cols-2"
            style={{ "--rise-delay": "210ms" } as React.CSSProperties}
          >
            {betaItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="text-sm font-semibold leading-6 text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="animate-rise"
          style={{ "--rise-delay": "180ms" } as React.CSSProperties}
        >
          <BetaApplicationForm />
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeader
              eyebrow="Transparência"
              title="Beta é teste, não promessa."
              description="A plataforma ajuda a decidir prioridades, mas não tem vínculo oficial com MEC ou Inep e não garante nota específica."
            />
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Reveal>
              <Card>
                <CardContent>
                  <Radar className="h-6 w-6 text-blue-700" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-bold text-slate-950">Radar ENEM</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O Radar usa recorrência histórica e padrões de cobrança como
                    estimativa educacional. Ele não prevê questões exatas.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={70}>
              <Card>
                <CardContent>
                  <ClipboardCheck className="h-6 w-6 text-blue-700" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-bold text-slate-950">Conteúdo</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Questões oficiais antigas só entram na plataforma com fonte,
                    atribuição e revisão editorial adequadas.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={140}>
              <Card>
                <CardContent>
                  <ShieldCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-bold text-slate-950">Acesso</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O acesso à beta é liberado manualmente pela equipe, por
                    convite.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <Notice tone="warning" icon={AlertTriangle} className="mt-8">
              {transparencyItems.join(" ")}
            </Notice>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
