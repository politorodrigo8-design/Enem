"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Target,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
import { saveDiagnosisAction } from "@/lib/actions/learning";
import type { Profile } from "@/lib/db/types";
import type { DiagnosisInput } from "@/lib/schemas/diagnosis";

const steps = ["Objetivo", "Rotina", "Autopercepção", "Resultado"];
const areas = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

export function DiagnosisClient({ profile }: { profile: Profile | null }) {
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<DiagnosisInput>({
    target_course: profile?.target_course ?? "",
    target_university: profile?.target_university ?? "",
    target_score: profile?.target_score ?? 0,
    previous_score: profile?.previous_score ?? undefined,
    weekly_hours: profile?.weekly_hours ?? 1,
    available_days: profile?.available_days ?? "",
    perceived_difficulties: Object.fromEntries(
      areas.map((area) => [area, Number(storedDifficulties[area] ?? 3)]),
    ),
  });

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function continueFlow() {
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    startTransition(async () => {
      const result = await saveDiagnosisAction(form);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setCompleted(true);
        setStep(3);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 border-b border-slate-100 pb-5">
          <ol className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {steps.map((label, index) => {
              const done = index < step || (index === step && completed);
              const current = index === step && !done;
              return (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className={`tnum flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      done
                        ? "bg-emerald-50 text-emerald-700"
                        : current
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      current
                        ? "text-slate-950"
                        : done
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          <Progress value={progress} tone="blue" />
        </div>

        {step === 3 && completed ? (
          <DiagnosisResult />
        ) : (
          <div className="space-y-6">
            {step === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Curso desejado"
                  icon={GraduationCap}
                  value={form.target_course}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, target_course: value }))
                  }
                />
                <InputField
                  label="Universidade desejada"
                  icon={GraduationCap}
                  value={form.target_university}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, target_university: value }))
                  }
                />
                <InputField
                  label="Nota-alvo"
                  icon={Target}
                  value={String(form.target_score)}
                  type="number"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, target_score: Number(value) }))
                  }
                />
                <InputField
                  label="Nota anterior, caso exista"
                  icon={ClipboardCheck}
                  value={String(form.previous_score ?? "")}
                  type="number"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      previous_score: value ? Number(value) : undefined,
                    }))
                  }
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Horas disponíveis por semana"
                  icon={Calendar}
                  value={String(form.weekly_hours)}
                  type="number"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, weekly_hours: Number(value) }))
                  }
                />
                <InputField
                  label="Dias disponíveis"
                  icon={Calendar}
                  value={form.available_days}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, available_days: value }))
                  }
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <Notice tone="info">
                  Use 1 para baixa dificuldade e 5 para alta dificuldade. Sua
                  resposta recalcula a prioridade de cada tópico no Radar.
                </Notice>
                <div className="divide-y divide-slate-100">
                  {areas.map((area) => (
                    <label key={area} className="block py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-slate-900">
                          {area}
                        </span>
                        <span className="tnum text-sm font-semibold text-blue-700">
                          {form.perceived_difficulties[area]}/5
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={form.perceived_difficulties[area]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            perceived_difficulties: {
                              ...current.perceived_difficulties,
                              [area]: Number(event.target.value),
                            },
                          }))
                        }
                        className="mt-3 w-full accent-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
              <Button type="button" disabled={pending} onClick={continueFlow}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : step === 2 ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {step === 2 ? "Salvar diagnóstico" : "Continuar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InputField({
  label,
  value,
  onChange,
  icon: Icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof Target;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 hover:border-slate-300">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full bg-transparent text-sm text-slate-950 outline-none"
        />
      </div>
    </label>
  );
}

function DiagnosisResult() {
  const nextSteps: Array<[string, string]> = [
    ["Dados salvos", "Perfil, rotina e autopercepção foram registrados."],
    ["Radar atualizado", "Os tópicos ganharam prioridade personalizada."],
    ["Plano pronto", "Gere uma semana com base nos tópicos prioritários."],
    ["Próximo passo", "Responda questões para calibrar sua taxa de erro real."],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="rounded-lg bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Diagnóstico salvo
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Prioridades recalculadas
          </h2>
          <p className="mt-2 text-sm leading-6 text-blue-950">
            A análise combina recorrência dos temas na prova, seus erros,
            dificuldade percebida e importância estratégica de cada tópico.
          </p>
        </div>
        <Notice tone="warning" className="mt-4">
          A estimativa é um guia de estudo. Ela não promete nota garantida nem
          prevê questões exatas.
        </Notice>
      </div>
      <ul className="divide-y divide-slate-100">
        {nextSteps.map(([title, description]) => (
          <li key={title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-0.5 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
