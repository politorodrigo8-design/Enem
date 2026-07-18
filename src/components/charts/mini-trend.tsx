import type { EvolutionPoint } from "@/types";

export function MiniTrend({ data }: { data: EvolutionPoint[] }) {
  return (
    <div className="grid grid-cols-6 items-end gap-2">
      {data.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="h-20 rounded-md bg-slate-100 p-1">
            <div
              className="mt-auto rounded-md bg-violet-600"
              style={{ height: `${Math.max(item.accuracy, 16)}%` }}
            />
          </div>
          <p className="text-center text-xs font-medium text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
