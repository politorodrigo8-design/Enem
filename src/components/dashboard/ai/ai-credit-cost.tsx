import Link from "next/link";
import { Coins } from "lucide-react";

export function AiCreditCost({ cost }: { cost: number }) {
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      Custo: {cost} crédito{cost === 1 ? "" : "s"}
    </p>
  );
}

/**
 * Aviso de saldo curto no próprio cartão da ação, com o caminho para completar
 * o saldo — o aluno vê antes de abrir o painel, não depois de confirmar.
 */
export function AiCreditShortage({
  cost,
  balance,
}: {
  cost: number;
  balance?: number | null;
}) {
  if (typeof balance !== "number" || balance >= cost) return null;

  return (
    <p className="mt-1.5 text-xs leading-5 text-amber-800">
      <span className="tnum font-bold">
        Seu saldo: {balance} {balance === 1 ? "crédito" : "créditos"}
      </span>{" "}
      —{" "}
      <Link
        href="/dashboard/creditos"
        className="font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        comprar créditos
      </Link>
    </p>
  );
}
