"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import { recalculateDiagnosisPriorities } from "@/lib/db/diagnosis";
import type { ActionResult } from "@/lib/actions/auth";
import {
  betaApplicationSchema,
  feedbackSchema,
  onboardingSchema,
  profileSettingsSchema,
  type BetaApplicationInput,
  type FeedbackInput,
  type OnboardingInput,
  type ProfileSettingsInput,
} from "@/lib/schemas/beta";
import {
  isProductEventName,
  recordProductEvent,
  type ProductEventName,
} from "@/lib/services/product-events";
import { logServerError } from "@/lib/security/public-errors";
import {
  checkRateLimit,
  emailRateLimitIdentifier,
  rateLimitedResult,
  userRateLimitIdentifier,
} from "@/lib/security/rate-limit";

function supabaseMissing(): ActionResult {
  return {
    ok: false,
    message: "Configure o Supabase para salvar dados da beta.",
  };
}

function publicDbErrorMessage(message: string) {
  if (message.includes("duplicate key") || message.includes("beta_applications_email_unique")) {
    return "Ja existe uma candidatura beta para este e-mail.";
  }

  if (message.includes("beta_applications_user_unique")) {
    return "Sua conta ja enviou uma candidatura beta.";
  }

  if (message.includes("beta_feedback_duplicate_guard")) {
    return "Este feedback ja foi registrado. Obrigado por avisar.";
  }

  if (message.includes("row-level security") || message.includes("violates row-level security")) {
    return "Nao foi possivel salvar agora. Aguarde alguns minutos e tente novamente.";
  }

  return "Nao foi possivel salvar agora. Tente novamente em instantes.";
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AuthenticatedContext =
  | { error: ActionResult }
  | { supabase: ServerSupabaseClient; user: User };

async function getAuthenticatedContext(): Promise<AuthenticatedContext> {
  if (!isSupabaseConfigured()) return { error: supabaseMissing() };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { ok: false, message: "Sessao expirada. Entre novamente." },
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const access = getAccessContext(profile);

  if (!access.hasPlatformAccess) {
    return {
      error: {
        ok: false,
        message: access.expired ? "Seu acesso ao Pontua Enem expirou." : accessRequiredMessage(),
      },
    };
  }

  return { supabase, user };
}

export async function saveOnboardingAction(
  input: OnboardingInput,
): Promise<ActionResult> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return context.error;

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const { supabase, user } = context;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      target_course: parsed.data.target_course,
      target_university: parsed.data.target_university,
      target_score: parsed.data.target_score,
      previous_score: parsed.data.previous_score ?? null,
      weekly_hours: parsed.data.weekly_hours,
      available_days: parsed.data.available_days,
      perceived_difficulties: parsed.data.perceived_difficulties,
      study_preferences: parsed.data.study_preferences,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    logServerError("beta.saveOnboarding", error, { userId: user.id });
    return { ok: false, message: publicDbErrorMessage(error.message) };
  }

  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "onboarding_completed",
    route: "/dashboard/onboarding",
    metadata: {
      target_score: parsed.data.target_score,
      weekly_hours: parsed.data.weekly_hours,
    },
  });

  await recalculateDiagnosisPriorities(
    supabase,
    user.id,
    parsed.data.perceived_difficulties,
  );

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Tudo pronto! Seu diagnóstico inicial foi gerado." };
}

export async function updateProfileSettingsAction(
  input: ProfileSettingsInput,
): Promise<ActionResult> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return context.error;

  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const { supabase, user } = context;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      target_course: parsed.data.target_course,
      target_university: parsed.data.target_university,
      target_score: parsed.data.target_score,
      previous_score: parsed.data.previous_score ?? null,
      weekly_hours: parsed.data.weekly_hours,
      available_days: parsed.data.available_days,
      perceived_difficulties: parsed.data.perceived_difficulties,
      study_preferences: parsed.data.study_preferences,
      onboarding_completed: parsed.data.onboarding_completed ?? true,
    })
    .eq("id", user.id);

  if (error) {
    logServerError("beta.updateProfileSettings", error, { userId: user.id });
    return { ok: false, message: publicDbErrorMessage(error.message) };
  }

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Configuracoes salvas." };
}

export async function submitBetaApplicationAction(
  input: BetaApplicationInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return supabaseMissing();

  const parsed = betaApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const rateLimit = await checkRateLimit({
    operation: "beta.application",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("beta_applications").insert({
    user_id: user?.id ?? null,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    city: parsed.data.city,
    school_year: parsed.data.school_year,
    previous_score: parsed.data.previous_score ?? null,
    target_course: parsed.data.target_course,
    main_difficulty: parsed.data.main_difficulty,
    whatsapp: parsed.data.whatsapp || null,
    contact_authorized: parsed.data.contact_authorized,
    comments: parsed.data.comments || null,
  });

  if (error) {
    logServerError("beta.submitBetaApplication", error);
    return { ok: false, message: publicDbErrorMessage(error.message) };
  }

  if (user) {
    await recordProductEvent({
      supabase,
      userId: user.id,
      eventName: "beta_application_submitted",
      route: "/beta",
      metadata: { school_year: parsed.data.school_year },
    });
  }

  return {
    ok: true,
    message: "Candidatura enviada. A liberacao beta sera feita manualmente quando aplicavel.",
  };
}

export async function submitFeedbackAction(input: FeedbackInput): Promise<ActionResult> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return context.error;

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const rateLimit = await checkRateLimit({
    operation: "beta.feedback",
    identifier: userRateLimitIdentifier(context.user.id),
    limit: 10,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  const { supabase, user } = context;
  const { error } = await supabase.from("beta_feedback").insert({
    user_id: user.id,
    feedback_type: parsed.data.feedback_type,
    route: parsed.data.route,
    message: parsed.data.message,
    rating: parsed.data.rating,
    easy_to_understand: parsed.data.easy_to_understand ?? null,
    client_created_at: parsed.data.client_created_at ?? new Date().toISOString(),
  });

  if (error) {
    logServerError("beta.submitFeedback", error, { userId: user.id });
    return { ok: false, message: publicDbErrorMessage(error.message) };
  }

  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName: "feedback_submitted",
    route: parsed.data.route,
    metadata: {
      feedback_type: parsed.data.feedback_type,
      rating: parsed.data.rating,
      easy_to_understand: parsed.data.easy_to_understand ?? null,
    },
  });

  return { ok: true, message: "Feedback enviado. Obrigado por testar a beta." };
}

export async function recordProductEventAction(input: {
  eventName: ProductEventName | string;
  route?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return context.error;

  if (!isProductEventName(input.eventName)) {
    return { ok: false, message: "Evento desconhecido." };
  }

  await recordProductEvent({
    supabase: context.supabase,
    userId: context.user.id,
    eventName: input.eventName,
    route: input.route,
    metadata: input.metadata,
  });

  return { ok: true, message: "Evento registrado." };
}
