import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEssaysLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full sm:h-20" />
      {/* O bloco de filtros empilha os cinco campos no mobile e vira
          uma fileira única só a partir de xl. */}
      <Skeleton className="h-[28rem] w-full sm:h-80 xl:h-28" />
      <Skeleton className="h-96 w-full xl:h-80" />
    </div>
  );
}

