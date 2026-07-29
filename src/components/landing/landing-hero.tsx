import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ctaClasses } from "@/components/ui/cta";
import { accessUntilLabel, initialCreditsLabel } from "./landing-data";
import { LandingSectionLink } from "./landing-section-link";

type LandingHeroProps = {
  ctaHref: string;
};

export function LandingHero({ ctaHref }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#eff7ff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-56 max-w-4xl rounded-full bg-blue-100/55 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-3 px-4 pb-4 pt-6 sm:gap-7 sm:px-6 sm:pb-10 sm:pt-10 lg:min-h-[calc(88svh-4rem)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:px-8 lg:py-12">
        <div className="max-w-2xl">
          <h1
            className="animate-rise text-[2.15rem] font-extrabold leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl"
            style={{ "--rise-delay": "60ms" } as React.CSSProperties}
          >
            Um novo jeito de estudar.
          </h1>
          <p
            className="animate-rise mt-4 max-w-xl text-lg font-medium leading-8 text-slate-600 sm:mt-5"
            style={{ "--rise-delay": "120ms" } as React.CSSProperties}
          >
            O Pontua Enem analisa seu desempenho, mostra suas prioridades e
            organiza seus próximos estudos com questões, simulados, redação e um
            plano semanal.
          </p>
          <div
            className="animate-rise mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row"
            style={{ "--rise-delay": "180ms" } as React.CSSProperties}
          >
            <Link href={ctaHref} className={ctaClasses({ className: "sm:w-auto" })}>
              Começar minha preparação
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <LandingSectionLink
              href="/#como-funciona"
              className={ctaClasses({ variant: "outline", className: "sm:w-auto" })}
            >
              Ver como funciona
            </LandingSectionLink>
          </div>
          <div
            className="animate-rise mt-4 space-y-1.5 text-sm font-bold leading-6 text-slate-600 sm:mt-5"
            style={{ "--rise-delay": "240ms" } as React.CSSProperties}
          >
            <p>Pagamento único de R$ 99,90 para acesso até {accessUntilLabel}.</p>
            <p>{initialCreditsLabel}. Sem mensalidade.</p>
          </div>
        </div>
        <div
          className="animate-rise -mb-4 flex justify-center sm:-mb-10 lg:-mb-12 lg:-mr-4 lg:justify-end lg:self-end xl:-mr-10"
          style={{ "--rise-delay": "160ms" } as React.CSSProperties}
        >
          <Image
            src="/images/landing/aluno-pontua-enem-app-2026.webp"
            alt="Aluno sorrindo ao mostrar o app do Pontua Enem no celular"
            width={1155}
            height={1011}
            priority
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 42vw, 595px"
            className="h-auto w-full max-w-[270px] object-contain sm:max-w-[420px] md:max-w-[480px] lg:w-[80%] lg:max-w-none xl:max-w-[550px]"
          />
        </div>
      </div>
    </section>
  );
}
