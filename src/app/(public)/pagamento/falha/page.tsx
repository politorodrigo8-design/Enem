import Link from "next/link";
import { XCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentFailurePage() {
  return (
    <main className="bg-slate-50 py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <XCircle className="h-10 w-10 text-rose-600" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-display font-semibold tracking-tight text-slate-950">
              Pagamento não aprovado
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Nenhuma cobrança foi concluída. Você pode tentar novamente ou
              falar com o suporte para conferir o status do pedido.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkout" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Tentar novamente
              </Link>
              <Link href="mailto:suporte@pontuaenem.com.br" className={buttonClasses({ variant: "outline", size: "lg" })}>
                Suporte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
