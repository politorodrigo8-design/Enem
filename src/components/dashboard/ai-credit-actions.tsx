"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Coins,
  Copy,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AI_PERFORMANCE_ANALYSIS_CREDIT_COST,
  AI_QUESTION_EXPLANATION_CREDIT_COST,
  AI_STUDY_PLAN_CREDIT_COST,
} from "@/lib/ai/credits";
import {
  applySmartStudyPlanAction,
  generatePerformanceAnalysisAction,
  generateQuestionExplanationAction,
  generateSmartStudyPlanAction,
} from "@/lib/actions/ai";
import type {
  PerformanceAnalysisResult,
  QuestionExplanationResult,
  SmartStudyPlanResult,
} from "@/lib/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImportedPriority = {
  area: string;
  subject: string;
  topic: string;
  reason?: string;
  questionGoal?: number;
};

const importedPriorityStorageKey = "pontua-ai-imported-priorities";

export function QuestionExplanationCreditAction({
  questionId,
  selectedOption,
  disabled,
}: {
  questionId: string;
  selectedOption?: string;
  disabled?: boolean;
}) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<QuestionExplanationResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function generate() {
    setError("");
    startTransition(async () => {
      const response = await generateQuestionExplanationAction({
        questionId,
        selectedOption: selectedOption || undefined,
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.questionExplanation) {
        setResult(response.questionExplanation);
        setBalanceAfter(response.balanceAfter ?? null);
      } else {
        setError(response.message);
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-blue-950">
            <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Explicar questão
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-700">
            Entenda o enunciado, as alternativas e a resolução passo a passo.
          </p>
          <CreditText cost={AI_QUESTION_EXPLANATION_CREDIT_COST} />
        </div>
      </div>
      <Button
        ref={openerRef}
        className="mt-3"
        variant="outline"
        size="sm"
        full
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {disabled ? "Responda para explicar" : "Explicar com IA"}
      </Button>
      <ResponsivePanel
        open={open}
        title="Explicação da questão"
        mode="drawer"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        action={
          result ? (
            <Button variant="outline" size="sm" onClick={() => copyExplanation(result)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar explicação
            </Button>
          ) : null
        }
      >
        {!result && !pending && !error ? (
          <ConfirmGeneration
            description="A explicação será criada com base no enunciado, nas alternativas, no gabarito e na sua resposta marcada."
            cost={AI_QUESTION_EXPLANATION_CREDIT_COST}
            buttonLabel="Confirmar explicação"
            onConfirm={generate}
          />
        ) : null}
        {pending ? <ExplanationSkeleton /> : null}
        {error ? (
          <AiError message={error} fallback="Não foi possível gerar a explicação agora." onRetry={generate} />
        ) : null}
        {result ? (
          <QuestionExplanationView result={result} balanceAfter={balanceAfter} />
        ) : null}
      </ResponsivePanel>
    </div>
  );
}

export function PerformanceAnalysisCreditAction({ disabled }: { disabled?: boolean }) {
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PerformanceAnalysisResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [insufficientData, setInsufficientData] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError("");
    setInsufficientData(false);
    startTransition(async () => {
      const response = await generatePerformanceAnalysisAction();
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.performanceAnalysis) {
        setResult(response.performanceAnalysis);
        setBalanceAfter(response.balanceAfter ?? null);
      } else if (!response.ok) {
        setInsufficientData(Boolean(response.insufficientData));
        setError(response.message);
      }
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
            <BarChart3 className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Análise de desempenho
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            Entenda seus erros recentes, identifique padrões e veja quais conteúdos devem ser priorizados nos próximos estudos.
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
            Esta análise considera suas respostas recentes, taxa de acertos, assuntos com maior dificuldade e desempenho por área.
          </p>
          <CreditText cost={AI_PERFORMANCE_ANALYSIS_CREDIT_COST} />
        </div>
        <Button
          ref={openerRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Analisar meu desempenho
        </Button>
      </div>
      <ResponsivePanel
        open={open}
        title="Análise de desempenho"
        mode="modal"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        wide
      >
        {!result && !pending && !error ? (
          <ConfirmGeneration
            description="A análise será baseada nos seus resultados recentes e nas métricas calculadas pela plataforma."
            cost={AI_PERFORMANCE_ANALYSIS_CREDIT_COST}
            buttonLabel="Confirmar análise"
            onConfirm={generate}
          />
        ) : null}
        {pending ? <PerformanceSkeleton /> : null}
        {error ? (
          insufficientData ? <InsufficientData /> : (
            <AiError
              message={error}
              fallback="Não foi possível concluir a análise agora."
              onRetry={generate}
            />
          )
        ) : null}
        {result ? (
          <PerformanceAnalysisView result={result} balanceAfter={balanceAfter} />
        ) : null}
      </ResponsivePanel>
    </section>
  );
}

export function SmartStudyPlanCreditAction({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SmartStudyPlanResult | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importedPriorities, setImportedPriorities] = useState<ImportedPriority[]>(() =>
    loadImportedPriorities(),
  );
  const [pending, startTransition] = useTransition();

  function removePriority(topic: string) {
    const next = importedPriorities.filter((priority) => priority.topic !== topic);
    setImportedPriorities(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(importedPriorityStorageKey, JSON.stringify(next));
    }
  }

  function generate(force = false) {
    if (result && !force) return;
    setError("");
    startTransition(async () => {
      const response = await generateSmartStudyPlanAction({
        importedPriorities,
      });
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok && response.studyPlan) {
        setResult(response.studyPlan);
        setBalanceAfter(response.balanceAfter ?? null);
      } else {
        setError(response.message);
      }
    });
  }

  function generateAnother() {
    const confirmed = window.confirm(
      `Gerar outro ajuste consome ${AI_STUDY_PLAN_CREDIT_COST} créditos. Deseja continuar?`,
    );
    if (confirmed) generate(true);
  }

  function applyPlan() {
    if (!result) return;
    startTransition(async () => {
      const response = await applySmartStudyPlanAction(result);
      toast[response.ok ? "success" : "error"](response.message);
      if (response.ok) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-blue-950">
            <CalendarDays className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Plano inteligente
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">
            Ajuste sua semana com base no Radar ENEM, nos erros recentes e na sua rotina de estudos.
          </p>
          <CreditText cost={AI_STUDY_PLAN_CREDIT_COST} />
        </div>
        <Button
          ref={openerRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Otimizar meu plano
        </Button>
      </div>
      <ResponsivePanel
        open={open}
        title="Plano inteligente"
        mode="modal"
        busy={pending}
        openerRef={openerRef}
        onClose={() => setOpen(false)}
        wide
      >
        {!result && !pending && !error ? (
          <ConfirmGeneration
            description="O plano será reorganizado respeitando sua rotina cadastrada, o Radar ENEM e as prioridades importadas."
            cost={AI_STUDY_PLAN_CREDIT_COST}
            buttonLabel="Confirmar otimização"
            onConfirm={() => generate()}
          >
            <ImportedPriorities priorities={importedPriorities} onRemove={removePriority} />
          </ConfirmGeneration>
        ) : null}
        {pending ? <PlanSkeleton /> : null}
        {error ? (
          <AiError message={error} fallback="Não foi possível otimizar o plano agora." onRetry={() => generate(true)} />
        ) : null}
        {result ? (
          <SmartStudyPlanView
            result={result}
            balanceAfter={balanceAfter}
            applying={pending}
            onApply={applyPlan}
            onGenerateAnother={generateAnother}
            onBack={() => setOpen(false)}
          />
        ) : null}
      </ResponsivePanel>
    </div>
  );
}

function ResponsivePanel({
  open,
  title,
  mode,
  busy,
  openerRef,
  onClose,
  action,
  wide,
  children,
}: {
  open: boolean;
  title: string;
  mode: "drawer" | "modal";
  busy: boolean;
  openerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  action?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [busy, onClose, open, openerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/30"
        aria-label="Fechar painel"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-panel-title"
        tabIndex={-1}
        className={cn(
          "fixed flex max-h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl outline-none",
          "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
          mode === "drawer"
            ? "inset-y-0 right-0 w-full sm:max-w-[620px]"
            : "inset-x-0 bottom-0 top-0 w-full sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
          mode === "modal" && (wide ? "sm:max-w-[1040px]" : "sm:max-w-[860px]"),
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="ai-panel-title" className="text-base font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Resultado organizado para estudo.</p>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmGeneration({
  description,
  cost,
  buttonLabel,
  onConfirm,
  children,
}: {
  description: string;
  cost: number;
  buttonLabel: string;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm leading-6 text-slate-700">{description}</p>
      <CreditText cost={cost} />
      {children}
      <Button className="mt-4" onClick={onConfirm}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </Button>
    </div>
  );
}

function CreditText({ cost }: { cost: number }) {
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900">
      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
      Custo: {cost} crédito{cost === 1 ? "" : "s"}
    </p>
  );
}

function BalanceAfter({ label, value }: { label: string; value: number | null }) {
  if (typeof value !== "number") return null;
  return <p className="mt-5 text-xs font-semibold text-slate-500">{label}: {value} créditos</p>;
}

function AiError({
  message,
  fallback,
  onRetry,
}: {
  message: string;
  fallback: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-900">{message || fallback}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function InsufficientData() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h3 className="text-base font-bold text-amber-950">Ainda precisamos de mais respostas</h3>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Responda mais algumas questões para receber uma análise de desempenho mais precisa.
      </p>
      <a
        href="/dashboard/praticar?tab=banco"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
      >
        Continuar praticando
      </a>
    </div>
  );
}

function QuestionExplanationView({
  result,
  balanceAfter,
}: {
  result: QuestionExplanationResult;
  balanceAfter: number | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Badge tone="blue">{formatTopicPath(result.area, result.subject, result.topic)}</Badge>
      </div>
      <Section title="Entendendo o problema">
        <p>{result.problemSummary}</p>
      </Section>
      <Section title="Resolução passo a passo">
        <ol className="space-y-3">
          {result.steps.map((step, index) => (
            <li key={`${step.title}-${index}`} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">{index + 1}. {step.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.explanation}</p>
              {step.calculation ? (
                <p className="tnum mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                  {step.calculation}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-bold text-emerald-950">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Resposta correta
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-900">
          Alternativa {result.correctAnswer.option}
          {result.correctAnswer.value ? ` — ${result.correctAnswer.value}` : ""}
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">{result.correctAnswer.explanation}</p>
      </div>
      {result.studentAnswer.available ? (
        <Section title="Sua resposta">
          <p className="font-semibold text-slate-950">
            Você marcou: alternativa {result.studentAnswer.option}
            {result.studentAnswer.value ? ` — ${result.studentAnswer.value}` : ""}
          </p>
          {result.studentAnswer.explanation ? <p className="mt-2">{result.studentAnswer.explanation}</p> : null}
        </Section>
      ) : null}
      {result.alternativesAnalysis.length ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-950">
            Por que as outras alternativas não servem?
          </summary>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {result.alternativesAnalysis.map((item) => (
              <li key={item.option}>
                <span className="font-semibold">Alternativa {item.option}</span>
                {item.value ? ` — ${item.value}` : ""}: {item.explanation}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <Section title="Dica para questões parecidas">
        <p>{result.tip}</p>
      </Section>
      <BalanceAfter label="Saldo após esta explicação" value={balanceAfter} />
    </div>
  );
}

function PerformanceAnalysisView({
  result,
  balanceAfter,
}: {
  result: PerformanceAnalysisResult;
  balanceAfter: number | null;
}) {
  return (
    <div className="space-y-6">
      <Section title="Escopo da análise">
        <p>{result.analysisScope.periodLabel}</p>
      </Section>
      <Section title="Visão geral">
        <p>{result.overview}</p>
      </Section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Questões analisadas" value={result.metrics.answered} />
        <Metric label="Acertos" value={result.metrics.correct} />
        <Metric label="Erros" value={result.metrics.incorrect} />
        <Metric label="Taxa de acertos" value={`${result.metrics.accuracy}%`} />
        {result.metrics.bestArea ? <Metric label="Melhor desempenho" value={result.metrics.bestArea} /> : null}
        {result.metrics.priorityArea ? <Metric label="Maior dificuldade" value={result.metrics.priorityArea} /> : null}
      </div>
      <Section title="Desempenho por área">
        <div className="grid gap-3 sm:grid-cols-2">
          {result.areaPerformance.map((area) => (
            <div key={area.area} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">{area.area}</p>
              <p className="mt-1 text-sm text-slate-600">
                {area.correct} acertos em {area.answered} questões
              </p>
              <p className="tnum mt-2 text-lg font-bold text-blue-800">{area.accuracy}% de aproveitamento</p>
            </div>
          ))}
        </div>
      </Section>
      {result.errorPatterns.length ? (
        <Section title="Padrões de erro identificados">
          <div className="space-y-3">
            {result.errorPatterns.map((pattern) => (
              <div key={pattern.title} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">{pattern.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{pattern.evidence}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{pattern.explanation}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      <Section title="Conteúdos para priorizar">
        <div className="space-y-3">
          {result.priorities.map((priority) => (
            <div key={priority.topic} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">
                {priority.rank}. {formatTopicPath(priority.area, priority.subject, priority.topic)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Motivo: {priority.reason}</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Próxima ação: {priority.recommendedAction}
              </p>
              <Badge tone="blue" className="mt-3">Meta: {priority.questionGoal} questões</Badge>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Próximos passos">
        <div className="grid gap-3 sm:grid-cols-3">
          {result.nextSteps.map((step) => (
            <div key={step.label} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-950">{step.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.action}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Evolução recente">
        <p>{result.recentEvolution.message}</p>
      </Section>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <BalanceAfter label="Saldo após esta análise" value={balanceAfter} />
        <Button variant="outline" size="sm" onClick={() => importPriorities(result.priorities)}>
          <Clipboard className="h-4 w-4" aria-hidden="true" />
          Usar prioridades no Plano inteligente
        </Button>
      </div>
    </div>
  );
}

function SmartStudyPlanView({
  result,
  balanceAfter,
  applying,
  onApply,
  onGenerateAnother,
  onBack,
}: {
  result: SmartStudyPlanResult;
  balanceAfter: number | null;
  applying: boolean;
  onApply: () => void;
  onGenerateAnother: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="Resumo do plano">
        <p>{result.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Período" value={result.period.label} />
          <Metric label="Carga total" value={result.totals.totalHoursLabel} />
          <Metric label="Sessões" value={result.totals.totalSessions} />
          <Metric label="Questões sugeridas" value={result.totals.totalQuestions} />
        </div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.days.map((day) => (
          <div key={day.date} className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-bold capitalize text-slate-950">
              {day.dayLabel}, {formatDateLabel(day.date)}
            </h3>
            <div className="mt-3 space-y-3">
              {day.sessions.map((session) => (
                <div key={`${day.date}-${session.period}-${session.topic}`} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="slate">{session.period}</Badge>
                    <Badge tone="blue">{session.type}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatTopicPath(session.area, session.subject, session.topic)}
                  </p>
                  <p className="tnum mt-1 text-sm text-slate-600">
                    {formatMinutes(session.durationMinutes)}
                    {session.questionGoal ? ` · Meta: ${session.questionGoal} questões` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{session.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Section title="Metas da semana">
        <ul className="space-y-2">
          {result.weeklyGoals.map((goal) => (
            <li key={goal} className="flex gap-2 text-sm leading-6 text-slate-700">
              <Target className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              {goal}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Por que este plano foi recomendado?">
        <p>{result.recommendationReason}</p>
      </Section>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Button size="sm" onClick={onApply} disabled={applying}>
          {applying ? "Aplicando..." : "Aplicar este plano"}
        </Button>
        <Button variant="outline" size="sm" onClick={onGenerateAnother}>
          Gerar outro ajuste
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar ao plano atual
        </Button>
      </div>
      <BalanceAfter label="Saldo após este plano" value={balanceAfter} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ImportedPriorities({
  priorities,
  onRemove,
}: {
  priorities: ImportedPriority[];
  onRemove: (topic: string) => void;
}) {
  if (!priorities.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
      <p className="text-xs font-bold text-slate-600">Prioridades importadas</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {priorities.map((priority) => (
          <span key={priority.topic} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100">
            {formatTopicPath(priority.area, priority.subject, priority.topic)}
            <button type="button" onClick={() => onRemove(priority.topic)} aria-label={`Remover ${priority.topic}`}>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ExplanationSkeleton() {
  return <SkeletonLayout title="Preparando uma explicação personalizada..." rows={5} />;
}

function PerformanceSkeleton() {
  return <SkeletonLayout title="Analisando seus resultados recentes..." rows={8} grid />;
}

function PlanSkeleton() {
  return <SkeletonLayout title="Organizando sua semana de estudos..." rows={9} grid />;
}

function SkeletonLayout({ title, rows, grid }: { title: string; rows: number; grid?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className={cn("mt-4 gap-3", grid ? "grid sm:grid-cols-2 lg:grid-cols-3" : "space-y-3")}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function importPriorities(priorities: PerformanceAnalysisResult["priorities"]) {
  const payload = priorities.map((priority) => ({
    area: priority.area,
    subject: priority.subject,
    topic: priority.topic,
    reason: priority.reason,
    questionGoal: priority.questionGoal,
  }));
  window.localStorage.setItem(importedPriorityStorageKey, JSON.stringify(payload));
  toast.success("Prioridades importadas. Revise antes de otimizar o plano.");
  window.location.href = "/dashboard#plano-semana";
}

function loadImportedPriorities() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(importedPriorityStorageKey);
  if (!stored) return [];
  try {
    const priorities = JSON.parse(stored) as ImportedPriority[];
    return Array.isArray(priorities) ? priorities.slice(0, 5) : [];
  } catch {
    window.localStorage.removeItem(importedPriorityStorageKey);
    return [];
  }
}

function copyExplanation(result: QuestionExplanationResult) {
  const text = [
    "Explicação da questão",
    formatTopicPath(result.area, result.subject, result.topic),
    "",
    "Entendendo o problema",
    result.problemSummary,
    "",
    "Resolução passo a passo",
    ...result.steps.flatMap((step, index) => [
      `${index + 1}. ${step.title}`,
      step.explanation,
      step.calculation ? `Cálculo: ${step.calculation}` : "",
    ]),
    "",
    `Resposta correta: alternativa ${result.correctAnswer.option}${result.correctAnswer.value ? ` — ${result.correctAnswer.value}` : ""}`,
    result.correctAnswer.explanation,
    result.studentAnswer.available
      ? `Sua resposta: alternativa ${result.studentAnswer.option}${result.studentAnswer.value ? ` — ${result.studentAnswer.value}` : ""}`
      : "",
    result.studentAnswer.explanation ?? "",
    "",
    "Dica",
    result.tip,
  ].filter(Boolean).join("\n");
  navigator.clipboard.writeText(text);
  toast.success("Explicação copiada.");
}

function formatTopicPath(area: string, subject: string, topic: string) {
  const parts = [area];
  if (normalize(subject) !== normalize(area)) parts.push(subject);
  parts.push(topic);
  return parts.filter(Boolean).join(" — ");
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${date}T12:00:00-03:00`));
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
