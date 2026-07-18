import type { EvolutionPoint } from "@/types";

type SimpleBarChartProps = {
  data: EvolutionPoint[];
  metric?: "score" | "accuracy";
};

export function SimpleBarChart({ data, metric = "score" }: SimpleBarChartProps) {
  const max = Math.max(...data.map((item) => item[metric]));
  const min = metric === "score" ? Math.min(...data.map((item) => item[metric])) - 30 : 0;

  return (
    <div className="h-64">
      <div className="flex h-52 items-end gap-3">
        {data.map((item) => {
          const height = ((item[metric] - min) / (max - min || 1)) * 100;

          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end rounded-md bg-slate-100 p-1">
                <div
                  className="w-full rounded-md bg-blue-700"
                  style={{ height: `${Math.max(height, 12)}%` }}
                  aria-label={`${item.label}: ${item[metric]}`}
                />
              </div>
              <span className="text-xs font-medium text-slate-500">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
