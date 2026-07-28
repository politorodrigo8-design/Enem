import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { faqs } from "./landing-data";

export function LandingFaq() {
  return (
    <section id="duvidas" className="scroll-mt-24 bg-[#f5faff] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Dúvidas antes de começar?
          </h2>
        </Reveal>
        <Reveal className="mt-9 grid gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[20px] border border-blue-100 bg-white px-5 shadow-sm shadow-blue-900/5"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-extrabold text-slate-950 transition-colors hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-blue-700 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 pr-2 text-sm font-medium leading-7 text-slate-600 sm:pr-9">
                {faq.answer}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
