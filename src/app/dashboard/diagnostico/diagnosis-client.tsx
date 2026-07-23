"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Radar,
  RefreshCcw,
  Route,
  Target,
  Timer,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DifficultyMeter,
  DifficultyScale,
} from "@/components/dashboard/difficulty-scale";
import { WeekdaySelector } from "@/components/dashboard/weekday-selector";
import { saveDiagnosisAction } from "@/lib/actions/learning";
import type { Profile } from "@/lib/db/types";
import { priorityTone } from "@/lib/utils";
import type { DiagnosisInput } from "@/lib/schemas/diagnosis";

export type PrioritySummary = {
  id: string;
  name: string;
  subject: string;
  area: string;
  accuracy: number | null;
  label: string;
};

const areas = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

const formSteps = ["Objetivo", "Rotina", "Autopercepção"];

export function DiagnosisClient({
  profile,
  priorities,
  hasDiagnosis,
}: {
  profile: Profile | null;
  priorities: PrioritySummary[];
  hasDiagnosis: boolean;
}) {
  const [view, setView] = useState<"result" | "form">(
    hasDiagnosis ? "result" : "form",
  );

  return view === "result" ? (
    <DiagnosisResult
      profile={profile}
      priorities={priorities}
      onRedo={() => setView("form")}
    />
  ) : (
    <DiagnosisForm
      profile={profile}
      canCancel={hasDiagnosis}
      onCancel={() => setView("result")}
      onSaved={() => setView("result")}
    />
  );
}

function DiagnosisResult({
  profile,
  priorities,
  onRedo,
}: {
  profile: Profile | null;
  priorities: PrioritySummary[];
  onRedo: () => void;
}) {
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile?.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};

  const objective: Array<[string, string]> = [
    ["Curso desejado", profile?.target_course || "—"],
    ["Universidade", profile?.target_university || "—"],
    ["Nota-alvo", profile?.target_score ? String(profile.target_score) : "—"],
    [
      "Nota anterior",
      profile?.previous_score ? String(profile.previous_score) : "Primeiro ENEM",
    ],
  ];

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Diagnóstico ativo — suas prioridades refletem estas respostas.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRedo}>
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refazer diagnóstico
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
              Objetivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              {objective.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="tnum text-right text-sm font-semibold text-slate-950">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
              Rotina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-slate-100">
              <div className="flex items-baseline justify-between gap-4 py-2.5 pt-0">
                <dt className="text-sm text-slate-500">Horas por semana</dt>
                <dd className="tnum text-sm font-semibold text-slate-950">
                  {profile?.weekly_hours ?? "—"}h
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5 pb-0">
                <dt className="shrink-0 text-sm text-slate-500">Dias disponíveis</dt>
                <dd className="text-right text-sm font-semibold text-slate-950">
                  {profile?.available_days || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
              Autopercepção
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {areas.map((area) => (
              <DifficultyMeter
                key={area}
                label={area}
                value={Number(storedDifficulties[area] ?? 3)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Suas prioridades agora</CardTitle>
          <Link
            href="/dashboard/desempenho"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800"
          >
            <Radar className="h-4 w-4" aria-hidden="true" />
            Ver no Desempenho
          </Link>
        </CardHeader>
        <CardContent>
          {priorities.length ? (
            <ul className="divide-y divide-slate-100">
              {priorities.map((priority) => (
                <li
                  key={priority.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {priority.subject}: {priority.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {priority.area}
                      {priority.accuracy != null ? (
                        <>
                          {" · "}
                          <span className="tnum">{priority.accuracy}%</span> de acerto
                        </>
                      ) : (
                        " · sem respostas ainda"
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${priorityTone(priority.label)}`}
                  >
                    {priority.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Responda questões para calibrar as prioridades com seu desempenho
              real.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <Link
              href="/dashboard"
              className={buttonClasses({ variant: "primary" })}
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              Ver meu plano em Hoje
            </Link>
            <Link
              href="/dashboard/praticar"
              className={buttonClasses({ variant: "outline" })}
            >
              Praticar prioridades
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DiagnosisForm({
  profile,
  canCancel,
  onCancel,
  onSaved,
}: {
  profile: Profile | null;
  canCancel: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile?.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};
  const [step, setStep] = useState(0);
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

  const isLast = step === formSteps.length - 1;

  function continueFlow() {
    if (!isLast) {
      setStep((current) => current + 1);
      return;
    }

    startTransition(async () => {
      const result = await saveDiagnosisAction(form);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        onSaved();
        router.refresh();
      }
    });
  }

  return (
    <Card className="animate-rise">
      <CardContent className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {formSteps.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`tnum flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                    index < step
                      ? "bg-emerald-50 text-emerald-700"
                      : index === step
                        ? "bg-blue-700 text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    index === step
                      ? "text-slate-950"
                      : index < step
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>
          {canCancel ? (
            <button
              type="button"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              onClick={onCancel}
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="space-y-6">
          <div key={step} className="animate-rise">
          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Curso desejado"
                placeholder="Ex.: Medicina, Direito, Engenharia"
                value={form.target_course}
                onChange={(value) =>
                  setForm((current) => ({ ...current, target_course: value }))
                }
              />
              <InputField
                label="Universidade desejada"
                placeholder="Ex.: UFPR, USP, universidade pública"
                value={form.target_university}
                onChange={(value) =>
                  setForm((current) => ({ ...current, target_university: value }))
                }
              />
              <InputField
                label="Nota-alvo"
                placeholder="Ex.: 760"
                value={String(form.target_score || "")}
                type="number"
                onChange={(value) =>
                  setForm((current) => ({ ...current, target_score: Number(value) }))
                }
              />
              <InputField
                label="Nota anterior, caso exista"
                placeholder="Deixe vazio se ainda não fez ENEM"
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
                placeholder="Ex.: 10"
                value={String(form.weekly_hours || "")}
                type="number"
                onChange={(value) =>
                  setForm((current) => ({ ...current, weekly_hours: Number(value) }))
                }
              />
              <WeekdaySelector
                label="Dias disponíveis"
                value={form.available_days}
                onChange={(value) =>
                  setForm((current) => ({ ...current, available_days: value }))
                }
                className="md:col-span-2"
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-sm leading-6 text-slate-600">
                Como você sente cada área hoje? Sua resposta entra no cálculo de
                prioridade de cada tópico no Radar.
              </p>
              <div className="mt-4 max-w-xl divide-y divide-slate-100">
                {areas.map((area) => (
                  <DifficultyScale
                    key={area}
                    label={area}
                    value={form.perceived_difficulties[area]}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        perceived_difficulties: {
                          ...current.perceived_difficulties,
                          [area]: value,
                        },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || pending}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
            <Button type="button" disabled={pending} onClick={continueFlow}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : isLast ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              {isLast ? "Salvar diagnóstico" : "Continuar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      />
    </label>
  );
}

