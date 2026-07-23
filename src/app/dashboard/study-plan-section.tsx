"use client";

import { CalendarDays, CheckCircle2, PlayCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { SmartStudyPlanCreditAction } from "@/components/dashboard/ai-credit-actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  completeStudyPlanItemAction,
  generateStudyPlanAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { StudyPlanWithItems } from "@/lib/db/types";
import { appDateISO, formatAppDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function StudyPlanSection({
  plan,
  access,
}: {
  plan: StudyPlanWithItems | null;
  access: AccessContext;
}) {
  const [pending, startTransition] = useTransition();
  const today = appDateISO();
  const tasks = useMemo(
    () =>
      (plan?.study_plan_items ?? [])
        .slice()
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [plan],
  );
  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  function generate() {
    startTransition(async () => {
      const result = await generateStudyPlanAction();
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  function complete(itemId: string) {
    startTransition(async () => {
      const result = await completeStudyPlanItemAction(itemId);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  if (!tasks.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={CalendarDays}
          title="Sua semana ainda não tem plano"
          description="O plano distribui seus assuntos prioritários pelos dias que você marcou como disponíveis, com uma meta de questões por dia."
          action={
            <Button onClick={generate} disabled={pending || !access.hasPlatformAccess}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Gerar plano da semana
            </Button>
          }
        />
        <SmartStudyPlanCreditAction disabled={!access.hasPlatformAccess} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Sua semana</CardTitle>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {completed} de {tasks.length}{" "}
            {tasks.length === 1 ? "atividade concluída" : "atividades concluídas"} —
            cada atividade se conclui sozinha quando a meta de questões do dia é
            atingida.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={pending || !access.hasPlatformAccess}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Regenerar plano
        </Button>
      </CardHeader>
      <CardContent>
        <Progress value={progress} label="Semana concluída" tone="green" />
        <ul className="mt-4 divide-y divide-slate-100">
          {tasks.map((task) => {
            const isToday = task.scheduled_date === today;
            const isPast = task.scheduled_date < today;

            return (
              <li
                key={task.id}
                className={cn(
                  "flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between",
                  isToday && "-mx-2 rounded-lg bg-blue-50/60 px-2",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold capitalize text-slate-950">
                      {formatAppDateTime(`${task.scheduled_date}T12:00:00-03:00`, {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                    {task.completed ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Concluída
                      </span>
                    ) : isToday ? (
                      <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        Hoje
                      </span>
                    ) : isPast ? (
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        Não feita
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {task.topics.subjects.name}: {task.topics.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 md:justify-end">
                  <p className="tnum text-xs text-slate-500">
                    ~{task.duration_minutes} min • {task.question_goal} questões
                  </p>
                  {task.completed ? null : isToday ? (
                    <Link
                      href={`/dashboard/praticar?topic=${task.topic_id}`}
                      className={buttonClasses({ variant: "primary", size: "sm" })}
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      Estudar agora
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending || !access.hasPlatformAccess}
                      onClick={() => complete(task.id)}
                    >
                      Marcar como feita
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <SmartStudyPlanCreditAction disabled={!access.hasPlatformAccess} />
        </div>
      </CardContent>
    </Card>
  );
}
