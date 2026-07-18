"use client";

import { Filter, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";

const selectClasses =
  "mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

export function RecurrenceQuestionsClient({
  questions,
  access,
}: {
  questions: QuestionRecord[];
  access: AccessContext;
}) {
  const [area, setArea] = useState("Todas");
  const [discipline, setDiscipline] = useState("Todas");
  const [topic, setTopic] = useState("Todos");
  const [subtopic, setSubtopic] = useState("Todos");
  const [year, setYear] = useState("Todos");
  const [priority, setPriority] = useState("Todas");
  const [competence, setCompetence] = useState("Todas");
  const [skill, setSkill] = useState("Todas");
  const [difficulty, setDifficulty] = useState("Todas");
  const [officialOnly, setOfficialOnly] = useState("Todas");
  const [recurrence, setRecurrence] = useState("Todas");
  const [chargePattern, setChargePattern] = useState("Todos");
  const [reviewDate, setReviewDate] = useState("Todas");

  const options = useMemo(
    () => ({
      areas: unique(["Todas", ...questions.map((q) => q.subjects.area)]),
      disciplines: unique(["Todas", ...questions.map((q) => q.subjects.name)]),
      topics: unique(["Todos", ...questions.map((q) => q.topics.name)]),
      subtopics: unique(["Todos", ...questions.map((q) => q.subtopic || "Sem subtópico")]),
      years: unique(["Todos", ...questions.map((q) => String(q.year))]),
      priorities: unique(["Todas", ...questions.map((q) => q.recurrence_category)]),
      competences: unique(["Todas", ...questions.map((q) => q.competence || "Sem competência")]),
      skills: unique(["Todas", ...questions.map((q) => q.skill || "Sem habilidade")]),
      recurrences: unique(["Todas", ...questions.map((q) => q.content_recurrence || "Sem dado")]),
      chargePatterns: unique(["Todos", ...questions.map((q) => q.charge_pattern || "Sem padrão")]),
      reviewDates: unique([
        "Todas",
        ...questions.map((q) =>
          q.last_editorial_review_at
            ? new Date(q.last_editorial_review_at).toLocaleDateString("pt-BR")
            : "Sem revisão",
        ),
      ]),
    }),
    [questions],
  );

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      const questionReviewDate = question.last_editorial_review_at
        ? new Date(question.last_editorial_review_at).toLocaleDateString("pt-BR")
        : "Sem revisão";

      return (
        (area === "Todas" || question.subjects.area === area) &&
        (discipline === "Todas" || question.subjects.name === discipline) &&
        (topic === "Todos" || question.topics.name === topic) &&
        (subtopic === "Todos" || (question.subtopic || "Sem subtópico") === subtopic) &&
        (year === "Todos" || String(question.year) === year) &&
        (priority === "Todas" || question.recurrence_category === priority) &&
        (competence === "Todas" || (question.competence || "Sem competência") === competence) &&
        (skill === "Todas" || (question.skill || "Sem habilidade") === skill) &&
        (difficulty === "Todas" || question.difficulty === difficulty) &&
        (officialOnly === "Todas" ||
          (officialOnly === "Oficiais" && question.is_official) ||
          (officialOnly === "Não oficiais" && !question.is_official)) &&
        (recurrence === "Todas" || (question.content_recurrence || "Sem dado") === recurrence) &&
        (chargePattern === "Todos" || (question.charge_pattern || "Sem padrão") === chargePattern) &&
        (reviewDate === "Todas" || questionReviewDate === reviewDate)
      );
    });
  }, [
    area,
    chargePattern,
    competence,
    difficulty,
    discipline,
    officialOnly,
    priority,
    questions,
    recurrence,
    reviewDate,
    skill,
    subtopic,
    topic,
    year,
  ]);

  const visible = access.hasPlatformAccess ? filtered : [];
  const reviewedHighPriority = visible.filter(
    (question) =>
      question.reviewed &&
      question.review_status === "approved" &&
      question.source_verified &&
      question.answer_verified &&
      question.priority_reason,
  );

  function clearFilters() {
    setArea("Todas");
    setDiscipline("Todas");
    setTopic("Todos");
    setSubtopic("Todos");
    setYear("Todos");
    setPriority("Todas");
    setCompetence("Todas");
    setSkill("Todas");
    setDifficulty("Todas");
    setOfficialOnly("Todas");
    setRecurrence("Todas");
    setChargePattern("Todos");
    setReviewDate("Todas");
  }

  return (
    <div>
      <div className="mb-5 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Treino e recorrência
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Questões com maior potencial de recorrência
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
          A seleção usa critérios objetivos e reproduzíveis. Ela não afirma que uma
          questão específica vai se repetir no ENEM.
        </p>
      </div>

      <Notice tone="warning" className="mb-6">
        As indicações de recorrência são estimativas baseadas em histórico e padrões
        de cobrança. Não representam previsão exata do conteúdo da prova.
      </Notice>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Filtros
            <span className="tnum text-xs font-semibold text-slate-500">
              {visible.length} de {questions.length} questões
            </span>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Limpar filtros
          </button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select label="Área" value={area} options={options.areas} onChange={setArea} />
          <Select label="Disciplina" value={discipline} options={options.disciplines} onChange={setDiscipline} />
          <Select label="Assunto" value={topic} options={options.topics} onChange={setTopic} />
          <Select label="Subtópico" value={subtopic} options={options.subtopics} onChange={setSubtopic} />
          <Select label="Ano" value={year} options={options.years} onChange={setYear} />
          <Select label="Prioridade" value={priority} options={options.priorities} onChange={setPriority} />
          <Select label="Competência" value={competence} options={options.competences} onChange={setCompetence} />
          <Select label="Habilidade" value={skill} options={options.skills} onChange={setSkill} />
          <Select label="Dificuldade" value={difficulty} options={["Todas", "Baixa", "Média", "Alta"]} onChange={setDifficulty} />
          <Select label="Oficial" value={officialOnly} options={["Todas", "Oficiais", "Não oficiais"]} onChange={setOfficialOnly} />
          <Select label="Recorrência" value={recurrence} options={options.recurrences} onChange={setRecurrence} />
          <Select label="Padrão" value={chargePattern} options={options.chargePatterns} onChange={setChargePattern} />
          <Select label="Revisão editorial" value={reviewDate} options={options.reviewDates} onChange={setReviewDate} />
        </div>
      </div>

      {!visible.length ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão pronta para esta seção"
          description="Questões oficiais antigas só aparecem como alta prioridade depois de fonte, gabarito e classificação editorial serem verificados. Você também pode limpar os filtros."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((question) => {
            const isReviewedHigh = reviewedHighPriority.some((item) => item.id === question.id);
            return (
              <article
                key={question.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      {question.topics.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {question.subjects.area} • {question.subjects.name} • {question.year}
                    </p>
                  </div>
                  <Badge tone={question.is_demo ? "amber" : isReviewedHigh ? "green" : "slate"}>
                    {question.is_demo ? "Questão de exemplo" : question.recurrence_category}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="slate">{question.difficulty}</Badge>
                  {question.is_official ? <Badge tone="green">Oficial</Badge> : null}
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-700">
                  {question.statement}
                </p>
                <div className="mt-4 flex gap-2.5 border-t border-slate-100 pt-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                  <p className="text-xs leading-5 text-slate-600">
                    {question.priority_reason ||
                      "Esta é uma questão de exemplo, criada para treino. Ela ainda não passou pela priorização editorial das questões oficiais."}
                  </p>
                </div>
                <dl className="mt-4 grid gap-x-4 gap-y-2.5 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <Detail label="Fonte" value={question.source} />
                  <Detail label="Competência" value={question.competence || "Não informada"} />
                  <Detail label="Habilidade" value={question.skill || "Não informada"} />
                  <Detail label="Revisão" value={question.review_status} />
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClasses}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="truncate text-right text-xs font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
