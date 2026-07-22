import { Badge } from "@/components/ui/badge";
import type { SmartStudyPlanResult } from "../ai-types";
import { formatMinutes, formatTopicPath } from "../ai-utils";

export function IntelligentPlanSessionCard({
  session,
}: {
  session: SmartStudyPlanResult["days"][number]["sessions"][number];
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="slate">{session.period}</Badge>
        <Badge tone="blue">{session.type}</Badge>
      </div>
      <p className="mt-2 font-semibold text-slate-950">
        {formatTopicPath(session.area, session.subject, session.topic)}
      </p>
      <p className="tnum mt-1 text-sm text-slate-600">
        {formatMinutes(session.durationMinutes)}
        {session.questionGoal ? ` · Meta: ${session.questionGoal} questões` : ""}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{session.reason}</p>
    </div>
  );
}
