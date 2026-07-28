import type { ReactNode } from "react";
import Link from "next/link";
import { Coins, Sparkles } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { AiCreditCost } from "./ai-credit-cost";

export function AiConfirmationDialog({
  description,
  cost,
  balance,
  buttonLabel,
  onConfirm,
  children,
}: {
  description: string;
  cost: number;
  balance?: number | null;
  buttonLabel: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const knownBalance = typeof balance === "number" ? balance : null;
  // Com o saldo conhecido a parede vem antes do gasto: sem crédito não existe
  // botão de confirmar, existe caminho para completar o saldo.
  const missing = knownBalance !== null ? cost - knownBalance : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm leading-6 text-slate-700">{description}</p>
        <AiCreditCost cost={cost} />
        {knownBalance !== null ? (
          <p className="tnum mt-1 text-xs font-semibold text-slate-600">
            Seu saldo: {knownBalance} {knownBalance === 1 ? "crédito" : "créditos"}
          </p>
        ) : null}
      </div>
      {children ? <div>{children}</div> : null}
      {missing > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Seu saldo não cobre esta ação
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {missing === 1 ? "Falta 1 crédito" : `Faltam ${missing} créditos`}.
            Complete o saldo para usar esta ação — os créditos entram na conta assim
            que o pagamento é confirmado.
          </p>
          <Link
            href="/dashboard/creditos"
            className={buttonClasses({ variant: "primary", size: "sm", className: "mt-4" })}
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            Ver pacotes de crédito
          </Link>
        </div>
      ) : (
        <Button onClick={onConfirm}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
