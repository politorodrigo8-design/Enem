import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Acordeão padrão do dashboard: <details> nativo (animação suave vem do CSS
 * global) com visual de Card. Único formato para blocos colapsáveis — não
 * recriar variações com estado manual.
 */
export function AccordionCard({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 sm:px-5 [&::-webkit-details-marker]:hidden">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
    </details>
  );
}

/** Linha rótulo/valor das listas de detalhe (usar dentro de <dl>). */
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}
