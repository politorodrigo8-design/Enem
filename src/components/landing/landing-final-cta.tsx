import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ctaClasses } from "@/components/ui/cta";

type LandingFinalCtaProps = {
  ctaHref: string;
};

export function LandingFinalCta({ ctaHref }: LandingFinalCtaProps) {
  return (
    <section className="bg-blue-700 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Seu próximo estudo pode começar com mais clareza.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-blue-50 sm:text-lg">
          Descubra suas prioridades e transforme seu desempenho em um plano
          possível para a semana.
        </p>
        <Link
          href={ctaHref}
          className={ctaClasses({
            variant: "inverse",
            full: true,
            className: "mt-8 sm:w-auto",
          })}
        >
          Começar minha preparação
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
