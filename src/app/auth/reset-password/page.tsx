"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { updatePasswordAction } from "@/lib/actions/auth";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/lib/schemas/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: UpdatePasswordInput) {
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      setMessage(result.message);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        router.push("/dashboard");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="animate-rise mb-8 flex items-center justify-between">
          <Logo />
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Login
          </Link>
        </div>
        <div
          className="animate-rise"
          style={{ "--rise-delay": "70ms" } as React.CSSProperties}
        >
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-slate-950">Definir nova senha</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Informe uma nova senha para continuar usando o NexoENEM.
              </p>
              <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <PasswordField
                  label="Nova senha"
                  error={form.formState.errors.password?.message}
                  register={form.register("password")}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  error={form.formState.errors.confirmPassword?.message}
                  register={form.register("confirmPassword")}
                />
                {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
                <Button type="submit" full size="lg" disabled={pending}>
                  {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Atualizar senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function PasswordField({
  label,
  error,
  register,
}: {
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-400">
        <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type="password"
          className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none"
          {...register}
        />
      </div>
      {error ? <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}
