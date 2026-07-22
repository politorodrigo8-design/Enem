"use client";

import { useRef, useState, useTransition } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AI_PERFORMANCE_ANALYSIS_CREDIT_COST } from "@/lib/ai/credits";
import { generatePerformanceAnalysisAction } from "@/lib/actions/ai";
import { AiConfirmationDialog } from "../ai-confirmation-dialog";
import { AiCreditCost } from "../ai-credit-cost";
import { AiFeatureHeader } from "../ai-feature-header";
import { AiGenerationError } from "../ai-generation-error";
import { AiResponsivePanel } from "../ai-responsive-panel";
import type { PerformanceAnalysisResult } from "../ai-types";
import { InsufficientPerformanceData } from "./insufficient-performance-data";
import { PerformanceAnalysisContent } from "./performance-analysis-content";
import { PerformanceAnalysisSkeleton } from "./performance-analysis-skeleton";

export function PerformanceAnalysisCreditAction({ disabled }: { disabled?: boolean }) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PerformanceAnalysisResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [insufficientData, setInsufficientData] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError("");
    setInsufficientData(false);
    startTransition(async () => {
      const response = await generatePerformanceAnalysisAction();
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.performanceAnalysis) {
        setResult(response.performanceAnalysis);
        setBalanceAfter(response.balanceAfter ?? null);
      } else if (!response.ok) {
        setInsufficientData(Boolean(response.insufficientData));
        setError(response.message);
      }
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <AiFeatureHeader
            icon={BarChart3}
            title="Análise de desempenho"
            description="Entenda seus erros recentes, identifique padrões e veja quais conteúdos devem ser priorizados nos próximos estudos."
            titleClassName="gap-2"
            descriptionClassName="mt-1 max-w-3xl text-sm leading-6 text-slate-700"
          />
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
            Esta análise considera suas respostas recentes, taxa de acertos, assuntos com maior dificuldade e desempenho por área.
          </p>
          <AiCreditCost cost={AI_PERFORMANCE_ANALYSIS_CREDIT_COST} />
        </div>
        <Button
          ref={openerRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Analisar meu desempenho
        </Button>
      </div>
      <AiResponsivePanel
        open={open}
        title="Análise de desempenho"
        mode="modal"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        wide
      >
        {!result && !pending && !error ? (
          <AiConfirmationDialog
            description="A análise será baseada nos seus resultados recentes e nas métricas calculadas pela plataforma."
            cost={AI_PERFORMANCE_ANALYSIS_CREDIT_COST}
            buttonLabel="Confirmar análise"
            onConfirm={generate}
          />
        ) : null}
        {pending ? <PerformanceAnalysisSkeleton /> : null}
        {error ? (
          insufficientData ? <InsufficientPerformanceData /> : (
            <AiGenerationError
              message={error}
              fallback="Não foi possível concluir a análise agora."
              onRetry={generate}
            />
          )
        ) : null}
        {result ? (
          <PerformanceAnalysisContent result={result} balanceAfter={balanceAfter} />
        ) : null}
      </AiResponsivePanel>
    </section>
  );
}
