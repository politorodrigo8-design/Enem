import type { SmartStudyPlanResult } from "../ai-types";
import { formatDateLabel } from "../ai-utils";
import { IntelligentPlanSessionCard } from "./intelligent-plan-session-card";

export function IntelligentPlanDayCard({
  day,
}: {
  day: SmartStudyPlanResult["days"][number];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-bold capitalize text-slate-950">
        {day.dayLabel}, {formatDateLabel(day.date)}
      </h3>
      <div className="mt-3 space-y-3">
        {day.sessions.map((session) => (
          <IntelligentPlanSessionCard
            key={`${day.date}-${session.period}-${session.topic}`}
            session={session}
          />
        ))}
      </div>
    </div>
  );
}
