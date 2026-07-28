import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export function InsufficientPerformanceData() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h3 className="text-base font-bold text-amber-950">Ainda precisamos de mais respostas</h3>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Responda mais algumas questões para receber uma análise de desempenho mais precisa.
      </p>
      <Link
        href="/dashboard/praticar?tab=banco"
        className={buttonClasses({ variant: "secondary", className: "mt-4" })}
      >
        Continuar praticando
      </Link>
    </div>
  );
}
