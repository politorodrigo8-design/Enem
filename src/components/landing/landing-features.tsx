import { Reveal } from "@/components/ui/reveal";
import { essentialFeatures } from "./landing-data";

export function LandingFeatures() {
  return (
    <section id="recursos" className="scroll-mt-24 bg-[#f5faff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Tudo para organizar sua preparação.
          </h2>
        </Reveal>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {essentialFeatures.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 60}
              className="rounded-[24px] border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5"
            >
              <feature.icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-extrabold text-slate-950">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {feature.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
