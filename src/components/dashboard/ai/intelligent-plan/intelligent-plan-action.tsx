"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AI_STUDY_PLAN_CREDIT_COST } from "@/lib/ai/credits";
import {
  applySmartStudyPlanAction,
  generateSmartStudyPlanAction,
} from "@/lib/actions/ai";
import { AiConfirmationDialog } from "../ai-confirmation-dialog";
import { AiCreditCost } from "../ai-credit-cost";
import { AiFeatureHeader } from "../ai-feature-header";
import { AiGenerationError } from "../ai-generation-error";
import { AiResponsivePanel } from "../ai-responsive-panel";
import {
  loadImportedPriorities,
  saveImportedPriorities,
} from "../ai-utils";
import type { ImportedPriority, SmartStudyPlanResult } from "../ai-types";
import { ImportedPriorities } from "./imported-priorities";
import { IntelligentPlanContent } from "./intelligent-plan-content";
import { IntelligentPlanSkeleton } from "./intelligent-plan-skeleton";

export function SmartStudyPlanCreditAction({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SmartStudyPlanResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importedPriorities, setImportedPriorities] = useState<ImportedPriority[]>(() =>
    loadImportedPriorities(),
  );
  const [pending, startTransition] = useTransition();

  function removePriority(topic: string) {
    const next = importedPriorities.filter((priority) => priority.topic !== topic);
    setImportedPriorities(next);
    saveImportedPriorities(next);
  }

  function generate(force = false) {
    if (result && !force) return;
    setError("");
    startTransition(async () => {
      const response = await generateSmartStudyPlanAction({
        importedPriorities,
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.studyPlan) {
        setResult(response.studyPlan);
        setBalanceAfter(response.balanceAfter ?? null);
      } else {
        setError(response.message);
      }
    });
  }

  function generateAnother() {
    const confirmed = window.confirm(
      `Gerar outro ajuste consome ${AI_STUDY_PLAN_CREDIT_COST} créditos. Deseja continuar?`,
    );
    if (confirmed) generate(true);
  }

  function applyPlan() {
    if (!result) return;
    startTransition(async () => {
      const response = await applySmartStudyPlanAction(result);
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <AiFeatureHeader
            icon={CalendarDays}
            title="Plano inteligente"
            description="Ajuste sua semana com base no Radar ENEM, nos erros recentes e na sua rotina de estudos."
            titleClassName="gap-2"
            descriptionClassName="mt-1 max-w-2xl text-sm leading-6 text-slate-700"
          />
          <AiCreditCost cost={AI_STUDY_PLAN_CREDIT_COST} />
        </div>
        <Button
          ref={openerRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Otimizar meu plano
        </Button>
      </div>
      <AiResponsivePanel
        open={open}
        title="Plano inteligente"
        mode="modal"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        wide
      >
        {!result && !pending && !error ? (
          <AiConfirmationDialog
            description="O plano será reorganizado respeitando sua rotina cadastrada, o Radar ENEM e as prioridades importadas."
            cost={AI_STUDY_PLAN_CREDIT_COST}
            buttonLabel="Confirmar otimização"
            onConfirm={() => generate()}
          >
            <ImportedPriorities priorities={importedPriorities} onRemove={removePriority} />
          </AiConfirmationDialog>
        ) : null}
        {pending ? <IntelligentPlanSkeleton /> : null}
        {error ? (
          <AiGenerationError
            message={error}
            fallback="Não foi possível otimizar o plano agora."
            onRetry={() => generate(true)}
          />
        ) : null}
        {result ? (
          <IntelligentPlanContent
            result={result}
            balanceAfter={balanceAfter}
            applying={pending}
            onApply={applyPlan}
            onGenerateAnother={generateAnother}
            onBack={() => setOpen(false)}
          />
        ) : null}
      </AiResponsivePanel>
    </div>
  );
}
