import { Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiBalanceAfterUse } from "../ai-balance-after-use";
import { AiMetricCard } from "../ai-metric-card";
import { AiSection } from "../ai-section";
import { importPriorities } from "../ai-utils";
import type { PerformanceAnalysisResult } from "../ai-types";
import { PerformanceAreaCard } from "./performance-area-card";
import { PerformancePriorityCard } from "./performance-priority-card";

export function PerformanceAnalysisContent({
  result,
  balanceAfter,
}: {
  result: PerformanceAnalysisResult;
  balanceAfter: number | null;
}) {
  return (
    <div className="space-y-6">
      <AiSection title="Escopo da análise">
        <p>{result.analysisScope.periodLabel}</p>
      </AiSection>
      <AiSection title="Visão geral">
        <p>{result.overview}</p>
      </AiSection>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AiMetricCard label="Questões analisadas" value={result.metrics.answered} />
        <AiMetricCard label="Acertos" value={result.metrics.correct} />
        <AiMetricCard label="Erros" value={result.metrics.incorrect} />
        <AiMetricCard label="Taxa de acertos" value={`${result.metrics.accuracy}%`} />
        {result.metrics.bestArea ? <AiMetricCard label="Melhor desempenho" value={result.metrics.bestArea} /> : null}
        {result.metrics.priorityArea ? <AiMetricCard label="Maior dificuldade" value={result.metrics.priorityArea} /> : null}
      </div>
      <AiSection title="Desempenho por área">
        <div className="grid gap-3 sm:grid-cols-2">
          {result.areaPerformance.map((area) => (
            <PerformanceAreaCard key={area.area} area={area} />
          ))}
        </div>
      </AiSection>
      {result.errorPatterns.length ? (
        <AiSection title="Padrões de erro identificados">
          <div className="space-y-3">
            {result.errorPatterns.map((pattern) => (
              <div key={pattern.title} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{pattern.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{pattern.evidence}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{pattern.explanation}</p>
              </div>
            ))}
          </div>
        </AiSection>
      ) : null}
      <AiSection title="Conteúdos para priorizar">
        <div className="space-y-3">
          {result.priorities.map((priority) => (
            <PerformancePriorityCard key={priority.topic} priority={priority} />
          ))}
        </div>
      </AiSection>
      <AiSection title="Próximos passos">
        <div className="grid gap-3 sm:grid-cols-3">
          {result.nextSteps.map((step) => (
            <div key={step.label} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">{step.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.action}</p>
            </div>
          ))}
        </div>
      </AiSection>
      <AiSection title="Evolução recente">
        <p>{result.recentEvolution.message}</p>
      </AiSection>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <AiBalanceAfterUse label="Saldo após esta análise" value={balanceAfter} />
        <Button variant="outline" size="sm" onClick={() => importPriorities(result.priorities)}>
          <Clipboard className="h-4 w-4" aria-hidden="true" />
          Usar prioridades no Plano inteligente
        </Button>
      </div>
    </div>
  );
}
