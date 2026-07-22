import { cn } from "@/lib/utils";

/**
 * Revela o conteúdo quando entra no viewport. A observação fica centralizada
 * em RevealController para evitar um observer e um setState por item.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal-fx", className)}
    >
      {children}
    </div>
  );
}
