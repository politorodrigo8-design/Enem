import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EssaySubmissionDetail } from "@/lib/db/types";

export function EssayFeedbackView({ essay }: { essay: EssaySubmissionDetail }) {
  const result = essay.essay_correction_results?.[0];
  if (essay.status !== "completed" || !result) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {result.general_text || "Resultado registrado sem texto publicado."}
        </p>
      </CardContent>
    </Card>
  );
}
