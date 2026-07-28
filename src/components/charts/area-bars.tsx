import { Progress } from "@/components/ui/progress";

type AreaBarsProps = {
  data: Array<{ area: string; accuracy: number; answered: number }>;
};

export function AreaBars({ data }: AreaBarsProps) {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.area}>
          <div className="mb-2 flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.area}</p>
              <p className="text-xs text-slate-500">{item.answered} questões</p>
            </div>
            <span className="tnum shrink-0 text-sm font-bold text-slate-950">
              {item.accuracy}%
            </span>
          </div>
          <Progress value={item.accuracy} tone={item.accuracy >= 70 ? "green" : "blue"} />
        </div>
      ))}
    </div>
  );
}
