import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

/** Espelha o layout real de /dashboard: cabeçalho, card de meta, plano e 2 cards. */
export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 shrink-0" />
      </div>
      <Skeleton className="h-56 lg:h-40" />
      <Skeleton className="mt-6 h-72 sm:h-64" />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
