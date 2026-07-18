import { clampPercent, cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  label?: string;
  tone?: "blue" | "violet" | "green" | "red";
  className?: string;
};

const tones = {
  blue: "bg-blue-700",
  violet: "bg-violet-600",
  green: "bg-emerald-500",
  red: "bg-rose-500",
};

export function Progress({
  value,
  label,
  tone = "blue",
  className,
}: ProgressProps) {
  const safeValue = clampPercent(value);

  return (
    <div className={className}>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="font-semibold text-slate-950">{safeValue}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-md bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className={cn("h-full rounded-md transition-all", tones[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
