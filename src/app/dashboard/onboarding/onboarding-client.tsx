"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DifficultyScale } from "@/components/dashboard/difficulty-scale";
import { Progress } from "@/components/ui/progress";
import { WeekdaySelector } from "@/components/dashboard/weekday-selector";
import { saveOnboardingAction } from "@/lib/actions/beta";
import type { Profile } from "@/lib/db/types";
import type { OnboardingInput } from "@/lib/schemas/beta";

const areas = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

const steps = [
  {
    title: "Sobre você",
    description: "Como devemos te chamar na plataforma.",
  },
  {
    title: "Seu objetivo",
    description: "Onde você quer chegar no ENEM 2026.",
  },
  {
    title: "Sua rotina",
    description: "Quanto tempo você tem para estudar por semana.",
  },
  {
    title: "Autopercepção",
    description:
      "Como você sente cada área hoje. Isso define suas primeiras prioridades.",
  },
];

export function OnboardingClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<OnboardingInput>({
    full_name: profile?.full_name || "",
    target_course: profile?.target_course || "",
    target_university: profile?.target_university || "",
    target_score: profile?.target_score || 700,
    previous_score: profile?.previous_score ?? undefined,
    weekly_hours: profile?.weekly_hours || 8,
    available_days: profile?.available_days || "",
    perceived_difficulties: Object.fromEntries(
      areas.map((area) => [area, Number(storedDifficulties[area] ?? 3)]),
    ),
    study_preferences: {},
  });

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const isLast = step === steps.length - 1;

  function next() {
    if (!isLast) {
      setStep((current) => current + 1);
      return;
    }

    startTransition(async () => {
      const result = await saveOnboardingAction(form);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        router.push("/dashboard/diagnostico");
        router.refresh();
      }
    });
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <p className="tnum text-xs font-semibold uppercase tracking-widest text-blue-700">
              Etapa {step + 1} de {steps.length}
            </p>
          </div>
          <Progress value={progress} tone="blue" />
          <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
            {steps[step].title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {steps[step].description}
          </p>
        </div>

        <div className="min-h-[280px]">
          <div key={step} className="animate-rise">
          {step === 0 ? (
            <InputField
              label="Nome"
              value={form.full_name}
              placeholder="Seu nome"
              onChange={(full_name) =>
                setForm((current) => ({ ...current, full_name }))
              }
            />
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Curso desejado"
                value={form.target_course}
                placeholder="Ex.: Medicina, Direito"
                onChange={(target_course) =>
                  setForm((current) => ({ ...current, target_course }))
                }
              />
              <InputField
                label="Universidade desejada"
                value={form.target_university}
                placeholder="Ex.: UFPR, USP"
                onChange={(target_university) =>
                  setForm((current) => ({ ...current, target_university }))
                }
              />
              <InputField
                label="Nota-alvo"
                value={String(form.target_score || "")}
                type="number"
                placeholder="Ex.: 760"
                onChange={(target_score) =>
                  setForm((current) => ({
                    ...current,
                    target_score: Number(target_score),
                  }))
                }
              />
              <InputField
                label="Nota anterior, caso exista"
                value={String(form.previous_score ?? "")}
                type="number"
                placeholder="Vazio se for seu primeiro ENEM"
                onChange={(previous_score) =>
                  setForm((current) => ({
                    ...current,
                    previous_score: previous_score
                      ? Number(previous_score)
                      : undefined,
                  }))
                }
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Horas disponíveis por semana"
                value={String(form.weekly_hours || "")}
                type="number"
                placeholder="Ex.: 10"
                onChange={(weekly_hours) =>
                  setForm((current) => ({
                    ...current,
                    weekly_hours: Number(weekly_hours),
                  }))
                }
              />
              <WeekdaySelector
                label="Dias disponíveis"
                value={form.available_days}
                onChange={(available_days) =>
                  setForm((current) => ({ ...current, available_days }))
                }
                className="sm:col-span-2"
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <div className="divide-y divide-slate-100">
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
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Ao concluir, geramos seu diagnóstico inicial com prioridades por
                assunto. Elas são estimativas de estudo — não previsão da prova
                nem garantia de nota.
              </p>
            </div>
          ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || pending}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>
          <Button type="button" disabled={pending} onClick={next}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isLast ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
            {isLast ? "Concluir e ver meu diagnóstico" : "Continuar"}
          </Button>
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
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      />
    </label>
  );
}
