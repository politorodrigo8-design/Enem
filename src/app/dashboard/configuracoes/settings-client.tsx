"use client";

import Image from "next/image";
import { Check, ImagePlus, KeyRound, Loader2, LogOut, Save, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { signOutAction, updatePasswordAction } from "@/lib/actions/auth";
import { updateProfilePhotoAction, updateProfileSettingsAction } from "@/lib/actions/beta";
import { accessLevelLabel, type AccessContext } from "@/lib/access";
import type { Profile } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";
import { isProfilePhotoDataUrl, PROFILE_PHOTO_UPDATED_EVENT } from "@/lib/profile-photo";
import type { OnboardingInput } from "@/lib/schemas/beta";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultyScale } from "@/components/dashboard/difficulty-scale";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { WeekdaySelector } from "@/components/dashboard/weekday-selector";

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
  const router = useRouter();
  const formId = useId();
  const initialStudyPreferences = getStudyPreferences(profile);
  const initialProfilePhotoUrl = getProfilePhotoUrl(initialStudyPreferences);
  const storedDifficulties =
    typeof profile?.perceived_difficulties === "object" &&
    profile.perceived_difficulties !== null &&
    !Array.isArray(profile.perceived_difficulties)
      ? profile.perceived_difficulties
      : {};
  const [pendingProfile, startProfileTransition] = useTransition();
  const [pendingPassword, startPasswordTransition] = useTransition();
  const [pendingPhotoSave, startPhotoSaveTransition] = useTransition();
  const [confirmedProfilePhotoUrl, setConfirmedProfilePhotoUrl] =
    useState(initialProfilePhotoUrl);
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
    study_preferences: initialStudyPreferences,
  });
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [pendingPhoto, setPendingPhoto] = useState(false);
  const [preferencesText, setPreferencesText] = useState(
    typeof form.study_preferences?.notes === "string"
      ? String(form.study_preferences.notes)
      : "",
  );
  const [dailyGoalText, setDailyGoalText] = useState(() => {
    const stored = Number(form.study_preferences?.daily_question_goal);
    return Number.isFinite(stored) && stored > 0 ? String(stored) : "";
  });
  const profilePhotoUrl = getProfilePhotoUrl(form.study_preferences);
  const profilePhotoChanged = profilePhotoUrl !== confirmedProfilePhotoUrl;

  async function uploadProfilePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem em PNG, JPG ou WebP.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      toast.error("Escolha uma imagem de até 6 MB.");
      return;
    }

    setPendingPhoto(true);
    try {
      const photoUrl = await resizeProfilePhoto(file);
      setForm((current) => ({
        ...current,
        study_preferences: {
          ...current.study_preferences,
          profile_photo_url: photoUrl,
        },
      }));
      toast.success("Foto pronta. Clique em Confirmar foto para atualizar o menu.");
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    } finally {
      setPendingPhoto(false);
    }
  }

  function removeProfilePhoto() {
    setForm((current) => {
      const nextPreferences = { ...current.study_preferences };
      delete nextPreferences.profile_photo_url;

      return {
        ...current,
        study_preferences: nextPreferences,
      };
    });
  }

  function confirmProfilePhoto() {
    startPhotoSaveTransition(async () => {
      const result = await updateProfilePhotoAction({
        profilePhotoUrl: profilePhotoUrl || null,
      });
      toast[result.ok ? "success" : "error"](result.message);

      if (result.ok) {
        setConfirmedProfilePhotoUrl(profilePhotoUrl);
        dispatchProfilePhotoUpdated(profilePhotoUrl);
        router.refresh();
      }
    });
  }

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
          ...(dailyGoalText.trim()
            ? {
                daily_question_goal: Math.min(
                  60,
                  Math.max(5, Math.round(Number(dailyGoalText))),
                ),
              }
            : { daily_question_goal: undefined }),
        },
        onboarding_completed: true,
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setConfirmedProfilePhotoUrl(profilePhotoUrl);
        dispatchProfilePhotoUpdated(profilePhotoUrl);
        router.refresh();
      }
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
          <div className="flex flex-col gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-700 text-xl font-bold text-white">
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt="Foto de perfil"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (form.full_name.trim()[0] || "P").toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">Foto de perfil</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use uma imagem quadrada ou centralizada para aparecer bem no menu.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className={buttonClasses({
                  variant: "outline",
                  size: "sm",
                  className: pendingPhoto ? "pointer-events-none opacity-55" : "",
                })}
                htmlFor={`${formId}-profile-photo`}
              >
                {pendingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                )}
                Escolher foto
              </label>
              <input
                id={`${formId}-profile-photo`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={uploadProfilePhoto}
                className="sr-only"
                disabled={pendingPhoto}
              />
              {profilePhotoUrl ? (
                <Button type="button" variant="ghost" size="sm" onClick={removeProfilePhoto}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remover
                </Button>
              ) : null}
              {profilePhotoChanged ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={confirmProfilePhoto}
                  disabled={pendingPhoto || pendingPhotoSave}
                >
                  {pendingPhotoSave ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  {profilePhotoUrl ? "Confirmar foto" : "Confirmar remoção"}
                </Button>
              ) : null}
            </div>
          </div>

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
            <Input
              id={`${formId}-daily-goal`}
              name="daily_question_goal"
              label="Meta diária de questões"
              type="number"
              inputMode="numeric"
              min={5}
              max={60}
              value={dailyGoalText}
              onChange={setDailyGoalText}
            />
            <WeekdaySelector
              id={`${formId}-available-days`}
              label="Dias disponíveis"
              value={form.available_days}
              onChange={(available_days) =>
                setForm((current) => ({ ...current, available_days }))
              }
              className="md:col-span-2"
            />
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

function getStudyPreferences(profile: Profile | null): Record<string, unknown> {
  return typeof profile?.study_preferences === "object" &&
    profile.study_preferences &&
    !Array.isArray(profile.study_preferences)
    ? profile.study_preferences
    : {};
}

function getProfilePhotoUrl(studyPreferences: Record<string, unknown>) {
  const value = studyPreferences.profile_photo_url;
  return isProfilePhotoDataUrl(value) ? value : "";
}

function dispatchProfilePhotoUpdated(profilePhotoUrl: string) {
  window.dispatchEvent(
    new CustomEvent(PROFILE_PHOTO_UPDATED_EVENT, {
      detail: { profilePhotoUrl },
    }),
  );
}

function resizeProfilePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      const image = new window.Image();

      image.onerror = () => reject(new Error("image_failed"));
      image.onload = () => {
        const maxSize = 384;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas_failed"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
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
