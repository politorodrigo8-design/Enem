import Link from "next/link";
import { Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className="bg-slate-50 py-10 sm:py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6 sm:p-10">
            <Clock className="h-10 w-10 text-amber-600" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-display font-semibold tracking-tight text-slate-950">
              Recebemos seu pedido
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Estamos aguardando a confirmação do pagamento. Pix costuma ser confirmado em
              minutos; boleto pode levar até 3 dias úteis. Seu acesso é liberado
              automaticamente na confirmação — você não precisa pagar de novo.
            </p>
            {/* O único caminho daqui era "Voltar ao checkout", que pedia o pagamento
                outra vez a quem tinha acabado de pagar. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={order ? `/pagamento/sucesso?order=${order}` : "/pagamento/sucesso"}
                className={buttonClasses({ variant: "primary", size: "lg" })}
              >
                Verificar meu pagamento
              </Link>
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "outline", size: "lg" })}
              >
                Ir para a plataforma
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-500">
              Já confirmou e o acesso não liberou? Escreva para{" "}
              <a
                href="mailto:suporte@pontuaenem.com.br"
                className="font-medium underline underline-offset-2 hover:text-slate-700"
              >
                suporte@pontuaenem.com.br
              </a>
              {order ? ` informando o pedido ${order}.` : " informando a data do pagamento."}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
