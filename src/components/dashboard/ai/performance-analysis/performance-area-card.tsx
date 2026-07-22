import type { PerformanceAnalysisResult } from "../ai-types";

export function PerformanceAreaCard({
  area,
}: {
  area: PerformanceAnalysisResult["areaPerformance"][number];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-950">{area.area}</p>
      <p className="mt-1 text-sm text-slate-600">
        {area.correct} acertos em {area.answered} questões
      </p>
      <p className="tnum mt-2 text-lg font-bold text-blue-800">{area.accuracy}% de aproveitamento</p>
    </div>
  );
}
