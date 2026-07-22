import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiBalanceAfterUse } from "../ai-balance-after-use";
import { AiSection } from "../ai-section";
import { formatTopicPath } from "../ai-utils";
import type { QuestionExplanationResult } from "../ai-types";

export function QuestionExplanationContent({
  result,
  balanceAfter,
}: {
  result: QuestionExplanationResult;
  balanceAfter: number | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Badge tone="blue">{formatTopicPath(result.area, result.subject, result.topic)}</Badge>
      </div>
      <AiSection title="Entendendo o problema">
        <p>{result.problemSummary}</p>
      </AiSection>
      <AiSection title="Resolução passo a passo">
        <ol className="space-y-3">
          {result.steps.map((step, index) => (
            <li key={`${step.title}-${index}`} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">{index + 1}. {step.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.explanation}</p>
              {step.calculation ? (
                <p className="tnum mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                  {step.calculation}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </AiSection>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-bold text-emerald-950">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Resposta correta
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-900">
          Alternativa {result.correctAnswer.option}
          {result.correctAnswer.value ? ` — ${result.correctAnswer.value}` : ""}
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">{result.correctAnswer.explanation}</p>
      </div>
      {result.studentAnswer.available ? (
        <AiSection title="Sua resposta">
          <p className="font-semibold text-slate-950">
            Você marcou: alternativa {result.studentAnswer.option}
            {result.studentAnswer.value ? ` — ${result.studentAnswer.value}` : ""}
          </p>
          {result.studentAnswer.explanation ? <p className="mt-2">{result.studentAnswer.explanation}</p> : null}
        </AiSection>
      ) : null}
      {result.alternativesAnalysis.length ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-950">
            Por que as outras alternativas não servem?
          </summary>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {result.alternativesAnalysis.map((item) => (
              <li key={item.option}>
                <span className="font-semibold">Alternativa {item.option}</span>
                {item.value ? ` — ${item.value}` : ""}: {item.explanation}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <AiSection title="Dica para questões parecidas">
        <p>{result.tip}</p>
      </AiSection>
      <AiBalanceAfterUse label="Saldo após esta explicação" value={balanceAfter} />
    </div>
  );
}
