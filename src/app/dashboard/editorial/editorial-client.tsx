"use client";

import { ExternalLink, Save, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import {
  updateEditorialQuestionAction,
  type EditorialQuestionInput,
} from "@/lib/actions/editorial";
import type { QuestionRecord } from "@/lib/db/types";

const reviewStatuses = ["pending", "approved", "rejected", "needs_review"];
const difficulties = ["Baixa", "Média", "Alta"];

export function EditorialClient({ questions }: { questions: QuestionRecord[] }) {
  const [status, setStatus] = useState("todos");
  const [area, setArea] = useState("todas");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(questions[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, EditorialQuestionInput>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, toDraft(question)])),
  );
  const [pending, startTransition] = useTransition();

  const areas = useMemo(
    () => ["todas", ...Array.from(new Set(questions.map((question) => question.subjects.area)))],
    [questions],
  );

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      const draft = drafts[question.id] ?? toDraft(question);
      const matchesStatus = status === "todos" || draft.review_status === status;
      const matchesArea = area === "todas" || draft.area === area;
      const matchesSearch =
        !search ||
        draft.statement.toLowerCase().includes(search.toLowerCase()) ||
        draft.topic.toLowerCase().includes(search.toLowerCase()) ||
        String(question.question_number ?? "").includes(search);

      return matchesStatus && matchesArea && matchesSearch;
    });
  }, [area, drafts, questions, search, status]);

  const selectedQuestion =
    questions.find((question) => question.id === selectedId) ?? filtered[0] ?? questions[0];
  const draft = selectedQuestion ? drafts[selectedQuestion.id] : null;

  function updateDraft(update: Partial<EditorialQuestionInput>) {
    if (!draft) return;
    setDrafts((current) => ({
      ...current,
      [draft.id]: { ...draft, ...update },
    }));
  }

  function updateOption(optionKey: string, optionText: string) {
    if (!draft) return;
    updateDraft({
      options: draft.options.map((option) =>
        option.option_key === optionKey ? { ...option, option_text: optionText } : option,
      ),
    });
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const result = await updateEditorialQuestionAction(draft);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  if (!questions.length) {
    return (
      <EmptyState
        icon={Search}
        title="Nenhuma questão carregada"
        description="Importe questões revisadas ou ajuste os filtros administrativos."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Reveal delay={0}>
      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Busca</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                placeholder="Enunciado, tópico ou número"
              />
            </label>
            <Select label="Status" value={status} options={["todos", ...reviewStatuses]} onChange={setStatus} />
            <Select label="Área" value={area} options={areas} onChange={setArea} />
          </CardContent>
        </Card>

        <div className="max-h-[680px] space-y-2 overflow-auto pr-1">
          {filtered.map((question) => {
            const itemDraft = drafts[question.id] ?? toDraft(question);
            const active = selectedQuestion?.id === question.id;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedId(question.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`tnum text-sm font-bold ${active ? "text-blue-900" : "text-slate-950"}`}>
                    {question.year} Q{question.question_number ?? "?"}
                  </p>
                  <Badge tone={itemDraft.review_status === "approved" ? "green" : "slate"}>
                    {itemDraft.review_status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                  {itemDraft.topic}
                </p>
              </button>
            );
          })}
        </div>
      </aside>
      </Reveal>

      {draft && selectedQuestion ? (
        <Reveal delay={80}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>
                  {selectedQuestion.exam_name} {selectedQuestion.year} Q
                  {selectedQuestion.question_number ?? "?"}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedQuestion.source}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">{draft.area}</Badge>
                <Badge tone={draft.review_status === "approved" ? "green" : "amber"}>
                  {draft.review_status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Select label="Status" value={draft.review_status} options={reviewStatuses} onChange={(value) => updateDraft({ review_status: value as EditorialQuestionInput["review_status"] })} />
              <Select label="Dificuldade" value={draft.difficulty} options={difficulties} onChange={(value) => updateDraft({ difficulty: value as EditorialQuestionInput["difficulty"] })} />
              <Select label="Gabarito" value={draft.correct_option} options={["A", "B", "C", "D", "E"]} onChange={(value) => updateDraft({ correct_option: value as EditorialQuestionInput["correct_option"] })} />
              <Field label="Versão" value={draft.classification_version} onChange={(value) => updateDraft({ classification_version: value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Área" value={draft.area} onChange={(value) => updateDraft({ area: value })} />
              <Field label="Disciplina" value={draft.subject} onChange={(value) => updateDraft({ subject: value })} />
              <Field label="Tópico" value={draft.topic} onChange={(value) => updateDraft({ topic: value })} />
              <Field label="Subtópico" value={draft.subtopic ?? ""} onChange={(value) => updateDraft({ subtopic: value })} />
            </div>

            <Textarea label="Enunciado" value={draft.statement} onChange={(value) => updateDraft({ statement: value })} rows={8} />
            <div className="grid gap-3">
              {draft.options.map((option) => (
                <Textarea
                  key={option.option_key}
                  label={`Alternativa ${option.option_key}`}
                  value={option.option_text}
                  onChange={(value) => updateOption(option.option_key, value)}
                  rows={2}
                />
              ))}
            </div>
            <Textarea label="Resolução" value={draft.explanation} onChange={(value) => updateDraft({ explanation: value })} rows={5} />
            <Textarea label="Notas editoriais" value={draft.editorial_notes ?? ""} onChange={(value) => updateDraft({ editorial_notes: value })} rows={3} />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Checkbox label="Revisada" checked={draft.reviewed} onChange={(value) => updateDraft({ reviewed: value })} />
              <Checkbox label="Fonte verificada" checked={draft.source_verified} onChange={(value) => updateDraft({ source_verified: value })} />
              <Checkbox label="Gabarito verificado" checked={draft.answer_verified} onChange={(value) => updateDraft({ answer_verified: value })} />
              <Checkbox label="Mídia verificada" checked={draft.media_verified} onChange={(value) => updateDraft({ media_verified: value })} />
              <Checkbox label="Exige mídia" checked={draft.media_required} onChange={(value) => updateDraft({ media_required: value })} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">Mídia e fonte original</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {selectedQuestion.question_media?.length ? (
                  selectedQuestion.question_media.map((media) => (
                    <a
                      key={media.id}
                      href={media.url}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {media.media_type} {media.source_page ? `página ${media.source_page}` : ""}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Nenhuma mídia associada.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={pending}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Salvar alterações
              </Button>
            </div>
          </CardContent>
        </Card>
        </Reveal>
      ) : null}
    </div>
  );
}

function toDraft(question: QuestionRecord): EditorialQuestionInput {
  return {
    id: question.id,
    statement: question.statement,
    explanation: question.explanation,
    difficulty: question.difficulty as EditorialQuestionInput["difficulty"],
    review_status: question.review_status as EditorialQuestionInput["review_status"],
    reviewed: question.reviewed,
    source_verified: question.source_verified,
    answer_verified: question.answer_verified,
    media_verified: question.media_verified,
    media_required: question.media_required,
    topic: question.topics.name,
    subject: question.subjects.name,
    area: question.subjects.area,
    discipline: question.discipline ?? question.subjects.name,
    subtopic: question.subtopic ?? "",
    correct_option: question.correct_option as EditorialQuestionInput["correct_option"],
    editorial_notes: question.editorial_notes ?? "",
    classification_version: question.classification_version,
    options: question.question_options
      .slice()
      .sort((a, b) => a.option_key.localeCompare(b.option_key))
      .map((option) => ({
        id: option.id,
        option_key: option.option_key as "A" | "B" | "C" | "D" | "E",
        option_text: option.option_text,
      })),
  };
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
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
      {label}
    </label>
  );
}
