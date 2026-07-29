import Link from "next/link";
import { XCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentFailurePage() {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#eff7ff_100%)] py-10 sm:py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card className="rounded-[28px] border-blue-100 shadow-sm shadow-blue-900/5">
          <CardContent className="p-6 sm:p-10">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-rose-50 text-rose-600">
              <XCircle className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
              Pagamento não aprovado
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Nenhuma cobrança foi concluída. Você pode tentar novamente ou
              falar com o suporte para conferir o status do pedido.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/checkout"
                className={buttonClasses({ variant: "primary", size: "lg", className: "rounded-2xl" })}
              >
                Tentar novamente
              </Link>
              <Link
                href="mailto:suporte@pontuaenem.com.br"
                className={buttonClasses({ variant: "outline", size: "lg", className: "rounded-2xl" })}
              >
                Suporte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
