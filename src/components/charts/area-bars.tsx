import { Progress } from "@/components/ui/progress";
import { getAreaTheme, getThemeStyle } from "@/lib/subjects/subject-theme.mjs";

type AreaBarsProps = {
  data: Array<{ area: string; accuracy: number; answered: number }>;
};

export function AreaBars({ data }: AreaBarsProps) {
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const theme = getAreaTheme(item.area);

        return (
          <div key={item.area}>
            <div className="mb-2 flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      ...getThemeStyle(theme),
                      backgroundColor: "var(--subject-accent)",
                    }}
                    aria-hidden="true"
                  />
                  {item.area}
                </p>
                <p className="text-xs text-slate-500">{item.answered} questões</p>
              </div>
              <span className="tnum shrink-0 text-sm font-bold text-slate-950">
                {item.accuracy}%
              </span>
            </div>
            <Progress value={item.accuracy} tone={item.accuracy >= 70 ? "green" : "blue"} />
          </div>
        );
      })}
    </div>
  );
}
