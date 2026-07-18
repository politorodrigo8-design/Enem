import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "warning" | "danger" | "success";

const tones: Record<NoticeTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

type NoticeProps = {
  title?: string;
  children: React.ReactNode;
  tone?: NoticeTone;
  icon?: LucideIcon;
  className?: string;
};

export function Notice({
  title,
  children,
  tone = "info",
  icon: Icon = AlertTriangle,
  className,
}: NoticeProps) {
  return (
    <div className={cn("rounded-lg border p-4", tones[tone], className)}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className="text-sm leading-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
