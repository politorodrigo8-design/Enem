import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col justify-center">
        <Logo className="mb-10" />
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Erro 404</p>
        <h1 className="mt-3 text-4xl font-display font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          O endereço pode ter mudado ou a página saiu do ar. Volte para uma área conhecida e
          continue seus estudos.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClasses({ variant: "primary", size: "lg" })}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Ir para o início
          </Link>
          <Link href="/dashboard" className={buttonClasses({ variant: "outline", size: "lg" })}>
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
            Abrir dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
