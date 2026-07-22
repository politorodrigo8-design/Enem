"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AI_QUESTION_EXPLANATION_CREDIT_COST } from "@/lib/ai/credits";
import { generateQuestionExplanationAction } from "@/lib/actions/ai";
import { AiConfirmationDialog } from "../ai-confirmation-dialog";
import { AiCreditCost } from "../ai-credit-cost";
import { AiFeatureHeader } from "../ai-feature-header";
import { AiGenerationError } from "../ai-generation-error";
import { AiResponsivePanel } from "../ai-responsive-panel";
import { copyExplanation } from "../ai-utils";
import type { QuestionExplanationResult } from "../ai-types";
import { QuestionExplanationContent } from "./question-explanation-content";
import { QuestionExplanationSkeleton } from "./question-explanation-skeleton";

export function QuestionExplanationCreditAction({
  questionId,
  selectedOption,
  disabled,
}: {
  questionId: string;
  selectedOption?: string;
  disabled?: boolean;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<QuestionExplanationResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function generate() {
    setError("");
    startTransition(async () => {
      const response = await generateQuestionExplanationAction({
        questionId,
        selectedOption: selectedOption || undefined,
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.questionExplanation) {
        setResult(response.questionExplanation);
        setBalanceAfter(response.balanceAfter ?? null);
      } else {
        setError(response.message);
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <AiFeatureHeader
            icon={Sparkles}
            title="Explicar questão"
            description="Entenda o enunciado, as alternativas e a resolução passo a passo."
            titleClassName="gap-1.5"
            descriptionClassName="mt-1 text-xs leading-5 text-slate-700"
          />
          <AiCreditCost cost={AI_QUESTION_EXPLANATION_CREDIT_COST} />
        </div>
      </div>
      <Button
        ref={openerRef}
        className="mt-3"
        variant="outline"
        size="sm"
        full
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {disabled ? "Responda para explicar" : "Explicar com IA"}
      </Button>
      <AiResponsivePanel
        open={open}
        title="Explicação da questão"
        mode="drawer"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        action={
          result ? (
            <Button variant="outline" size="sm" onClick={() => copyExplanation(result)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar explicação
            </Button>
          ) : null
        }
      >
        {!result && !pending && !error ? (
          <AiConfirmationDialog
            description="A explicação será criada com base no enunciado, nas alternativas, no gabarito e na sua resposta marcada."
            cost={AI_QUESTION_EXPLANATION_CREDIT_COST}
            buttonLabel="Confirmar explicação"
            onConfirm={generate}
          />
        ) : null}
        {pending ? <QuestionExplanationSkeleton /> : null}
        {error ? (
          <AiGenerationError
            message={error}
            fallback="Não foi possível gerar a explicação agora."
            onRetry={generate}
          />
        ) : null}
        {result ? (
          <QuestionExplanationContent result={result} balanceAfter={balanceAfter} />
        ) : null}
      </AiResponsivePanel>
    </div>
  );
}
