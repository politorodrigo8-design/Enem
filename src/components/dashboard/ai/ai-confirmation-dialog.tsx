import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiCreditCost } from "./ai-credit-cost";

export function AiConfirmationDialog({
  description,
  cost,
  buttonLabel,
  onConfirm,
  children,
}: {
  description: string;
  cost: number;
  buttonLabel: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm leading-6 text-slate-700">{description}</p>
      <AiCreditCost cost={cost} />
      {children}
      <Button className="mt-4" onClick={onConfirm}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </div>
  );
}
