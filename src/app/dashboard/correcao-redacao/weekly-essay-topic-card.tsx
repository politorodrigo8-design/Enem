"use client";

import {
  BookOpenText,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AiBalanceAfterUse } from "@/components/dashboard/ai/ai-balance-after-use";
import { AiConfirmationDialog } from "@/components/dashboard/ai/ai-confirmation-dialog";
import { AiResponsivePanel } from "@/components/dashboard/ai/ai-responsive-panel";
import { AiSection } from "@/components/dashboard/ai/ai-section";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  WEEKLY_ESSAY_TOPIC_UNLOCK_COST,
  type WeeklyEssayTopic,
} from "@/data/weekly-essay-topics";
import { unlockWeeklyEssayTopicAction } from "@/lib/actions/credits";

export function WeeklyEssayTopicCard({
  topic,
  topicCount,
  creditBalance,
  initiallyUnlocked,
  otherTopicsHref,
  onUseTopic,
  onBalanceChange,
}: {
  topic: WeeklyEssayTopic;
  topicCount: number;
  creditBalance: number;
  initiallyUnlocked: boolean;
  otherTopicsHref?: string;
  onUseTopic: () => void;
  onBalanceChange: (balance: number) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [balanceAfterUnlock, setBalanceAfterUnlock] = useState<number | null>(null);
  const [unlockError, setUnlockError] = useState("");
  const [unlockPending, startUnlockTransition] = useTransition();
  const openerRef = useRef<HTMLButtonElement>(null);
  const showOtherTopics = Boolean(otherTopicsHref) && topicCount > 1;

  function unlockProposal() {
    setUnlockError("");
    if (creditBalance < WEEKLY_ESSAY_TOPIC_UNLOCK_COST) {
      const message = "Saldo insuficiente para liberar a proposta completa.";
      setUnlockError(message);
      toast.error(message);
      return;
    }

    startUnlockTransition(async () => {
      const response = await unlockWeeklyEssayTopicAction({
        topicId: topic.id,
        topicTitle: topic.title,
      });
      toast[response.ok ? "success" : "error"](response.message);

      if (!response.ok) {
        setUnlockError(response.message);
        return;
      }

      setUnlocked(true);
      const nextBalance = response.balanceAfter ?? creditBalance - WEEKLY_ESSAY_TOPIC_UNLOCK_COST;
      setBalanceAfterUnlock(nextBalance);
      onBalanceChange(nextBalance);
    });
  }

  return (
    <section>
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-inset ring-blue-50 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                <BookOpenText className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Tema sugerido da semana
                </p>
                <h2 className="mt-1 text-base font-bold leading-6 text-slate-950 sm:text-lg">
                  {topic.title}
                </h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {topic.shortDescription}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:justify-end">
            <Button type="button" size="sm" onClick={onUseTopic}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Usar este tema
            </Button>
            <Button
              ref={openerRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen(true)}
              aria-haspopup="dialog"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Ver proposta completa
              {unlocked ? null : (
                <span className="hidden text-xs font-bold text-slate-500 sm:inline">
                  1 crédito
                </span>
              )}
            </Button>
          </div>
        </div>

        {showOtherTopics ? (
          <Link
            href={otherTopicsHref as string}
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "mt-3 px-0 text-blue-700 hover:bg-transparent hover:text-blue-800",
            })}
          >
            Ver outros temas
          </Link>
        ) : null}
      </div>

      <AiResponsivePanel
        open={panelOpen}
        title="Proposta completa"
        mode="drawer"
        busy={unlockPending}
        openerRef={openerRef}
        onClose={() => setPanelOpen(false)}
        action={
          unlocked ? (
            <Button type="button" size="sm" onClick={onUseTopic}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Usar tema
            </Button>
          ) : null
        }
      >
        {unlockPending ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm font-semibold text-blue-950">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-blue-700" aria-hidden="true" />
            Liberando proposta completa...
          </div>
        ) : null}

        {!unlocked && !unlockPending ? (
          <AiConfirmationDialog
            description="A proposta completa traz comando, textos motivadores, eixos e repertórios para treino. A liberação consome 1 crédito uma única vez para este tema semanal."
            cost={WEEKLY_ESSAY_TOPIC_UNLOCK_COST}
            buttonLabel="Liberar proposta completa"
            onConfirm={unlockProposal}
          >
            <p className="text-xs font-semibold text-slate-500">
              Saldo atual: {creditBalance} créditos.
            </p>
            {unlockError ? (
              <p className="mt-2 text-sm font-medium text-rose-600">{unlockError}</p>
            ) : null}
          </AiConfirmationDialog>
        ) : null}

        {unlocked ? (
          <WeeklyEssayTopicPanelContent
            topic={topic}
            balanceAfterUnlock={balanceAfterUnlock}
          />
        ) : null}
      </AiResponsivePanel>
    </section>
  );
}

function WeeklyEssayTopicPanelContent({
  topic,
  balanceAfterUnlock,
}: {
  topic: WeeklyEssayTopic;
  balanceAfterUnlock: number | null;
}) {
  return (
    <div className="space-y-6">
      <AiSection title="Tema">
        <p className="text-base font-bold leading-7 text-slate-950">{topic.title}</p>
      </AiSection>

      <AiSection title="Comando da proposta">
        <p>{topic.command}</p>
      </AiSection>

      <AiSection title="Textos motivadores">
        <div className="space-y-3">
          {topic.motivatingTexts.map((motivatingText) => (
            <article
              key={motivatingText.title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                {motivatingText.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {motivatingText.text}
              </p>
            </article>
          ))}
        </div>
      </AiSection>

      <AiSection title="Possíveis eixos de discussão">
        <div className="flex flex-wrap gap-2">
          {topic.discussionAxes.map((axis) => (
            <Badge key={axis} tone="blue">
              {axis}
            </Badge>
          ))}
        </div>
      </AiSection>

      <AiSection title="Sugestões de repertório">
        <ul className="space-y-2">
          {topic.suggestedRepertoires.map((repertoire) => (
            <li key={repertoire} className="flex gap-2">
              <ListChecks className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              <span>{repertoire}</span>
            </li>
          ))}
        </ul>
      </AiSection>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <div className="flex gap-3">
          <PenLine className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-700" aria-hidden="true" />
          <p>
            Produza um texto dissertativo-argumentativo em modalidade escrita formal
            da língua portuguesa. Use os textos motivadores apenas como apoio:
            eles não devem ser copiados integralmente.
          </p>
        </div>
      </div>

      <AiBalanceAfterUse label="Saldo após liberar a proposta" value={balanceAfterUnlock} />
    </div>
  );
}
