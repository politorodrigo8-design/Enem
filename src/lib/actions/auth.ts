"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import {
  getSiteUrl,
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
  type UpdatePasswordInput,
} from "@/lib/schemas/auth";
import { recordProductEvent } from "@/lib/services/product-events";
import { recordCurrentLegalAcceptances } from "@/lib/legal/acceptances";
import { logServerError } from "@/lib/security/public-errors";
import {
  checkRateLimit,
  emailRateLimitIdentifier,
  rateLimitedResult,
} from "@/lib/security/rate-limit";

export type ActionResult = {
  ok: boolean;
  message: string;
};

function supabaseMissing(): ActionResult {
  return {
    ok: false,
    message:
      "O login está temporariamente indisponível. Tente novamente em alguns minutos.",
  };
}

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message === "fetch failed") {
    return "Não conseguimos concluir sua entrada agora. Tente novamente em alguns minutos.";
  }

  if (message.includes("User already registered")) {
    return "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.";
  }

  if (message.includes("email rate limit exceeded")) {
    return "Muitas tentativas de cadastro foram feitas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (message.includes("Email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  return "Não conseguimos concluir sua entrada agora. Revise os dados e tente novamente.";
}

function logAuthError(context: string, error: unknown) {
  const publicKey = getSupabasePublicKey();

  logServerError(`auth.${context}`, error, {
    supabaseUrl: getSupabaseUrl(),
    publicKeyLength: publicKey.length,
    publicKeyHasWhitespace: /\s/.test(publicKey),
    publicKeyHasWrappingQuotes: /^['"]|['"]$/.test(publicKey),
  });
}

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return supabaseMissing();
  }

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const rateLimit = await checkRateLimit({
    operation: "auth.sign_in",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      logAuthError("signInWithPassword returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Você entrou na sua conta." };
  } catch (error) {
    logAuthError("signInWithPassword threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return supabaseMissing();
  }
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      message: "O cadastro está temporariamente indisponível para registro dos aceites legais.",
    };
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const rateLimit = await checkRateLimit({
    operation: "auth.sign_up",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/checkout`,
      },
    });

    if (error) {
      logAuthError("signUp returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    if (data.user) {
      try {
        await recordCurrentLegalAcceptances({
          userId: data.user.id,
          context: "signup",
          documentVersions: parsed.data.legalAcceptance,
          metadata: { source: "signup_form" },
        });
      } catch (acceptanceError) {
        logAuthError("legal acceptance failed after signup", acceptanceError);
        try {
          await createAdminClient().auth.admin.deleteUser(data.user.id);
        } catch (deleteError) {
          logAuthError("delete user after legal acceptance failure", deleteError);
        }
        return {
          ok: false,
          message:
            "Não foi possível registrar os aceites obrigatórios. Nenhuma conta foi criada.",
        };
      }

      await recordProductEvent({
        supabase,
        userId: data.user.id,
        eventName: "signup_completed",
        route: "/login",
      });
    }

    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      message:
        "Conta criada. Se pedirmos confirmação, confira seu e-mail antes de entrar.",
    };
  } catch (error) {
    logAuthError("signUp threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return supabaseMissing();
  }

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const rateLimit = await checkRateLimit({
    operation: "auth.reset_password",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/auth/reset-password`,
    });

    if (error) {
      logAuthError("resetPasswordForEmail returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    return {
      ok: true,
      message: "Enviamos as instruções de recuperação para o e-mail informado.",
    };
  } catch (error) {
    logAuthError("resetPasswordForEmail threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

export async function updatePasswordAction(
  input: UpdatePasswordInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return supabaseMissing();
  }

  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

    if (error) {
      logAuthError("updateUser password returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    return { ok: true, message: "Senha atualizada com sucesso." };
  } catch (error) {
    logAuthError("updateUser password threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
