"use client";

import { KeyRound, Loader2, LogOut, Save, ShieldCheck, UserCog } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { signOutAction, updatePasswordAction } from "@/lib/actions/auth";
import { updateProfileSettingsAction } from "@/lib/actions/beta";
import { accessLevelLabel, type AccessContext } from "@/lib/access";
import type { Profile } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";
import type { OnboardingInput } from "@/lib/schemas/beta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultyScale } from "@/components/dashboard/difficulty-scale";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";

const areas = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

type SettingsFormState = Omit<
  OnboardingInput,
  "target_score" | "previous_score" | "weekly_hours"
> & {
  target_score: string;
  previous_score: string;
  weekly_hours: string;
};

export function SettingsClient({
  profile,
  access,
}: {
  profile: Profile | null;
  access: AccessContext;
}) {
  const formId = useId();
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};
  const [pendingProfile, startProfileTransition] = useTransition();
  const [pendingPassword, startPasswordTransition] = useTransition();
  const [form, setForm] = useState<SettingsFormState>({
    full_name: profile?.full_name || "",
    target_course: profile?.target_course || "",
    target_university: profile?.target_university || "",
    target_score: profile?.target_score == null ? "" : String(profile.target_score),
    previous_score: profile?.previous_score == null ? "" : String(profile.previous_score),
    weekly_hours: profile?.weekly_hours == null ? "" : String(profile.weekly_hours),
    available_days: profile?.available_days || "",
    perceived_difficulties: Object.fromEntries(
      areas.map((area) => [area, Number(storedDifficulties[area] ?? 3)]),
    ),
    study_preferences:
      typeof profile?.study_preferences === "object" &&
      profile.study_preferences &&
      !Array.isArray(profile.study_preferences)
        ? profile.study_preferences
        : {},
  });
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [preferencesText, setPreferencesText] = useState(
    typeof form.study_preferences?.notes === "string"
      ? String(form.study_preferences.notes)
      : "",
  );

  function saveProfile() {
    startProfileTransition(async () => {
      if (!form.target_score.trim() || !form.weekly_hours.trim()) {
        toast.error("Informe nota-alvo e horas por semana antes de salvar.");
        return;
      }

      const result = await updateProfileSettingsAction({
        ...form,
        target_score: Number(form.target_score),
        previous_score: form.previous_score.trim() ? Number(form.previous_score) : undefined,
        weekly_hours: Number(form.weekly_hours),
        study_preferences: {
          ...form.study_preferences,
          notes: preferencesText,
        },
        onboarding_completed: true,
      });
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  function savePassword() {
    startPasswordTransition(async () => {
      const result = await updatePasswordAction(passwords);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setPasswords({ password: "", confirmPassword: "" });
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Reveal delay={0}>
      <Card>
        <CardHeader>
          <CardTitle>Perfil e rotina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id={`${formId}-full-name`}
              name="full_name"
              label="Nome"
              autoComplete="name"
              value={form.full_name}
              onChange={(full_name) => setForm((current) => ({ ...current, full_name }))}
            />
            <Input
              id={`${formId}-target-course`}
              name="target_course"
              label="Curso desejado"
              autoComplete="organization-title"
              value={form.target_course}
              onChange={(target_course) => setForm((current) => ({ ...current, target_course }))}
            />
            <Input
              id={`${formId}-target-university`}
              name="target_university"
              label="Universidade"
              autoComplete="organization"
              value={form.target_university}
              onChange={(target_university) =>
                setForm((current) => ({ ...current, target_university }))
              }
            />
            <Input
              id={`${formId}-target-score`}
              name="target_score"
              label="Nota-alvo"
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              value={form.target_score}
              onChange={(target_score) => setForm((current) => ({ ...current, target_score }))}
            />
            <Input
              id={`${formId}-previous-score`}
              name="previous_score"
              label="Nota anterior"
              type="number"
              inputMode="decimal"
              min={0}
              max={1000}
              value={form.previous_score}
              onChange={(previous_score) => setForm((current) => ({ ...current, previous_score }))}
            />
            <Input
              id={`${formId}-weekly-hours`}
              name="weekly_hours"
              label="Horas por semana"
              type="number"
              inputMode="numeric"
              min={1}
              max={80}
              value={form.weekly_hours}
              onChange={(weekly_hours) => setForm((current) => ({ ...current, weekly_hours }))}
            />
            <label className="block md:col-span-2" htmlFor={`${formId}-available-days`}>
              <span className="text-sm font-semibold text-slate-700">Dias disponíveis</span>
              <input
                id={`${formId}-available-days`}
                name="available_days"
                autoComplete="off"
                value={form.available_days}
                onChange={(event) => setForm((current) => ({ ...current, available_days: event.target.value }))}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
            </label>
            <label className="block md:col-span-2" htmlFor={`${formId}-study-preferences`}>
              <span className="text-sm font-semibold text-slate-700">Preferências de estudo</span>
              <textarea
                id={`${formId}-study-preferences`}
                name="study_preferences_notes"
                autoComplete="off"
                value={preferencesText}
                onChange={(event) => setPreferencesText(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                placeholder="Ex.: prefiro estudar à noite, revisar por questões e fazer simulados aos sábados."
              />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Áreas de maior dificuldade
            </p>
            <div className="mt-2 max-w-xl divide-y divide-slate-100">
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

          <Button type="button" onClick={saveProfile} disabled={pendingProfile}>
            {pendingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar configurações
          </Button>
        </CardContent>
      </Card>
      </Reveal>

      <Reveal delay={80} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status do acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <Badge tone={access.hasPlatformAccess ? "green" : "slate"}>
                  {accessLevelLabel(access.level)}
                </Badge>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {access.expiresAt
                    ? `Expira em ${formatAppDateTime(access.expiresAt, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}.`
                    : "Sem expiração definida para o acesso atual."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id={`${formId}-new-password`}
              name="new_password"
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={passwords.password}
              onChange={(password) => setPasswords((current) => ({ ...current, password }))}
            />
            <Input
              id={`${formId}-confirm-password`}
              name="confirm_password"
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={(confirmPassword) => setPasswords((current) => ({ ...current, confirmPassword }))}
            />
            <p id={`${formId}-password-help`} className="text-xs leading-5 text-slate-500">
              Preencha os dois campos com a mesma senha para habilitar a alteração.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={savePassword}
              aria-describedby={`${formId}-password-help`}
              disabled={pendingPassword || !passwords.password || !passwords.confirmPassword}
            >
              {pendingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Alterar senha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-start gap-3">
              <UserCog className="mt-1 h-5 w-5 text-blue-700" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-slate-950">Sessão</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Saia da conta quando terminar de usar um computador compartilhado.
                </p>
                <form action={signOutAction} className="mt-4">
                  <Button type="submit" variant="outline">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sair da conta
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function Input({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  min,
  max,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  max?: number;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
    </label>
  );
}
