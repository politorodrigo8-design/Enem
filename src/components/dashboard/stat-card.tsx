import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  className?: string;
};

/** Tile de métrica padrão do dashboard (DESIGN.md: label discreto, valor tnum grande). */
export function StatCard({ label, value, helper, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {Icon ? <Icon className="h-4.5 w-4.5 text-slate-300" aria-hidden="true" /> : null}
      </div>
      <p className="tnum mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}
