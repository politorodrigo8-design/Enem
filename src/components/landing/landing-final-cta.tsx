import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
          className="mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-white px-6 text-base font-extrabold text-blue-800 shadow-sm shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 sm:w-auto"
        >
          Começar minha preparação
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
