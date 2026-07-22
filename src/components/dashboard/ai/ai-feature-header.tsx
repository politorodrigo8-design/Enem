import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiFeatureHeader({
  icon: Icon,
  title,
  description,
  titleClassName,
  descriptionClassName,
  iconClassName,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  titleClassName?: string;
  descriptionClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div>
      <p className={cn("flex items-center text-sm font-bold text-blue-950", titleClassName)}>
        <Icon className={cn("h-4 w-4 text-blue-700", iconClassName)} aria-hidden="true" />
        {title}
      </p>
      <p className={descriptionClassName}>{description}</p>
    </div>
  );
}
