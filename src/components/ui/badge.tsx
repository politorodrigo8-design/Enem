import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "blue" | "violet" | "green" | "red" | "slate" | "amber";

const tones: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "slate", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
