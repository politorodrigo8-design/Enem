import Link from "next/link";
import { ArrowRight, Check, Headphones } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";

const benefits = [
  "Radar ENEM",
  "Banco de questões",
  "Diagnóstico personalizado",
  "Simulados",
  "Plano semanal",
  "Revisão de erros",
];

export default async function AccessRequiredPage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);

  return (
    <main className="bg-slate-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <p className="text-sm font-semibold text-blue-700">Conta criada</p>
            <h1 className="mt-3 text-3xl font-display font-semibold tracking-tight text-slate-950">
              Falta um passo: concluir a compra.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              O NexoENEM Completo custa {formatCurrency(price)} em pagamento
              único, sem mensalidade e sem renovação automática.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkout" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Ir para checkout
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="mailto:suporte@nexoenem.com" className={buttonClasses({ variant: "outline", size: "lg" })}>
                <Headphones className="h-5 w-5" aria-hidden="true" />
                Suporte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
