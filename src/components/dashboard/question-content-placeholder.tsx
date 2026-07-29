import { Skeleton } from "@/components/ui/skeleton";

/**
 * Enunciado e alternativas chegam sob demanda, uma questão por vez. Enquanto o
 * conteúdo não volta, o card mantém a altura e o ritmo do texto real para que a
 * página não pule quando ele entra.
 */
export function QuestionStatementPlaceholder() {
  return (
    <div className="space-y-2.5" role="status" aria-label="Carregando o enunciado">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-10/12" />
      <Skeleton className="h-5 w-7/12" />
    </div>
  );
}

export function QuestionOptionsPlaceholder() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando as alternativas">
      {["A", "B", "C", "D", "E"].map((key) => (
        <div
          key={key}
          className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-400">
            {key}
          </span>
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
