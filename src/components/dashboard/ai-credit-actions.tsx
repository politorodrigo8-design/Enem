"use client";

import { useState, useTransition } from "react";
import { Coins, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  AI_PERFORMANCE_ANALYSIS_CREDIT_COST,
  AI_QUESTION_EXPLANATION_CREDIT_COST,
  AI_STUDY_PLAN_CREDIT_COST,
} from "@/lib/ai/credits";
import {
  generatePerformanceAnalysisAction,
  generateQuestionExplanationAction,
  generateSmartStudyPlanAction,
} from "@/lib/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AiState = {
  output: string;
  balanceAfter?: number;
  model?: string;
};

export function QuestionExplanationCreditAction({
  questionId,
  selectedOption,
  disabled,
}: {
  questionId: string;
  selectedOption?: string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<AiState | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateQuestionExplanationAction({
        questionId,
        selectedOption: selectedOption || undefined,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok && result.output) {
        setState({
          output: result.output,
          balanceAfter: result.balanceAfter,
          model: result.model,
        });
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-blue-950">
            <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Explicar questao
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-700">
            Tira duvida sobre enunciado, alternativa e resolucao.
          </p>
        </div>
        <CreditPill cost={AI_QUESTION_EXPLANATION_CREDIT_COST} />
      </div>
      <Button
        className="mt-3"
        variant="outline"
        size="sm"
        full
        onClick={generate}
        disabled={disabled || pending}
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
        {pending ? "Gerando..." : disabled ? "Responda para explicar" : "Explicar com IA"}
      </Button>
      <AiOutput state={state} />
    </div>
  );
}

export function PerformanceAnalysisCreditAction({
  disabled,
}: {
  disabled?: boolean;
}) {
  const [state, setState] = useState<AiState | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generatePerformanceAnalysisAction();
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok && result.output) {
        setState({
          output: result.output,
          balanceAfter: result.balanceAfter,
          model: result.model,
        });
      }
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
              <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Analise de desempenho
            </p>
            <Badge tone="blue">{AI_PERFORMANCE_ANALYSIS_CREDIT_COST} creditos</Badge>
            <Badge tone="green">Groq ativa</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            Leitura dos erros recentes, padroes por assunto e proximos focos de treino.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={disabled || pending}
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
          {pending ? "Gerando..." : "Gerar analise"}
        </Button>
      </div>
      <AiOutput state={state} />
    </section>
  );
}

export function SmartStudyPlanCreditAction({
  disabled,
}: {
  disabled?: boolean;
}) {
  const [state, setState] = useState<AiState | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateSmartStudyPlanAction();
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok && result.output) {
        setState({
          output: result.output,
          balanceAfter: result.balanceAfter,
          model: result.model,
        });
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
              <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Plano inteligente
            </p>
            <Badge tone="blue">{AI_STUDY_PLAN_CREDIT_COST} creditos</Badge>
            <Badge tone="green">Groq ativa</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
            Ajuste da semana usando Radar, erros recentes e rotina informada.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={disabled || pending}
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
          {pending ? "Otimizando..." : "Otimizar plano"}
        </Button>
      </div>
      <AiOutput state={state} />
    </div>
  );
}

function CreditPill({ cost }: { cost: number }) {
  return (
    <span className="tnum inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-bold text-blue-800 ring-1 ring-inset ring-blue-100">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      {cost}
    </span>
  );
}

function AiOutput({ state }: { state: AiState | null }) {
  if (!state) return null;

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-800">
      <div className="whitespace-pre-line">{state.output}</div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        {typeof state.balanceAfter === "number" ? (
          <span className="tnum">Saldo: {state.balanceAfter}</span>
        ) : null}
        {state.model ? <span>Modelo: {state.model}</span> : null}
      </div>
    </div>
  );
}
