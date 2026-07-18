import Link from "next/link";
import { Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentPendingPage() {
  return (
    <main className="bg-slate-50 py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <Clock className="h-10 w-10 text-amber-600" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-bold text-slate-950">
              Pagamento pendente
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              O acesso sera liberado automaticamente quando o Mercado Pago
              confirmar o pagamento pelo webhook.
            </p>
            <Link href="/checkout" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-8" })}>
              Voltar ao checkout
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
