"use client";

import { CheckCircle2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { productTabs } from "./landing-data";

export function LandingProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTab = productTabs[activeIndex];

  function selectTab(index: number) {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const lastIndex = productTabs.length - 1;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(activeIndex === lastIndex ? 0 : activeIndex + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(activeIndex === 0 ? lastIndex : activeIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      selectTab(lastIndex);
    }
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            Veja o Pontua Enem por dentro.
          </h2>
          <p className="mt-4 text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Cada parte da plataforma ajuda você a tomar uma decisão mais clara
            sobre seus estudos.
          </p>
        </div>

        <div className="mt-9 rounded-[28px] border border-blue-100 bg-[#f8fbff] p-3 shadow-sm shadow-blue-900/5 sm:p-4 lg:p-5">
          <div
            className="grid gap-2 rounded-[22px] bg-white p-2 shadow-sm shadow-blue-900/5 md:grid-cols-4"
            role="tablist"
            aria-label="Demonstração do produto"
            onKeyDown={handleKeyDown}
          >
            {productTabs.map((tab, index) => {
              const selected = activeIndex === index;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-${tab.id}-tab`}
                  aria-controls={`${baseId}-${tab.id}-panel`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                    selected
                      ? "bg-blue-700 text-white shadow-sm shadow-blue-900/15"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-800",
                  )}
                >
                  <tab.icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`${baseId}-${activeTab.id}-panel`}
            aria-labelledby={`${baseId}-${activeTab.id}-tab`}
            className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[0.75fr_1fr] lg:p-8"
          >
            <div className="flex flex-col justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-100 text-blue-700">
                <activeTab.icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-2xl font-extrabold text-slate-950">
                {activeTab.title}
              </h3>
              <p className="mt-3 text-base font-medium leading-7 text-slate-600">
                {activeTab.description}
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-900/5 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase text-blue-700">
                    {activeTab.preview.eyebrow}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-slate-950">
                    {activeTab.preview.heading}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                  Pontua Enem
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {activeTab.preview.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[18px] bg-[#f7fbff] p-4"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold leading-6 text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-[18px] bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
                {activeTab.preview.note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
