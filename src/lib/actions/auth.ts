"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
  verifyEmailOtpSchema,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
  type UpdatePasswordInput,
  type VerifyEmailOtpInput,
} from "@/lib/schemas/auth";
import { recordProductEvent } from "@/lib/services/product-events";
import { recordCurrentLegalAcceptances } from "@/lib/legal/acceptances";
import { logServerError } from "@/lib/security/public-errors";
import {
  checkRateLimit,
  emailRateLimitIdentifier,
  rateLimitedResult,
} from "@/lib/security/rate-limit";
import {
  clearSessionStartedCookie,
  setSessionStartedCookie,
} from "@/lib/auth/session-timeout";
import { attachReferralFromCurrentCookie } from "@/lib/referrals/server";

export type ActionResult = {
  ok: boolean;
  message: string;
  requiresEmailVerification?: boolean;
  email?: string;
};

function supabaseMissing(): ActionResult {
  return {
    ok: false,
    message:
      "O login está temporariamente indisponível. Tente novamente em alguns minutos.",
  };
}

// O GoTrue devolve um `code` estável junto da mensagem. Casar por substring da
// mensagem quebra a cada mudança de texto do provedor e não distingue "código
// errado" de "código expirado" — os dois caíam no genérico, e o aluno não sabia
// se tinha errado a digitação, se o prazo venceu ou se o sistema caiu.
const authErrorMessagesByCode: Record<string, string> = {
  otp_expired:
    "Este código expirou ou já foi usado. Peça um novo código — ele vale por 1 hora.",
  over_email_send_rate_limit:
    "Você pediu códigos demais em pouco tempo. Aguarde um minuto antes de pedir outro.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  user_already_exists: "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.",
  email_exists: "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.",
  invalid_credentials: "E-mail ou senha inválidos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  otp_disabled: "A confirmação por código está indisponível no momento.",
};

function authErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function authErrorMessage(error: unknown) {
  const code = authErrorCode(error);
  if (code && authErrorMessagesByCode[code]) {
    return authErrorMessagesByCode[code];
  }

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

function isEmailNotConfirmedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Email not confirmed");
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
      if (isEmailNotConfirmedError(error)) {
        return {
          ok: false,
          message: authErrorMessage(error),
          requiresEmailVerification: true,
          email: parsed.data.email,
        };
      }
      return { ok: false, message: authErrorMessage(error) };
    }

    setSessionStartedCookie(await cookies());
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
        emailRedirectTo: emailConfirmationRedirectTo(),
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

      const referral = await attachReferralFromCurrentCookie(data.user.id);

      await recordProductEvent({
        supabase,
        userId: data.user.id,
        eventName: "signup_completed",
        route: "/login",
        metadata: referral ? { referral_attributed: true } : undefined,
      });
    }

    if (data.session) {
      setSessionStartedCookie(await cookies());
      revalidatePath("/dashboard", "layout");
      return { ok: true, message: "Conta criada. Vamos continuar para o checkout." };
    }

    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      requiresEmailVerification: true,
      email: parsed.data.email,
      message:
        "Conta criada. Enviamos um link de confirmação para o e-mail informado.",
    };
  } catch (error) {
    logAuthError("signUp threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

/**
 * Confirma o e-mail pelo código digitado na própria aba, em vez do link.
 *
 * O link usa PKCE (`flowType: "pkce"` é fixo no @supabase/ssr): o cookie
 * code-verifier fica no navegador do cadastro. Quem abre o e-mail no app do
 * Gmail ou no desktop cai num contexto sem esse cookie, o
 * `exchangeCodeForSession` falha e a pessoa fica trancada fora da conta — regra,
 * não exceção, em tráfego mobile de anúncio. O código não depende de cookie,
 * de navegador nem de dispositivo, e mantém a sessão na aba onde o funil começou
 * (preservando os identificadores de atribuição).
 */
export async function verifyEmailOtpAction(
  input: VerifyEmailOtpInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return supabaseMissing();
  }

  const parsed = verifyEmailOtpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Código inválido." };
  }

  const rateLimit = await checkRateLimit({
    operation: "auth.verify_email_otp",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 10,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      // 'signup' está deprecado no verifyOtp (ver JSDoc do @supabase/auth-js
      // 2.110.3); 'email' é o tipo para confirmação de cadastro por e-mail.
      type: "email",
    });

    if (error) {
      logAuthError("verifyEmailOtp returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    if (data.session) {
      setSessionStartedCookie(await cookies());
    }

    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "E-mail confirmado. Vamos continuar para o checkout." };
  } catch (error) {
    logAuthError("verifyEmailOtp threw", error);
    return { ok: false, message: authErrorMessage(error) };
  }
}

export async function resendEmailVerificationAction(
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
    operation: "auth.resend_email_verification",
    identifier: emailRateLimitIdentifier(parsed.data.email),
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.allowed) return rateLimitedResult(rateLimit);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo: emailConfirmationRedirectTo(),
      },
    });

    if (error) {
      logAuthError("resendEmailVerification returned error", error);
      return { ok: false, message: authErrorMessage(error) };
    }

    return {
      ok: true,
      message: "Se este e-mail tiver um cadastro pendente, enviaremos um novo link de confirmação.",
    };
  } catch (error) {
    logAuthError("resendEmailVerification threw", error);
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

  clearSessionStartedCookie(await cookies());
  revalidatePath("/", "layout");
  redirect("/login");
}

function emailConfirmationRedirectTo() {
  return `${getSiteUrl()}/auth/callback?next=/checkout`;
}
