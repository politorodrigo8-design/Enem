"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Lock,
  Mail,
  Send,
  User,
} from "lucide-react";
import { Suspense, useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom");
  const setupMissing = searchParams.get("setup") === "supabase";
  const [mode, setMode] = useState<"login" | "signup" | "reset">("signup");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const signInForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "rodrigo@nexoenem.com", password: "estrategia123" },
  });

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "Rodrigo Polito",
      email: "rodrigo@nexoenem.com",
      password: "estrategia123",
      confirmPassword: "estrategia123",
    },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "rodrigo@nexoenem.com" },
  });

  function handleSignIn(values: SignInInput) {
    startTransition(async () => {
      const result = await signInAction(values);
      setMessage(result.message);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        router.push(redirectedFrom || "/dashboard");
        router.refresh();
      }
    });
  }

  function handleSignUp(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      setMessage(result.message);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        router.push("/checkout");
        router.refresh();
      }
    });
  }

  function handleReset(values: ResetPasswordInput) {
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      setMessage(result.message);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Logo className="text-white" />
            <div className="mt-20 max-w-xl">
              <p className="text-sm font-semibold uppercase text-blue-200">
                Acesso com Supabase Auth
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-tight">
                Entre para ver sua rota estratégica do ENEM.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                A sessão agora é persistida pelo Supabase. O dashboard só abre
                para usuários autenticados.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ["RLS", "dados isolados"],
              ["Auth", "sessão real"],
              ["DB", "progresso salvo"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg bg-white/10 p-4">
                <p className="text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <Link
                href="/"
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Link>
            </div>
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div>
                  <p className="text-sm font-semibold text-blue-700">NexoENEM</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    {mode === "signup"
                      ? "Criar conta"
                      : mode === "reset"
                        ? "Recuperar senha"
                        : "Entrar"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {mode === "reset"
                      ? "Informe seu e-mail para receber o link de recuperação."
                      : "Use e-mail e senha para acessar seu progresso salvo no banco."}
                  </p>
                </div>

                {setupMissing ? (
                  <Notice tone="warning" className="mt-5">
                    Configure as variáveis do Supabase para ativar login,
                    cadastro e rotas protegidas.
                  </Notice>
                ) : null}

                <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
                  <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
                    Entrar
                  </ModeButton>
                  <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
                    Criar
                  </ModeButton>
                  <ModeButton active={mode === "reset"} onClick={() => setMode("reset")}>
                    Senha
                  </ModeButton>
                </div>

                {message ? (
                  <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    {message}
                  </p>
                ) : null}

                {mode === "login" ? (
                  <form
                    className="mt-6 space-y-4"
                    onSubmit={signInForm.handleSubmit(handleSignIn)}
                  >
                    <InputField
                      label="E-mail"
                      icon={Mail}
                      type="email"
                      autoComplete="username"
                      error={signInForm.formState.errors.email?.message}
                      registration={signInForm.register("email")}
                    />
                    <InputField
                      label="Senha"
                      icon={Lock}
                      type="password"
                      autoComplete="current-password"
                      error={signInForm.formState.errors.password?.message}
                      registration={signInForm.register("password")}
                    />
                    <Button type="submit" full size="lg" disabled={pending}>
                      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      Entrar
                    </Button>
                  </form>
                ) : null}

                {mode === "signup" ? (
                  <form
                    className="mt-6 space-y-4"
                    onSubmit={signUpForm.handleSubmit(handleSignUp)}
                  >
                    <InputField
                      label="Nome"
                      icon={User}
                      error={signUpForm.formState.errors.fullName?.message}
                      registration={signUpForm.register("fullName")}
                    />
                    <InputField
                      label="E-mail"
                      icon={Mail}
                      type="email"
                      autoComplete="username"
                      error={signUpForm.formState.errors.email?.message}
                      registration={signUpForm.register("email")}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField
                        label="Senha"
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        error={signUpForm.formState.errors.password?.message}
                        registration={signUpForm.register("password")}
                      />
                      <InputField
                        label="Confirmar senha"
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        error={signUpForm.formState.errors.confirmPassword?.message}
                        registration={signUpForm.register("confirmPassword")}
                      />
                    </div>
                    <Button type="submit" full size="lg" disabled={pending}>
                      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      Criar conta e comprar
                    </Button>
                  </form>
                ) : null}

                {mode === "reset" ? (
                  <form
                    className="mt-6 space-y-4"
                    onSubmit={resetForm.handleSubmit(handleReset)}
                  >
                    <InputField
                      label="E-mail"
                      icon={Mail}
                      type="email"
                      autoComplete="username"
                      error={resetForm.formState.errors.email?.message}
                      registration={resetForm.register("email")}
                    />
                    <Button type="submit" full size="lg" disabled={pending}>
                      {pending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" aria-hidden="true" />
                      )}
                      Enviar recuperação
                    </Button>
                  </form>
                ) : null}

                <div className="mt-4">
                  <Button type="button" variant="outline" full size="lg" disabled>
                    <Globe className="h-5 w-5" aria-hidden="true" />
                    Continuar com Google em breve
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-sm"
          : "rounded-md px-3 py-2 text-sm font-bold text-slate-600"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InputField({
  label,
  icon: Icon,
  registration,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  icon: typeof Mail;
  registration: UseFormRegisterReturn;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type={type}
          className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none"
          autoComplete={autoComplete}
          {...registration}
        />
      </div>
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}
