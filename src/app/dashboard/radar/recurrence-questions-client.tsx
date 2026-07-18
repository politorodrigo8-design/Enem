"use client";

import { Filter, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import type { AccessContext } from "@/lib/access";
import type { QuestionRecord } from "@/lib/db/types";

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

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm font-semibold text-blue-700">Treino e recorrência</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Questões com maior potencial de recorrência
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          A seleção usa critérios objetivos e reproduzíveis. Ela não afirma que uma
          questão específica vai se repetir no ENEM.
        </p>
      </div>

      <Notice tone="warning" className="mb-6">
        As indicações de recorrência são estimativas baseadas em histórico e padrões
        de cobrança. Não representam previsão exata do conteúdo da prova.
      </Notice>

      <Card className="mb-6">
        <CardContent>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Filter className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Filtros editoriais
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        </CardContent>
      </Card>

      {!visible.length ? (
        <EmptyState
          icon={Search}
          title="Nenhuma questão pronta para esta seção"
          description="Questões oficiais antigas só aparecerão como alta prioridade depois de fonte, gabarito e classificação editorial serem verificados."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((question) => {
            const isReviewedHigh = reviewedHighPriority.some((item) => item.id === question.id);
            return (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle>{question.topics.name}</CardTitle>
                    <Badge tone={question.is_demo ? "amber" : isReviewedHigh ? "green" : "slate"}>
                      {question.is_demo ? "Dado demonstrativo" : question.recurrence_category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{question.subjects.area}</Badge>
                    <Badge tone="violet">{question.subjects.name}</Badge>
                    <Badge tone="slate">{question.difficulty}</Badge>
                    {question.is_official ? <Badge tone="green">Oficial</Badge> : null}
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-700">
                    {question.statement}
                  </p>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
                      <p className="text-sm leading-6 text-slate-700">
                        {question.priority_reason ||
                          "Esta questão é demonstrativa/autoral. Ela aparece aqui apenas para validar o fluxo de filtros e treino, sem prioridade editorial oficial."}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Detail label="Fonte" value={question.source} />
                    <Detail label="Competência" value={question.competence || "Não informada"} />
                    <Detail label="Habilidade" value={question.skill || "Não informada"} />
                    <Detail label="Revisão" value={question.review_status} />
                  </dl>
                </CardContent>
              </Card>
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
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
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
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
