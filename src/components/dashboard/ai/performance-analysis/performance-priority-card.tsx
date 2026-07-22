import { Badge } from "@/components/ui/badge";
import type { PerformanceAnalysisResult } from "../ai-types";
import { formatTopicPath } from "../ai-utils";

export function PerformancePriorityCard({
  priority,
}: {
  priority: PerformanceAnalysisResult["priorities"][number];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-950">
        {priority.rank}. {formatTopicPath(priority.area, priority.subject, priority.topic)}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">Motivo: {priority.reason}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">
        Próxima ação: {priority.recommendedAction}
      </p>
      <Badge tone="blue" className="mt-3">Meta: {priority.questionGoal} questões</Badge>
    </div>
  );
}
