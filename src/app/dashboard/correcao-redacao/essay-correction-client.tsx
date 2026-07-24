"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  History,
  Loader2,
  PenLine,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  submitEssayCorrectionAction,
  submitOnlineEssayCorrectionAction,
} from "@/lib/actions/credits";
import type { EssaySubmission, EssaySubmissionFile } from "@/lib/db/types";
import {
  ESSAY_CREDIT_COST,
  MAX_ONLINE_ESSAY_LENGTH,
  MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
  MAX_ESSAY_UPLOAD_FILES,
  MAX_ESSAY_UPLOAD_SIZE_BYTES,
  MIN_ONLINE_ESSAY_LENGTH,
  MIN_ONLINE_ESSAY_WORDS,
  acceptedEssayUploadTypes,
  countWords,
} from "@/lib/schemas/essay";
import { formatAppDateTime } from "@/lib/dates";
import {
  ESSAY_ACCEPTED_FILE_LABEL,
  ESSAY_CREDIT_COST_LABEL,
  ESSAY_UPLOAD_LIMIT_LABEL,
} from "@/lib/product-config";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import {
  getActiveWeeklyEssayTopic,
  weeklyEssayTopics,
} from "@/data/weekly-essay-topics";
import { WeeklyEssayTopicCard } from "./weekly-essay-topic-card";

type EssayWithFiles = EssaySubmission & {
  essay_submission_files?: EssaySubmissionFile[];
};

type SelectedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

type DeliveryMode = "upload" | "online";

const statusLabels: Record<EssaySubmission["status"], string> = {
  uploading: "Enviando",
  pending: "Aguardando correção",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
};

const statusTones: Record<EssaySubmission["status"], "blue" | "green" | "red" | "slate" | "amber"> = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
};

