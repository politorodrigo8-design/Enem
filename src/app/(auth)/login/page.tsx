"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Suspense, useState, useTransition } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
import { safeInternalPath } from "@/lib/utils";
import {
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

type Mode = "login" | "signup" | "reset";

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
    description: "Leva menos de um minuto. Depois você conclui a compra do acesso.",
  },
  reset: {
    title: "Recuperar senha",
    description:
      "Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = safeInternalPath(searchParams.get("redirectedFrom"));
  const setupMissing = searchParams.get("setup") === "supabase";
  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
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
  const signupLegalAcceptance = useWatch({
    control: signUpForm.control,
    name: "legalAcceptance",
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
      }
    });
  }

  function handleSignUp(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      showAuthToast(result, {
        successTitle: "Conta criada com sucesso",
        successDescription: "Tudo certo. Vamos continuar para o próximo passo.",
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

  const copy = headline[mode];
  const signupLegalReady =
    signupLegalAcceptance?.terms_of_use === legalVersions.terms_of_use &&
    signupLegalAcceptance?.refund_policy === legalVersions.refund_policy &&
    signupLegalAcceptance?.privacy_policy === legalVersions.privacy_policy;

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo variant="dark" />
        <div className="animate-rise max-w-lg">
          <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight">
            Estudar certo é{" "}
            <span className="highlight text-slate-950">saber o que priorizar</span>.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Diagnóstico, prioridades por assunto e um plano semanal que evolui
            com você — tudo salvo na sua conta, até o dia da prova.
          </p>
        </div>
        <figure
          className="animate-rise max-w-lg border-l-2 border-blue-500 pl-5"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        >
          <blockquote className="text-base leading-7 text-slate-300">
            &ldquo;A diferença entre estudar muito e estudar certo aparece na
            nota.&rdquo;
          </blockquote>
          <figcaption className="mt-3 text-sm font-semibold text-slate-500">
            Método Pontua Enem
          </figcaption>
        </figure>
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao site
          </Link>
        </div>

        <div
          className="animate-rise mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>

          {setupMissing ? (
            <Notice tone="warning" className="mt-6">
              O login está temporariamente indisponível. Tente novamente em
              alguns minutos ou fale com suporte@pontuaenem.com.br.
            </Notice>
          ) : null}

          {mode === "login" ? (
            <form
              className="mt-8 space-y-5"
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
                    className="text-sm font-medium text-blue-700 transition-colors hover:text-blue-800"
                    onClick={() => setMode("reset")}
                  >
                    Esqueci minha senha
                  </button>
                }
              />
              <Button type="submit" full size="lg" disabled={pending}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Entrar
              </Button>
              <p className="pt-2 text-center text-sm text-slate-600">
                Novo por aqui?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-700 transition-colors hover:text-blue-800"
                  onClick={() => setMode("signup")}
                >
                  Criar conta
                </button>
              </p>
            </form>
          ) : null}

          {mode === "signup" ? (
            <form
              className="mt-8 space-y-5"
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
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <LegalCheckbox
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
                  <p className="text-xs font-semibold text-rose-600" role="alert">
                    Marque o aceite obrigatório para criar a conta.
                  </p>
                ) : null}
              </div>
              <Button type="submit" full size="lg" disabled={pending || !signupLegalReady}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Criar conta
              </Button>
              <p className="pt-2 text-center text-sm text-slate-600">
                Já tem conta?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-700 transition-colors hover:text-blue-800"
                  onClick={() => setMode("login")}
                >
                  Entrar
                </button>
              </p>
            </form>
          ) : null}

          {mode === "reset" ? (
            <form
              className="mt-8 space-y-5"
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
              <Button type="submit" full size="lg" disabled={pending}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Enviar link de recuperação
              </Button>
              <p className="pt-2 text-center text-sm text-slate-600">
                Lembrou a senha?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-700 transition-colors hover:text-blue-800"
                  onClick={() => setMode("login")}
                >
                  Voltar para o login
                </button>
              </p>
            </form>
          ) : null}
        </div>

        <p className="text-center text-xs leading-5 text-slate-400">
          Consulte os{" "}
          <Link href="/termos" className="underline underline-offset-2 hover:text-slate-600">
            Termos de Uso
          </Link>
          {" · "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-slate-600">
            Política de Privacidade
          </Link>
          {" · "}
          <Link href="/reembolso" className="underline underline-offset-2 hover:text-slate-600">
            Política de Reembolso
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function LegalCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-600/20"
      />
      <span>{children}</span>
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
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-950 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15";

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
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        className={inputClasses}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        {...registration}
      />
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
      ) : null}
    </label>
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

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {labelAside}
      </span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          className={`${inputClasses} pr-11`}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          {...registration}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
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
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
      ) : null}
    </label>
  );
}
