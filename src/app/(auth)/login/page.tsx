"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BookOpenCheck,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  Route,
  Target,
} from "lucide-react";
import { Suspense, useState, useTransition } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
import { safeInternalPath } from "@/lib/utils";
import {
  resendEmailVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/lib/actions/auth";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/schemas/auth";
import { currentLegalAcceptanceVersions } from "@/lib/legal/config";

type Mode = "login" | "signup" | "reset" | "verify";

type ToastCopy = {
  successTitle: string;
  successDescription?: string;
  errorTitle: string;
};

const headline: Record<Mode, { title: string; description: string }> = {
  login: {
    title: "Bem-vindo de volta",
    description: "Entre para continuar de onde parou.",
  },
  signup: {
    title: "Criar sua conta",
    description: "Depois do cadastro, você segue para a compra do acesso.",
  },
  reset: {
    title: "Recuperar senha",
    description:
      "Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.",
  },
  verify: {
    title: "Confirme seu e-mail",
    description: "Enviamos um link para validar o endereço usado no cadastro.",
  },
};

const authBenefits = [
  { label: "Prioridades pelo seu desempenho", icon: Target },
  { label: "Questões e simulados no mesmo lugar", icon: BookOpenCheck },
  { label: "Plano semanal para a rotina", icon: Route },
];

function initialModeFromSearchParam(value: string | null): Mode {
  if (value === "signup" || value === "verify") return value;
  return "login";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = safeInternalPath(searchParams.get("redirectedFrom"));
  const setupMissing = searchParams.get("setup") === "supabase";
  const [mode, setMode] = useState<Mode>(() => initialModeFromSearchParam(searchParams.get("mode")));
  const [pending, startTransition] = useTransition();
  const legalVersions = currentLegalAcceptanceVersions();

  const signInForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      legalAcceptance: {
        terms_of_use: "" as typeof legalVersions.terms_of_use,
        privacy_policy: "" as typeof legalVersions.privacy_policy,
        refund_policy: "" as typeof legalVersions.refund_policy,
      },
    },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });
  const verificationForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  });
  const signupLegalAcceptance = useWatch({
    control: signUpForm.control,
    name: "legalAcceptance",
  });
  const verificationEmail = useWatch({
    control: verificationForm.control,
    name: "email",
  });

  function handleSignIn(values: SignInInput) {
    startTransition(async () => {
      const result = await signInAction(values);
      showAuthToast(result, {
        successTitle: "Você entrou na sua conta",
        successDescription: "Bom te ver por aqui. Seus estudos já estão prontos.",
        errorTitle: "Não foi possível entrar",
      });
      if (result.ok) {
        router.push(redirectedFrom || "/dashboard");
        router.refresh();
        return;
      }
      if (result.requiresEmailVerification) {
        verificationForm.setValue("email", result.email ?? values.email, { shouldValidate: true });
        setMode("verify");
      }
    });
  }

  function handleSignUp(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (result.ok && result.requiresEmailVerification) {
        verificationForm.setValue("email", result.email ?? values.email, { shouldValidate: true });
        toast.success("Confira seu e-mail", {
          description: result.message,
        });
        setMode("verify");
        return;
      }

      showAuthToast(result, {
        successTitle: "Conta criada com sucesso",
        successDescription: result.message,
        errorTitle: "Não foi possível criar a conta",
      });
      if (result.ok) {
        router.push("/checkout");
        router.refresh();
      }
    });
  }

  function handleReset(values: ResetPasswordInput) {
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      showAuthToast(result, {
        successTitle: "Confira seu e-mail",
        successDescription: result.message,
        errorTitle: "Não foi possível enviar o link",
      });
      if (result.ok) {
        setMode("login");
      }
    });
  }

  function handleResendVerification(values: ResetPasswordInput) {
    startTransition(async () => {
      const result = await resendEmailVerificationAction(values);
      showAuthToast(result, {
        successTitle: "E-mail reenviado",
        successDescription: result.message,
        errorTitle: "Não foi possível reenviar",
      });
    });
  }

  const copy = headline[mode];
  const signupLegalReady =
    signupLegalAcceptance?.terms_of_use === legalVersions.terms_of_use &&
    signupLegalAcceptance?.refund_policy === legalVersions.refund_policy &&
    signupLegalAcceptance?.privacy_policy === legalVersions.privacy_policy;

  return (
    <main className="min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#eff7ff_100%)]">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-8 lg:px-8 lg:py-6">
        <section className="relative hidden overflow-hidden rounded-[32px] border border-blue-100 bg-[#f1f8ff] p-8 shadow-sm shadow-blue-900/5 lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-x-8 top-20 h-48 rounded-full bg-blue-100/70 blur-3xl"
            aria-hidden="true"
          />
          <Logo className="relative z-10" />

          <div className="relative z-10 mt-8 max-w-xl">
            <p className="text-4xl font-extrabold leading-[1.04] tracking-tight text-slate-950 xl:text-5xl">
              Comece a estudar com mais direção.
            </p>
            <p className="mt-4 max-w-lg text-base font-medium leading-7 text-slate-600 xl:text-lg xl:leading-8">
              Crie sua conta para descobrir suas prioridades, organizar sua rotina
              e acompanhar sua evolução até o ENEM.
            </p>
          </div>

          <div className="relative z-10 mt-auto flex min-h-0 flex-1 items-end gap-4 pt-6 xl:gap-6">
            <div className="relative -mb-8 -ml-8 h-full w-[46%] max-w-[300px] shrink-0">
              <Image
                src="/images/landing/aluno-pontua-enem-cadastro-2026.webp"
                alt="Aluno sorrindo ao mostrar o app do Pontua Enem no celular"
                fill
                sizes="300px"
                className="object-contain object-bottom"
              />
            </div>
            <ul className="min-w-0 flex-1 space-y-4 pb-2">
              {authBenefits.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-bold leading-5 text-slate-700">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-white text-blue-700 shadow-sm shadow-blue-900/5">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[14px] px-2 text-sm font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar ao site
            </Link>
          </div>

          <div className="flex flex-1 items-center py-3 sm:py-4">
            <div
              className="animate-rise mx-auto w-full max-w-[460px] rounded-[28px] border border-blue-100 bg-white/95 p-5 shadow-sm shadow-blue-900/5 sm:p-6"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                {mode === "signup"
                  ? "Cadastro"
                  : mode === "reset"
                    ? "Senha"
                    : mode === "verify"
                      ? "Verificação"
                      : "Acesso"}
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {copy.description}
              </p>

              {setupMissing ? (
                <Notice tone="warning" className="mt-6 rounded-[18px]">
                  O login está temporariamente indisponível. Tente novamente em
                  alguns minutos ou fale com suporte@pontuaenem.com.br.
                </Notice>
              ) : null}

              {mode === "login" ? (
                <form
                  className="mt-6 space-y-4"
                  onSubmit={signInForm.handleSubmit(handleSignIn)}
                >
                  <Field
                    label="E-mail"
                    type="email"
                    autoComplete="username"
                    placeholder="voce@exemplo.com"
                    error={signInForm.formState.errors.email?.message}
                    registration={signInForm.register("email")}
                  />
                  <PasswordField
                    label="Senha"
                    autoComplete="current-password"
                    error={signInForm.formState.errors.password?.message}
                    registration={signInForm.register("password")}
                    labelAside={
                      <button
                        type="button"
                        className="-my-2 inline-flex min-h-10 items-center rounded-xl px-1 text-sm font-bold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        onClick={() => setMode("reset")}
                      >
                        Esqueci minha senha
                      </button>
                    }
                  />
                  <Button
                    type="submit"
                    full
                    size="lg"
                    disabled={pending}
                    className="h-12 rounded-[14px] text-base font-extrabold shadow-sm shadow-blue-900/15"
                  >
                    {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    Entrar
                  </Button>
                  <p className="pt-2 text-center text-sm text-slate-600">
                    Novo por aqui?{" "}
                    <button
                      type="button"
                      className="font-extrabold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      onClick={() => setMode("signup")}
                    >
                      Criar conta
                    </button>
                  </p>
                </form>
              ) : null}

              {mode === "signup" ? (
                <form
                  className="mt-6 space-y-4"
                  onSubmit={signUpForm.handleSubmit(handleSignUp)}
                >
                  <Field
                    label="Nome completo"
                    autoComplete="name"
                    placeholder="Como devemos te chamar"
                    error={signUpForm.formState.errors.fullName?.message}
                    registration={signUpForm.register("fullName")}
                  />
                  <Field
                    label="E-mail"
                    type="email"
                    autoComplete="username"
                    placeholder="voce@exemplo.com"
                    error={signUpForm.formState.errors.email?.message}
                    registration={signUpForm.register("email")}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PasswordField
                      label="Senha"
                      autoComplete="new-password"
                      error={signUpForm.formState.errors.password?.message}
                      registration={signUpForm.register("password")}
                    />
                    <PasswordField
                      label="Confirmar senha"
                      autoComplete="new-password"
                      error={signUpForm.formState.errors.confirmPassword?.message}
                      registration={signUpForm.register("confirmPassword")}
                    />
                  </div>
                  <div className="space-y-2 rounded-[18px] border border-blue-100 bg-blue-50/50 p-3">
                    <LegalCheckbox
                      id="signup-legal-acceptance"
                      describedBy={
                        signUpForm.formState.errors.legalAcceptance
                          ? "signup-legal-error"
                          : undefined
                      }
                      checked={signupLegalReady}
                      onChange={(checked) => {
                        signUpForm.setValue(
                          "legalAcceptance",
                          checked
                            ? legalVersions
                            : {
                                terms_of_use: "" as typeof legalVersions.terms_of_use,
                                privacy_policy: "" as typeof legalVersions.privacy_policy,
                                refund_policy: "" as typeof legalVersions.refund_policy,
                              },
                          { shouldValidate: true },
                        );
                      }}
                    >
                      Li e concordo com os{" "}
                      <LegalLink href="/termos">Termos de Uso</LegalLink> e com a{" "}
                      <LegalLink href="/reembolso">Política de Reembolso</LegalLink>, e
                      Declaro que li e estou ciente da{" "}
                      <LegalLink href="/privacidade">Política de Privacidade</LegalLink>.
                    </LegalCheckbox>
                    {signUpForm.formState.errors.legalAcceptance ? (
                      <p
                        id="signup-legal-error"
                        className="text-xs font-bold text-rose-600"
                        role="alert"
                      >
                        Marque o aceite obrigatório para criar a conta.
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    full
                    size="lg"
                    disabled={pending || !signupLegalReady}
                    className="h-12 rounded-[14px] text-base font-extrabold shadow-sm shadow-blue-900/15"
                  >
                    {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    Criar conta
                  </Button>
                  <p className="pt-2 text-center text-sm text-slate-600">
                    Já tem conta?{" "}
                    <button
                      type="button"
                      className="font-extrabold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      onClick={() => setMode("login")}
                    >
                      Entrar
                    </button>
                  </p>
                </form>
              ) : null}

              {mode === "reset" ? (
                <form
                  className="mt-6 space-y-4"
                  onSubmit={resetForm.handleSubmit(handleReset)}
                >
                  <Field
                    label="E-mail"
                    type="email"
                    autoComplete="username"
                    placeholder="voce@exemplo.com"
                    error={resetForm.formState.errors.email?.message}
                    registration={resetForm.register("email")}
                  />
                  <Button
                    type="submit"
                    full
                    size="lg"
                    disabled={pending}
                    className="h-12 rounded-[14px] text-base font-extrabold shadow-sm shadow-blue-900/15"
                  >
                    {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    Enviar link de recuperação
                  </Button>
                  <p className="pt-2 text-center text-sm text-slate-600">
                    Lembrou a senha?{" "}
                    <button
                      type="button"
                      className="font-extrabold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      onClick={() => setMode("login")}
                    >
                      Voltar para o login
                    </button>
                  </p>
                </form>
              ) : null}

              {mode === "verify" ? (
                <div className="mt-6 space-y-5">
                  <Notice tone="success" icon={MailCheck} title="Link de confirmação enviado">
                    <p>
                      Abra o e-mail que enviamos para
                      {verificationEmail ? (
                        <strong> {verificationEmail}</strong>
                      ) : (
                        " sua caixa de entrada"
                      )}{" "}
                      e clique no link para ativar sua conta. Depois disso, você
                      será levado ao checkout.
                    </p>
                  </Notice>
                  <form
                    className="space-y-4"
                    onSubmit={verificationForm.handleSubmit(handleResendVerification)}
                  >
                    <Field
                      label="Reenviar para"
                      type="email"
                      autoComplete="username"
                      placeholder="voce@exemplo.com"
                      error={verificationForm.formState.errors.email?.message}
                      registration={verificationForm.register("email")}
                    />
                    <Button
                      type="submit"
                      full
                      size="lg"
                      disabled={pending}
                      className="h-12 rounded-[14px] text-base font-extrabold shadow-sm shadow-blue-900/15"
                    >
                      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      Reenviar e-mail
                    </Button>
                  </form>
                  <p className="pt-2 text-center text-sm text-slate-600">
                    Já confirmou?{" "}
                    <button
                      type="button"
                      className="font-extrabold text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      onClick={() => setMode("login")}
                    >
                      Entrar na conta
                    </button>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <p className="pb-2 text-center text-xs font-medium leading-5 text-slate-500">
            Consulte os{" "}
            <Link href="/termos" className="underline underline-offset-2 hover:text-slate-900">
              Termos de Uso
            </Link>
            {" · "}
            <Link href="/privacidade" className="underline underline-offset-2 hover:text-slate-900">
              Política de Privacidade
            </Link>
            {" · "}
            <Link href="/reembolso" className="underline underline-offset-2 hover:text-slate-900">
              Política de Reembolso
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

function LegalCheckbox({
  id,
  describedBy,
  checked,
  onChange,
  children,
}: {
  id: string;
  describedBy?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-[14px] py-1 text-sm font-medium leading-6 text-slate-700"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={describedBy}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-blue-200 text-blue-700 focus:ring-4 focus:ring-blue-600/15"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {children}
    </Link>
  );
}

function showAuthToast(
  result: { ok: boolean; message: string },
  copy: ToastCopy,
) {
  if (result.ok) {
    toast.success(copy.successTitle, {
      description: copy.successDescription ?? result.message,
    });
    return;
  }

  toast.error(copy.errorTitle, {
    description: result.message,
  });
}

const inputClasses =
  "h-11 w-full rounded-[14px] border border-blue-100 bg-white px-4 text-base font-medium text-slate-950 shadow-sm shadow-blue-900/5 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 sm:text-sm";

function Field({
  label,
  registration,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const inputId = `auth-${registration.name.replace(/\./g, "-")}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="block">
      <label htmlFor={inputId} className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        className={inputClasses}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...registration}
      />
      {error ? (
        <span
          id={errorId}
          className="mt-1.5 block text-xs font-bold text-rose-600"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

function PasswordField({
  label,
  registration,
  error,
  autoComplete,
  labelAside,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  autoComplete?: string;
  labelAside?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = `auth-${registration.name.replace(/\./g, "-")}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="block">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3">
        <label htmlFor={inputId} className="text-sm font-bold text-slate-700">
          {label}
        </label>
        {labelAside}
      </div>
      <span className="relative block">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`${inputClasses} pr-11`}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...registration}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[14px] text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </span>
      {error ? (
        <span
          id={errorId}
          className="mt-1.5 block text-xs font-bold text-rose-600"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
