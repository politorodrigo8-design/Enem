import Link from "next/link";
import { CalendarX, Mail } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ExpiredAccessPage() {
  return (
    <main className="bg-slate-50 py-16">
      <div className="animate-rise mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <CalendarX className="h-10 w-10 text-amber-600" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-display font-semibold tracking-tight text-slate-950">
              Seu acesso ao Pontua Enem expirou.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Seu acesso valia até a data do ENEM 2026. Quando abrirmos a
              próxima edição, você poderá comprar de novo — sem renovação
              automática e sem cobrança surpresa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkout" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Ver próxima oferta
              </Link>
              <Link href="mailto:suporte@pontuaenem.com.br" className={buttonClasses({ variant: "outline", size: "lg" })}>
                <Mail className="h-5 w-5" aria-hidden="true" />
                Falar com suporte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
