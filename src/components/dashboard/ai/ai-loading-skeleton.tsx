import { cn } from "@/lib/utils";

export function AiLoadingSkeleton({
  title,
  rows,
  grid,
}: {
  title: string;
  rows: number;
  grid?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className={cn("mt-4 gap-3", grid ? "grid sm:grid-cols-2 lg:grid-cols-3" : "space-y-3")}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