const activeWeeklyEssayTopic = getActiveWeeklyEssayTopic();

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function EssayCorrectionClient({
  creditBalance,
  submissions,
  weeklyTopicUnlocks,
}: {
  creditBalance: number;
  submissions: EssayWithFiles[];
  weeklyTopicUnlocks: string[];
}) {
  const [availableCreditBalance, setAvailableCreditBalance] = useState(creditBalance);
  const [theme, setTheme] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("upload");
  const [essayText, setEssayText] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();
  const filesRef = useRef(files);
  const themeInputRef = useRef<HTMLInputElement>(null);

  const hasCredits = availableCreditBalance >= ESSAY_CREDIT_COST;
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const essayWordCount = countWords(essayText);
  const canSubmit =
    hasCredits &&
    !pending &&
    (deliveryMode === "upload" ? files.length > 0 : essayText.trim().length > 0);
  const selectedHasPdf = files.some((item) => item.file.type === "application/pdf");

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const validationMessage = useMemo(() => {
    if (!hasCredits) return "Saldo insuficiente para enviar.";
    if (deliveryMode === "online") {
      const trimmed = essayText.trim();
      if (!trimmed) return "Digite sua redação ou escolha anexar arquivo.";
      if (trimmed.length < MIN_ONLINE_ESSAY_LENGTH) return "Digite ao menos 400 caracteres.";
      if (trimmed.length > MAX_ONLINE_ESSAY_LENGTH) return "A redação deve ter no máximo 12000 caracteres.";
      if (essayWordCount < MIN_ONLINE_ESSAY_WORDS) return "Digite ao menos 80 palavras.";
      return "";
    }
    if (!files.length) return "Selecione ao menos um arquivo.";
    if (files.length > MAX_ESSAY_UPLOAD_FILES) return "Envie no máximo 2 arquivos.";
    if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) return "O total deve ficar em até 20 MB.";
    if (selectedHasPdf && files.length > 1) return "PDF deve ser enviado sozinho.";
    const invalid = files.find((item) => !acceptedEssayUploadTypes.has(item.file.type));
    if (invalid) return `${invalid.file.name}: tipo não permitido.`;
    const oversized = files.find((item) => item.file.size > MAX_ESSAY_UPLOAD_SIZE_BYTES);
    if (oversized) return `${oversized.file.name}: limite de 10 MB por arquivo.`;
    return "";
  }, [deliveryMode, essayText, essayWordCount, files, hasCredits, selectedHasPdf, totalSize]);

  // O aviso só aparece depois que o aluno começou a preencher — um formulário
  // vazio não é um erro.
  const showValidation =
    !hasCredits ||
    (deliveryMode === "online" ? essayText.trim().length > 0 : files.length > 0);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const incoming = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    const nextFiles = [...files, ...incoming];
    if (nextFiles.some((item) => item.file.type === "application/pdf") && nextFiles.length > 1) {
      incoming.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      toast.error("PDF deve ser enviado como arquivo único.");
      return;
    }
    if (nextFiles.length > MAX_ESSAY_UPLOAD_FILES) {
      incoming.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      toast.error("Envie no máximo 2 arquivos por redação.");
      return;
    }
    setFiles(nextFiles);
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function submitEssay() {
    if (!canSubmit || validationMessage) {
      toast.error(validationMessage || "Revise os arquivos antes de enviar.");
      return;
    }

    const formData = new FormData();
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("theme", theme);
    formData.set("studentNote", studentNote);
    if (deliveryMode === "online") {
      formData.set("essayText", essayText);
    } else {
      files.forEach((item) => formData.append("files", item.file));
    }

    setProgress(15);
    startTransition(async () => {
      setProgress(55);
      const result =
        deliveryMode === "online"
          ? await submitOnlineEssayCorrectionAction(formData)
          : await submitEssayCorrectionAction(formData);

      if (!result.ok) {
        setProgress(0);
        toast.error(result.message);
        return;
      }

      setProgress(100);
      toast.success(result.message);
      setTheme("");
      setStudentNote("");
      setEssayText("");
      files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      setFiles([]);
      setIdempotencyKey(newIdempotencyKey());
    });
  }

  function useSuggestedTopic() {
    if (!activeWeeklyEssayTopic) return;

    const suggestedTheme = activeWeeklyEssayTopic.title;
    const currentTheme = theme.trim();
    if (currentTheme && currentTheme !== suggestedTheme) {
      const confirmed = window.confirm(
        "Você já digitou outro tema. Deseja substituir pelo tema sugerido da semana?",
      );
      if (!confirmed) return;
    }

    setTheme(suggestedTheme);
    window.requestAnimationFrame(() => themeInputRef.current?.focus());
    toast.success("Tema sugerido preenchido no campo opcional.");
  }

  return (
    <div className="space-y-6">
      {activeWeeklyEssayTopic ? (
        <Reveal delay={0}>
          <WeeklyEssayTopicCard
            key={activeWeeklyEssayTopic.id}
            topic={activeWeeklyEssayTopic}
            topicCount={weeklyEssayTopics.length}
            creditBalance={availableCreditBalance}
            initiallyUnlocked={weeklyTopicUnlocks.includes(activeWeeklyEssayTopic.id)}
            onUseTopic={useSuggestedTopic}
            onBalanceChange={setAvailableCreditBalance}
          />
        </Reveal>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <Reveal delay={0}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Envio da redação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Título ou tema opcional
                </span>
                <input
                  ref={themeInputRef}
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="Ex.: Desafios da educação pública"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Observação opcional
                </span>
                <textarea
                  value={studentNote}
                  onChange={(event) => setStudentNote(event.target.value)}
                  rows={3}
                  placeholder="Ex.: A folha tem duas páginas."
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Como deseja enviar?
                </span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <ModeButton
                    active={deliveryMode === "upload"}
                    icon={FileUp}
                    title="Anexar arquivo"
                    description="Fotos da folha ou PDF pronto."
                    onClick={() => setDeliveryMode("upload")}
                  />
                  <ModeButton
                    active={deliveryMode === "online"}
                    icon={FileText}
                    title="Digitar online"
                    description="Escreva ou cole o texto aqui."
                    onClick={() => setDeliveryMode("online")}
                  />
                </div>
              </div>

              {deliveryMode === "online" ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Texto da redação
                  </span>
                  <textarea
                    value={essayText}
                    onChange={(event) => setEssayText(event.target.value)}
                    rows={12}
                    placeholder="Digite sua redação completa aqui."
                    className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>{essayWordCount} palavras</span>
                    <span>
                      {essayText.trim().length} / {MAX_ONLINE_ESSAY_LENGTH} caracteres
                    </span>
                  </span>
                </label>
              ) : (
                <>
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-inset ring-slate-200">
                          <FileUp className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-950">
                            {ESSAY_ACCEPTED_FILE_LABEL}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {ESSAY_UPLOAD_LIMIT_LABEL}. PDF conta como arquivo único.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100">
                        Selecionar arquivos
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            addFiles(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {files.length ? (
                    <ul className="grid gap-3 md:grid-cols-2">
                      {files.map((item, index) => (
                        <li
                          key={item.id}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex h-40 items-center justify-center bg-slate-50">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={`Página ${index + 1}`}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <FileText className="h-12 w-12 text-slate-300" aria-hidden="true" />
                            )}
                          </div>
                          <div className="space-y-3 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Badge tone={index === 0 ? "blue" : "slate"}>
                                  Página {index + 1}
                                </Badge>
                                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                                  {item.file.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {formatBytes(item.file.size)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(item.id)}
                                aria-label="Remover arquivo"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => moveFile(index, -1)}
                                disabled={index === 0}
                                aria-label="Mover página para cima"
                              >
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => moveFile(index, 1)}
                                disabled={index === files.length - 1}
                                aria-label="Mover página para baixo"
                              >
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}

              {pending || progress > 0 ? (
                <Progress
                  value={progress}
                  label={progress >= 100 ? "Envio concluído" : "Enviando redação"}
                  tone={progress >= 100 ? "green" : "blue"}
                />
              ) : null}

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
                Evite inserir informações pessoais ou dados sensíveis desnecessários seus
                ou de terceiros. O texto e os arquivos enviados serão utilizados para
                processar e entregar a correção da redação, conforme a Política de
                Privacidade.
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  Ao confirmar, serão debitados{" "}
                  <span className="font-semibold text-slate-950">
                    {ESSAY_CREDIT_COST_LABEL}
                  </span>
                  . Saldo atual: <span className="font-semibold text-slate-950">{availableCreditBalance}</span>.
                </p>
                <Button type="button" onClick={submitEssay} disabled={!canSubmit || Boolean(validationMessage)}>
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  Enviar
                </Button>
              </div>
              {validationMessage && showValidation ? (
                <p className="text-sm font-medium text-rose-600">{validationMessage}</p>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-3">
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Envio atual
                </p>
                <p className="tnum mt-2 text-2xl font-bold text-slate-950">
                  {deliveryMode === "upload" ? `${files.length} / ${MAX_ESSAY_UPLOAD_FILES}` : essayWordCount}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {deliveryMode === "upload"
                    ? `Total: ${formatBytes(totalSize)}`
                    : `palavras, mínimo ${MIN_ONLINE_ESSAY_WORDS}`}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Como funciona
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A redação entra em análise pela equipe de correção. O envio pode ser
                  por arquivo ou texto digitado, e a devolutiva fica disponível na
                  plataforma quando for concluída.
                </p>
                <ol className="mt-3 space-y-2.5">
                  {[
                    "Envie o texto digitado ou as fotos da folha.",
                    "A redação entra em análise pela equipe de correção.",
                    "A correção completa aparece no histórico abaixo.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-2.5 text-sm leading-6 text-slate-600">
                      <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-blue-700 ring-1 ring-inset ring-slate-200">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      <Reveal delay={120}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
              Histórico de redações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {submissions.length ? (
              <ul className="divide-y divide-slate-100">
                {submissions.map((submission) => (
                  <li key={submission.id} className="flex items-center gap-3 py-3">
                    <Clock3 className="h-4.5 w-4.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {submission.theme}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatSubmissionDate(submission.submitted_at)} ·{" "}
                        {submission.delivery_type === "online"
                          ? `${submission.word_count} palavras`
                          : `${submission.file_count || submission.essay_submission_files?.length || 0} página(s)`}
                        {" · "}
                        {submission.credit_cost} créditos
                      </p>
                    </div>
                    <Badge tone={statusTones[submission.status]}>
                      {statusLabels[submission.status]}
                    </Badge>
                    <Link
                      href={`/dashboard/correcao-redacao/${submission.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={PenLine}
                title="Nenhuma redação enviada"
                description="Seus envios aparecem aqui com status, páginas, texto digitado e créditos utilizados."
              />
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-20 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
        active
          ? "border-blue-300 bg-blue-50 ring-1 ring-inset ring-blue-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
          active ? "bg-white text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-500 ring-slate-200"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
      </span>
    </button>
  );
}

function formatSubmissionDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
