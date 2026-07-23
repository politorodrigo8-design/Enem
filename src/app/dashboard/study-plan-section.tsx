"use client";

import {
  CalendarDays,
  CheckCircle2,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SmartStudyPlanCreditAction } from "@/components/dashboard/ai-credit-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import {
  completeStudyPlanItemAction,
  generateStudyPlanAction,
} from "@/lib/actions/learning";
import type { AccessContext } from "@/lib/access";
import type { StudyPlanWithItems } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";
import { statusTone } from "@/lib/utils";

export function StudyPlanSection({
  plan,
  access,
}: {
  plan: StudyPlanWithItems | null;
  access: AccessContext;
}) {
  const [reorganize, setReorganize] = useState(false);
  const [pending, startTransition] = useTransition();
  const tasks = plan?.study_plan_items ?? [];
  const completed = tasks.filter((task) => task.completed).length;
  const questionGoal = tasks.reduce((sum, task) => sum + task.question_goal, 0);
  const progress = useMemo(
    () => (tasks.length ? Math.round((completed / tasks.length) * 100) : 0),
    [completed, tasks.length],
  );

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
      <div className="space-y-6">
        <EmptyState
          icon={CalendarDays}
          title="Nenhum plano gerado"
          description="Gere sua primeira semana para receber atividades organizadas por prioridade, dentro das horas e dias que você informou no diagnóstico."
          action={
            <Button onClick={generate} disabled={pending || !access.hasPlatformAccess}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Gerar plano da semana
            </Button>
          }
        />
        <Notice tone="info">
          O plano é gerado por regras: tópicos prioritários, horas disponíveis,
          dias disponíveis e metas de questões.
        </Notice>
        <SmartStudyPlanCreditAction disabled={!access.hasPlatformAccess} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Plano da semana</CardTitle>
          <p className="tnum mt-1 text-xs leading-5 text-slate-500">
            Semana de {plan?.week_start ?? "—"} • meta de {questionGoal} questões
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={reorganize ? "secondary" : "outline"}
            size="sm"
            onClick={() => setReorganize((value) => !value)}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
            {reorganize ? "Concluir reorganização" : "Reorganizar"}
          </Button>
          <Button
            size="sm"
            onClick={generate}
            disabled={pending || !access.hasPlatformAccess}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Regenerar plano
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={progress} label="Plano concluído" tone="green" />
        <SmartStudyPlanCreditAction disabled={!access.hasPlatformAccess} />
        {reorganize ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Em breve será possível arrastar as atividades para reorganizar a
            semana. Por enquanto, regenere o plano quando a rotina mudar.
          </p>
        ) : null}
        <ul className="mt-4 divide-y divide-slate-100">
          {tasks.map((task) => {
            const status = task.completed ? "Concluído" : "Pendente";
            return (
              <li
                key={task.id}
                className={`flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between ${
                  reorganize ? "rounded-lg bg-blue-50/60 px-2" : ""
                }`}
              >
                <div className="flex min-w-0 gap-3">
                  {reorganize ? (
                    <GripVertical
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold capitalize text-slate-950">
                        {formatAppDateTime(`${task.scheduled_date}T12:00:00-03:00`, {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusTone(status)}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {task.topics.subjects.name}: {task.topics.name}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 md:justify-end">
                  <p className="tnum text-xs text-slate-500">
                    {task.duration_minutes} min • {task.question_goal} questões
                  </p>
                  <Button
                    variant={task.completed ? "secondary" : "outline"}
                    size="sm"
                    disabled={task.completed || pending || !access.hasPlatformAccess}
                    onClick={() => complete(task.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {task.completed ? "Concluído" : "Concluir"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
