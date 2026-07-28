import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EssaySubmissionDetail } from "@/lib/db/types";
import {
  ESSAY_COMPETENCE_KEYS,
  ESSAY_COMPETENCE_LABELS,
  readEssayScoreRecord,
} from "@/lib/schemas/essay";

export function EssayFeedbackView({ essay }: { essay: EssaySubmissionDetail }) {
  const result = essay.essay_correction_results?.[0];
  if (essay.status !== "completed" || !result) {
    return null;
  }

  const { total: totalScore, competences } = readEssayScoreRecord(essay.scores);
  const feedback = readJsonRecord(essay.feedback);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-700" aria-hidden="true" />
            Correção recebida
          </CardTitle>
          {typeof totalScore === "number" ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200">
              {totalScore}/1000
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-white p-4 ring-1 ring-inset ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Comentário geral
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {result.general_text || "Resultado registrado sem texto publicado."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {ESSAY_COMPETENCE_KEYS.map((key) => {
            const score = competences[key];
            const comment = readText(feedback[key]);

            return (
              <div
                key={key}
                className="min-w-0 rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {ESSAY_COMPETENCE_LABELS[key]}
                  </p>
                  {typeof score === "number" ? (
                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {score}/200
                    </span>
                  ) : null}
                </div>
                {comment ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {comment}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
