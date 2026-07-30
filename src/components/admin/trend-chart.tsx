import { cn } from "@/lib/utils";

type TrendPoint = { date: string; value: number };

/**
 * Barras por dia para séries curtas (7–90 pontos). Sem biblioteca: o dashboard
 * não carrega runtime de gráfico para desenhar um retângulo por dia.
 */
export function TrendChart({
  data,
  format = (value: number) => String(Math.round(value)),
  emptyLabel = "Sem movimento no período.",
  className,
}: {
  data: TrendPoint[];
  format?: (value: number) => string;
  emptyLabel?: string;
  className?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 0);
  const total = data.reduce((sum, point) => sum + point.value, 0);

  if (!data.length || total === 0) {
    return (
      <div
        className={cn(
          "flex h-32 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex h-32 items-end gap-px" role="img" aria-label={describe(data, format)}>
        {data.map((point) => {
          const height = max ? (point.value / max) * 100 : 0;
          return (
            <div
              key={point.date}
              className="group relative flex h-full flex-1 items-end"
              title={`${formatDay(point.date)}: ${format(point.value)}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm transition-colors",
                  point.value > 0 ? "bg-blue-600 group-hover:bg-blue-700" : "bg-slate-200",
                )}
                style={{ height: `${Math.max(height, point.value > 0 ? 4 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{formatDay(data[0].date)}</span>
        <span className="tnum font-semibold text-slate-700">
          pico {format(max)}
        </span>
        <span>{formatDay(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

function formatDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function describe(data: TrendPoint[], format: (value: number) => string) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  return `Série de ${data.length} dias, total ${format(total)}.`;
}
