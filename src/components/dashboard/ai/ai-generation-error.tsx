import Link from "next/link";
import { Coins } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { isInsufficientCreditsMessage } from "./ai-utils";

export function AiGenerationError({
  message,
  fallback,
  onRetry,
}: {
  message: string;
  fallback: string;
  onRetry: () => void;
}) {
  const text = message || fallback;
  // Sem saldo, "tentar novamente" falha para sempre: a saída útil é completar o saldo.
  const outOfCredits = isInsufficientCreditsMessage(text);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-900">{text}</p>
      {outOfCredits ? (
        <>
          <p className="mt-1.5 text-sm leading-6 text-rose-900">
            Complete seu saldo para continuar usando as ações de IA. Os créditos
            entram na conta assim que o pagamento é confirmado.
          </p>
          <Link
            href="/dashboard/creditos"
            className={buttonClasses({ variant: "primary", size: "sm", className: "mt-4" })}
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Ver pacotes de crédito
          </Link>
        </>
      ) : (
        <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
