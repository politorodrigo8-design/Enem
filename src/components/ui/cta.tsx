import { cn } from "@/lib/utils";

/* CTA das páginas públicas: mais alto, mais redondo e mais pesado que o
   primitivo `Button` (que carrega a densidade de trabalho do dashboard).
   Fonte única de altura, raio e peso — nenhuma página repete esses valores. */

type CtaVariant = "primary" | "outline" | "inverse";
type CtaSize = "md" | "lg";

const variantStyles: Record<CtaVariant, string> = {
  primary:
    "bg-blue-700 text-white shadow-sm shadow-blue-900/15 hover:bg-blue-800 focus-visible:outline-blue-700",
  outline:
    "border border-blue-100 bg-white text-blue-800 shadow-sm shadow-blue-900/5 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-blue-700",
  inverse:
    "bg-white text-blue-800 shadow-sm shadow-blue-950/10 hover:bg-blue-50 focus-visible:outline-white",
};

// `lg` é o CTA de seção; `md` é o do cabeçalho. Ambos ≥ 44px de alvo de toque.
const sizeStyles: Record<CtaSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base sm:h-[52px]",
};

export function ctaClasses({
  variant = "primary",
  size = "lg",
  full = false,
  className,
}: {
  variant?: CtaVariant;
  size?: CtaSize;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
    variantStyles[variant],
    sizeStyles[size],
    full && "w-full",
    className,
  );
}
