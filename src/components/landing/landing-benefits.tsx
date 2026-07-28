import { Reveal } from "@/components/ui/reveal";
import { benefits } from "./landing-data";

export function LandingBenefits() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Menos dúvida. Mais direção.
          </h2>
          <p className="mt-4 text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Você não precisa escolher o próximo assunto no improviso. O Pontua
            Enem transforma seus resultados em uma ordem clara de estudo.
          </p>
        </Reveal>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Reveal
              key={benefit.title}
              delay={index * 70}
              className="rounded-[24px] border border-blue-100 bg-blue-50/45 p-6 shadow-sm shadow-blue-900/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-blue-700 shadow-sm shadow-blue-900/5">
                <benefit.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-950">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {benefit.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
