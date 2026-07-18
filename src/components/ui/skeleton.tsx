import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32" />
      ))}
      <Skeleton className="h-80 md:col-span-2 xl:col-span-3" />
      <Skeleton className="h-80" />
    </div>
  );
}
