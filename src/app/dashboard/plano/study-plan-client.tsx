"use client";

import {
  CalendarDays,
  CheckCircle2,
  GripVertical,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { statusTone } from "@/lib/utils";

export function StudyPlanClient({
  plan,
  access,
}: {
  plan: StudyPlanWithItems | null;
  access: AccessContext;
}) {
  const [reorganize, setReorganize] = useState(false);
  const [pending, startTransition] = useTransition();
  const allTasks = plan?.study_plan_items ?? [];
  const tasks = allTasks;
  const completed = tasks.filter((task) => task.completed).length;
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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Progresso semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} label="Atividades concluídas" tone="green" />
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Semana" value={plan?.week_start ?? "Nova"} />
              <Metric label="Concluídas" value={`${completed}/${tasks.length}`} />
              <Metric
                label="Questões"
                value={String(tasks.reduce((sum, task) => sum + task.question_goal, 0))}
              />
            </div>
            <Button onClick={generate} disabled={pending || !access.hasPlatformAccess} full className="mt-5">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {plan ? "Regenerar plano" : "Gerar plano"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Reorganizar cronograma</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Esta versão registra conclusão e regeneração. Arrastar e
                  soltar fica preparado visualmente para próxima etapa.
                </p>
                <Button
                  variant={reorganize ? "secondary" : "outline"}
                  className="mt-4"
                  onClick={() => setReorganize((value) => !value)}
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                  {reorganize ? "Modo ativo" : "Reorganizar visualmente"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Notice tone="info">
          O plano é gerado por regras: tópicos prioritários, horas disponíveis,
          dias disponíveis e metas de questões.
        </Notice>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semana atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tasks.length ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum plano gerado"
              description="Gere sua primeira semana para salvar atividades no banco."
            />
          ) : (
            tasks.map((task) => {
              const status = task.completed ? "Concluído" : "Pendente";
              return (
                <div
                  key={task.id}
                  className={`rounded-lg border p-4 ${
                    reorganize
                      ? "border-dashed border-violet-300 bg-violet-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3">
                      {reorganize ? (
                        <GripVertical className="mt-1 h-5 w-5 text-violet-500" aria-hidden="true" />
                      ) : (
                        <div className="mt-1 h-3 w-3 rounded-md bg-blue-700" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-950">
                            {new Date(`${task.scheduled_date}T00:00:00`).toLocaleDateString("pt-BR", {
                              weekday: "long",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </p>
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(status)}`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {task.topics.subjects.name}: {task.topics.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {task.duration_minutes} min • {task.question_goal} questões
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={task.completed ? "secondary" : "outline"}
                      disabled={task.completed || pending || !access.hasPlatformAccess}
                      onClick={() => complete(task.id)}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      )}
                      {task.completed ? "Concluído" : "Concluir"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
