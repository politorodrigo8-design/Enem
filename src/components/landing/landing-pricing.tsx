import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ctaClasses } from "@/components/ui/cta";
import { formatCurrency } from "@/lib/services/billing";
import { PRODUCT_NAME } from "@/lib/product-config";
import { pricingItems } from "./landing-data";

type LandingPricingProps = {
  price: number;
  ctaHref: string;
};

export function LandingPricing({ price, ctaHref }: LandingPricingProps) {
  return (
    <section id="preco" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Um acesso completo até o ENEM.
          </h2>
        </div>

        <div className="mx-auto mt-9 max-w-3xl rounded-[28px] border border-blue-100 bg-[#f8fbff] p-4 shadow-sm shadow-blue-900/5 sm:p-5">
          <div className="rounded-[24px] bg-white p-6 shadow-sm shadow-blue-900/5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                  Pagamento único
                </span>
                <h3 className="mt-4 text-2xl font-extrabold text-slate-950">
                  {PRODUCT_NAME}
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <p className="tnum text-5xl font-extrabold leading-none text-blue-700">
                  {formatCurrency(price)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Pagamento único
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {pricingItems.map((item) => (
                <div key={item} className="flex gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold leading-6 text-slate-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href={ctaHref}
              className={ctaClasses({ full: true, className: "mt-8 sm:w-auto" })}
            >
              Começar minha preparação
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>

            <p className="mt-5 text-sm font-medium leading-6 text-slate-600">
              Recargas adicionais são opcionais. O custo de cada recurso é
              informado antes da confirmação.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm font-medium leading-6 text-slate-500">
          O Pontua Enem é uma plataforma independente. As prioridades são
          estimativas educacionais e não representam previsão de nota, conteúdo
          da prova ou garantia de aprovação.
        </p>
      </div>
    </section>
  );
}
