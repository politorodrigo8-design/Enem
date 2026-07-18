"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Target,
  Timer,
  UserRound,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Progress } from "@/components/ui/progress";
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
  "Boas-vindas",
  "Curso",
  "Universidade",
  "Nota-alvo",
  "Nota anterior",
  "Horas",
  "Dias",
  "Dificuldades",
  "Diagnóstico",
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
    available_days: profile?.available_days || "Segunda, quarta, sexta",
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
    <Card>
      <CardContent>
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold text-slate-950">{steps[step]}</p>
            <p className="tnum text-xs font-semibold uppercase tracking-wide text-slate-500">
              Etapa {step + 1} de {steps.length}
            </p>
          </div>
          <Progress value={progress} tone="blue" />
        </div>

        <div className="min-h-[320px]">
          {step === 0 ? (
            <IntroStep fullName={form.full_name} onNameChange={(full_name) => setForm((current) => ({ ...current, full_name }))} />
          ) : null}

          {step === 1 ? (
            <SingleInputStep
              icon={GraduationCap}
              label="Curso desejado"
              value={form.target_course}
              placeholder="Ex.: Medicina, Direito, Engenharia"
              onChange={(target_course) => setForm((current) => ({ ...current, target_course }))}
            />
          ) : null}

          {step === 2 ? (
            <SingleInputStep
              icon={GraduationCap}
              label="Universidade desejada"
              value={form.target_university}
              placeholder="Ex.: UFPR, USP, universidade pública"
              onChange={(target_university) => setForm((current) => ({ ...current, target_university }))}
            />
          ) : null}

          {step === 3 ? (
            <SingleInputStep
              icon={Target}
              label="Nota-alvo"
              value={String(form.target_score)}
              type="number"
              placeholder="Ex.: 760"
              onChange={(target_score) => setForm((current) => ({ ...current, target_score: Number(target_score) }))}
            />
          ) : null}

          {step === 4 ? (
            <SingleInputStep
              icon={BookOpenCheck}
              label="Nota anterior, caso exista"
              value={String(form.previous_score ?? "")}
              type="number"
              placeholder="Deixe vazio se ainda não fez ENEM"
              onChange={(previous_score) =>
                setForm((current) => ({
                  ...current,
                  previous_score: previous_score ? Number(previous_score) : undefined,
                }))
              }
            />
          ) : null}

          {step === 5 ? (
            <SingleInputStep
              icon={Timer}
              label="Horas disponíveis por semana"
              value={String(form.weekly_hours)}
              type="number"
              placeholder="Ex.: 10"
              onChange={(weekly_hours) => setForm((current) => ({ ...current, weekly_hours: Number(weekly_hours) }))}
            />
          ) : null}

          {step === 6 ? (
            <SingleInputStep
              icon={CalendarDays}
              label="Dias disponíveis"
              value={form.available_days}
              placeholder="Ex.: Segunda, quarta, sexta e sábado"
              onChange={(available_days) => setForm((current) => ({ ...current, available_days }))}
            />
          ) : null}

          {step === 7 ? (
            <div>
              <Notice tone="info">
                Use 1 para baixa dificuldade e 5 para alta dificuldade.
              </Notice>
              <div className="mt-3 divide-y divide-slate-100">
                {areas.map((area) => (
                  <label key={area} className="flex items-center gap-4 py-3">
                    <span className="w-44 shrink-0 text-sm font-medium text-slate-900">
                      {area}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      aria-label={`Dificuldade em ${area}`}
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
                      className="w-full accent-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
                    />
                    <span className="tnum w-8 shrink-0 text-right text-sm font-semibold text-blue-700">
                      {form.perceived_difficulties[area]}/5
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 8 ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg bg-blue-50 p-6">
                <CheckCircle2 className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                  Pronto para o diagnóstico
                </h2>
                <p className="mt-2 text-sm leading-6 text-blue-950">
                  Suas respostas serão salvas no perfil. Depois disso, o próximo passo
                  é fazer o diagnóstico inicial para calibrar prioridades.
                </p>
              </div>
              <Notice tone="warning">
                As prioridades são estimativas de estudo baseadas em critérios
                transparentes. Não representam previsão exata da prova nem garantia de nota.
              </Notice>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
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
            {isLast ? "Salvar e ir ao diagnóstico" : "Continuar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IntroStep({
  fullName,
  onNameChange,
}: {
  fullName: string;
  onNameChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-lg bg-blue-50 p-6">
        <UserRound className="h-6 w-6 text-blue-700" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
          Bem-vindo ao NexoENEM
        </h2>
        <p className="mt-2 text-sm leading-6 text-blue-950">
          O NexoENEM organiza seu estudo com critérios transparentes — sem
          promessa de previsão exata do ENEM nem nota garantida.
        </p>
      </div>
      <SingleInputStep
        icon={UserRound}
        label="Nome"
        value={fullName}
        placeholder="Como você quer aparecer na plataforma?"
        onChange={onNameChange}
      />
    </div>
  );
}

function SingleInputStep({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof Target;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block max-w-2xl">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition-colors hover:border-slate-300 focus-within:border-blue-400">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full bg-transparent text-sm text-slate-950 outline-none"
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}
