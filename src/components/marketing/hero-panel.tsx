import { ArrowUpRight, BookOpenCheck, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MiniTrend } from "@/components/charts/mini-trend";
import { evolutionData } from "@/data/student";

export function HeroPanel() {
  const priorities = ["Razão e proporção", "Ecologia", "Eletricidade"];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-700" aria-hidden="true" />
        <span className="font-mono text-xs text-slate-500">
          app.nexoenem.com/dashboard
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Painel estratégico</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              Nota estimada <span className="tnum">682</span>
            </p>
          </div>
          <Badge tone="green">
            <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            +18%
          </Badge>
        </div>
        <div className="grid gap-4 py-5 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <Target className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
              Foco
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">Matemática</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <BookOpenCheck className="h-5 w-5 text-slate-700" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Semana
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">54 questões</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <ArrowUpRight className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Evolução
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">+31 pontos</p>
          </div>
        </div>
        <MiniTrend data={evolutionData} />
        <div className="mt-5 space-y-3">
          {priorities.map((priority, index) => (
            <div key={priority}>
              <Progress
                value={[42, 57, 48][index]}
                tone={index === 0 ? "red" : "blue"}
                label={priority}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Recomendação da semana</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Priorize proporcionalidade antes de avançar para funções. É um
            gargalo recorrente e aparece em problemas de diferentes contextos.
          </p>
        </div>
      </div>
    </div>
  );
}
