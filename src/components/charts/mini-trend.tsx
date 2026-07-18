import type { EvolutionPoint } from "@/types";

export function MiniTrend({ data }: { data: EvolutionPoint[] }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {data.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex h-20 items-end rounded-md bg-slate-100 p-1">
            <div
              className="w-full rounded-sm bg-blue-600"
              style={{ height: `${Math.max(item.accuracy, 8)}%` }}
            />
          </div>
          <p className="text-center text-xs font-medium text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
