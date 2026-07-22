"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { evolutionData } from "@/data/student";
import { cn } from "@/lib/utils";

const startScore = evolutionData[0].score;
const finalScore = evolutionData[evolutionData.length - 1].score;
const scoreGain = finalScore - startScore;

const priorities = [
  { topic: "Razão e proporção", accuracy: 42, critical: true },
  { topic: "Ecologia", accuracy: 57, critical: false },
  { topic: "Eletricidade", accuracy: 48, critical: false },
];

// Altura relativa das barras: reescala o intervalo de notas para 25–100%
// para a progressão semanal ficar visível (em escala absoluta as barras
// ficariam quase idênticas).
function barHeight(score: number) {
  return 25 + ((score - startScore) / scoreGain) * 75;
}

export function HeroPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(startScore);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setActive(true);

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setScore(finalScore);
          return;
        }

        const duration = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setScore(Math.round(startScore + scoreGain * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const step = (delay: number) => ({
    className: cn(
      "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-100",
    ),
    style: { transitionDelay: active ? `${delay}ms` : "0ms" },
  });

  return (
    <div
      ref={panelRef}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
    >
      <div className="p-5">
        <div {...step(0)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Painel estratégico
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                Faixa atual <span className="tnum">{score - 18}-{score + 18}</span>
              </p>
            </div>
            <Badge tone="green">
              <TrendingUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />+
              {scoreGain} pts de evolução estimada
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Indicador educacional baseado no desempenho registrado, sem previsão
            garantida de nota.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              Foco da semana: Matemática
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
              54 questões resolvidas
            </span>
          </div>
        </div>

        <div {...step(180)}>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-slate-950">
              Evolução estimada
            </p>
            <p className="text-xs font-medium text-slate-500">
              uma barra por semana
            </p>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {evolutionData.map((item, index) => {
              const isLast = index === evolutionData.length - 1;
              return (
                <div key={item.label}>
                  <div className="flex h-24 items-end rounded-md bg-slate-100 p-1">
                    <div
                      className={cn(
                        "w-full rounded-sm transition-[height] duration-700 ease-out motion-reduce:transition-none",
                        isLast ? "bg-blue-700" : "bg-blue-600/80",
                      )}
                      style={{
                        height: active ? `${barHeight(item.score)}%` : "0%",
                        transitionDelay: active ? `${320 + index * 90}ms` : "0ms",
                      }}
                    />
                  </div>
                  <p
                    className={cn(
                      "tnum mt-1.5 text-center text-xs",
                      isLast
                        ? "font-bold text-slate-950"
                        : "font-medium text-slate-500",
                    )}
                  >
                    {item.score}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div {...step(700)}>
          <div className="mt-5 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-slate-950">
              Onde você mais perde pontos
            </p>
            <p className="text-xs font-medium text-slate-500">taxa de acerto</p>
          </div>
          <div className="mt-3 space-y-3.5">
            {priorities.map((priority, index) => (
              <div key={priority.topic}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    {priority.topic}
                    {priority.critical ? (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        começar por aqui
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum font-semibold text-slate-950">
                    {priority.accuracy}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-md bg-slate-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={priority.accuracy}
                >
                  <div
                    className={cn(
                      "h-full rounded-md transition-[width] duration-700 ease-out motion-reduce:transition-none",
                      priority.critical ? "bg-rose-500" : "bg-blue-700",
                    )}
                    style={{
                      width: active ? `${priority.accuracy}%` : "0%",
                      transitionDelay: active ? `${820 + index * 110}ms` : "0ms",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div {...step(1200)}>
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              Recomendação da semana
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Priorize proporcionalidade antes de avançar para funções. É um
              gargalo recorrente e aparece em problemas de diferentes contextos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
