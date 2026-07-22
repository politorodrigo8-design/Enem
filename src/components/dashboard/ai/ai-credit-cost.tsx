import { Coins } from "lucide-react";

export function AiCreditCost({ cost }: { cost: number }) {
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      Custo: {cost} crédito{cost === 1 ? "" : "s"}
    </p>
  );
}
