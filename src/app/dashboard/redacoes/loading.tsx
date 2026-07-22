import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEssaysLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

