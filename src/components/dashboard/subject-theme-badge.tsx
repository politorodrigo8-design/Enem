import type { HTMLAttributes } from "react";
import {
  getAreaTheme,
  getSubjectTheme,
  getThemeStyle,
} from "@/lib/subjects/subject-theme.mjs";
import { cn } from "@/lib/utils";

type ThemeBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  name: string;
  kind?: "subject" | "area";
};

export function ThemeBadge({
  name,
  kind = "subject",
  className,
  ...props
}: ThemeBadgeProps) {
  const theme = kind === "area" ? getAreaTheme(name) : getSubjectTheme(name);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset",
        className,
      )}
      style={{
        ...getThemeStyle(theme),
        backgroundColor: "var(--subject-bg)",
        color: "var(--subject-text)",
        borderColor: "var(--subject-border)",
        boxShadow: "inset 0 0 0 1px var(--subject-border)",
      }}
      title={theme.unmapped ? `Materia sem tema mapeado: ${name}` : undefined}
      {...props}
    >
      <span
        className="flex h-4 min-w-4 items-center justify-center rounded-[4px] px-1 text-[10px] font-bold leading-none text-white"
        style={{ backgroundColor: "var(--subject-accent)" }}
        aria-hidden="true"
      >
        {theme.icon}
      </span>
      {name}
    </span>
  );
}
