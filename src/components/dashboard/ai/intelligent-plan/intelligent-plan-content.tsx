import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiBalanceAfterUse } from "../ai-balance-after-use";
import { AiMetricCard } from "../ai-metric-card";
import { AiSection } from "../ai-section";
import type { SmartStudyPlanResult } from "../ai-types";
import { IntelligentPlanDayCard } from "./intelligent-plan-day-card";

export function IntelligentPlanContent({
  result,
  balanceAfter,
  applying,
  onApply,
  onGenerateAnother,
  onBack,
}: {
  result: SmartStudyPlanResult;
  balanceAfter: number | null;
  applying: boolean;
  onApply: () => void;
  onGenerateAnother: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <AiSection title="Resumo do plano">
        <p>{result.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AiMetricCard label="Período" value={result.period.label} />
          <AiMetricCard label="Carga total" value={result.totals.totalHoursLabel} />
          <AiMetricCard label="Sessões" value={result.totals.totalSessions} />
          <AiMetricCard label="Questões sugeridas" value={result.totals.totalQuestions} />
        </div>
      </AiSection>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.days.map((day) => (
          <IntelligentPlanDayCard key={day.date} day={day} />
        ))}
      </div>
      <AiSection title="Metas da semana">
        <ul className="space-y-2">
          {result.weeklyGoals.map((goal) => (
            <li key={goal} className="flex gap-2 text-sm leading-6 text-slate-700">
              <Target className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              {goal}
            </li>
          ))}
        </ul>
      </AiSection>
      <AiSection title="Por que este plano foi recomendado?">
        <p>{result.recommendationReason}</p>
      </AiSection>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Button size="sm" onClick={onApply} disabled={applying}>
          {applying ? "Aplicando..." : "Aplicar este plano"}
        </Button>
        <Button variant="outline" size="sm" onClick={onGenerateAnother}>
          Gerar outro ajuste
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar ao plano atual
        </Button>
      </div>
      <AiBalanceAfterUse label="Saldo após este plano" value={balanceAfter} />
    </div>
  );
}
