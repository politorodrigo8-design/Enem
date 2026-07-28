import { Reveal } from "@/components/ui/reveal";
import { howItWorksSteps } from "./landing-data";

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 bg-[#f5faff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Do diagnóstico ao próximo passo.
          </h2>
          <p className="mt-4 text-base font-medium leading-7 text-slate-600 sm:text-lg">
            O Pontua Enem organiza sua preparação em uma sequência simples.
          </p>
        </Reveal>
        <div className="relative mt-10 grid gap-4 md:grid-cols-3">
          <div
            className="absolute left-8 right-8 top-8 hidden h-px bg-blue-100 md:block"
            aria-hidden="true"
          />
          {howItWorksSteps.map((step, index) => (
            <Reveal
              key={step.title}
              delay={index * 80}
              className="relative rounded-[24px] border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5"
            >
              <span className="tnum flex h-16 w-16 items-center justify-center rounded-full border-8 border-[#f5faff] bg-blue-700 text-xl font-extrabold text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
