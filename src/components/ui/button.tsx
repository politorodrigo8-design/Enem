import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-700 text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800 focus-visible:outline-blue-700",
  secondary:
    "bg-violet-600 text-white shadow-sm shadow-violet-900/20 hover:bg-violet-700 focus-visible:outline-violet-600",
  outline:
    "border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-blue-700",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-500",
  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-700 focus-visible:outline-rose-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  full = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
    variantStyles[variant],
    sizeStyles[size],
    full && "w-full",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, full, className })}
      {...props}
    />
  );
}
