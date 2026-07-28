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
  Wallet,
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
  ESSAY_COMPETENCE_KEYS,
  ESSAY_COMPETENCE_LABELS,
  ESSAY_COMPETENCE_SUMMARIES,
  ESSAY_CREDIT_COST,
  ESSAY_TURNAROUND_LABEL,
  MAX_ONLINE_ESSAY_LENGTH,
  MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
  MAX_ESSAY_UPLOAD_FILES,
  MAX_ESSAY_UPLOAD_SIZE_BYTES,
  MIN_ONLINE_ESSAY_LENGTH,
  MIN_ONLINE_ESSAY_WORDS,
  acceptedEssayUploadTypes,
  countWords,
  essayResponseDeadline,
  formatMegabytes,
  readEssayScoreRecord,
  type EssayCompetenceKey,
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
import { Notice } from "@/components/ui/notice";
import { Reveal } from "@/components/ui/reveal";
import { getActiveWeeklyEssayTopic } from "@/data/weekly-essay-topics";
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

// Reduzir a foto no navegador é o que mantém o envio dentro do limite de uma
// requisição: 1600px de lado maior continua legível para correção manual.
const MAX_IMAGE_EDGE_PX = 1600;
const IMAGE_JPEG_QUALITY = 0.8;

const photoGuidance = [
  "Folha inteira no enquadramento, sem cortar linhas nas bordas.",
  "Luz uniforme, sem sombra da mão ou do celular sobre o texto.",
  "Letra legível ao dar zoom na foto antes de enviar.",
  "Uma foto por página, na ordem em que você escreveu.",
];

const weeklyTopicSuggestion = getActiveWeeklyEssayTopic();

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
  // O saldo do servidor é a fonte da verdade; o desconto otimista do card de
  // tema semanal vale só enquanto o servidor não revalida. Guardar o saldo que
  // originou o desconto faz o valor do servidor voltar a valer sozinho quando
  // ele muda — sem isto o card mostrava saldo velho depois de um envio e
  // liberava um segundo envio sem crédito.
  const [balanceOverride, setBalanceOverride] = useState<{
    base: number;
    value: number;
  } | null>(null);
  const availableCreditBalance =
    balanceOverride && balanceOverride.base === creditBalance
      ? balanceOverride.value
      : creditBalance;

  function setAvailableCreditBalance(value: number) {
    setBalanceOverride({ base: creditBalance, value });
  }

  const [theme, setTheme] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("upload");
  const [essayText, setEssayText] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [preparingFiles, setPreparingFiles] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const filesRef = useRef(files);
  const themeInputRef = useRef<HTMLInputElement>(null);

  const hasCredits = availableCreditBalance >= ESSAY_CREDIT_COST;
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const essayWordCount = countWords(essayText);
  const selectedHasPdf = files.some((item) => item.file.type === "application/pdf");
  const progress = useMemo(() => buildEssayProgress(submissions), [submissions]);
  const readyCorrection = useMemo(() => findRecentCompleted(submissions), [submissions]);
  const [readyCorrectionVisible, setReadyCorrectionVisible] = useState(false);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const visibilityTimeoutId = window.setTimeout(() => {
      setReadyCorrectionVisible(
        Boolean(readyCorrection && !hasDismissedReadyCorrection(readyCorrection.id)),
      );
    }, 0);

    if (!readyCorrection) {
      return () => window.clearTimeout(visibilityTimeoutId);
    }

    if (hasDismissedReadyCorrection(readyCorrection.id)) {
      return () => window.clearTimeout(visibilityTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      rememberDismissedReadyCorrection(readyCorrection.id);
      setReadyCorrectionVisible(false);
    }, READY_CORRECTION_NOTICE_DURATION_MS);

    return () => {
      window.clearTimeout(visibilityTimeoutId);
      window.clearTimeout(timeoutId);
    };
  }, [readyCorrection]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const validationMessage = useMemo(() => {
    if (deliveryMode === "online") {
      const trimmed = essayText.trim();
      if (!trimmed) return "Digite sua redação ou escolha anexar arquivo.";
      if (trimmed.length < MIN_ONLINE_ESSAY_LENGTH) return "Digite ao menos 400 caracteres.";
      if (trimmed.length > MAX_ONLINE_ESSAY_LENGTH) return "A redação deve ter no máximo 12000 caracteres.";
      if (essayWordCount < MIN_ONLINE_ESSAY_WORDS) return "Digite ao menos 80 palavras.";
      return "";
    }
    if (!files.length) return "Selecione ao menos um arquivo.";
    if (files.length > MAX_ESSAY_UPLOAD_FILES) return `Envie no máximo ${MAX_ESSAY_UPLOAD_FILES} arquivos.`;
    if (selectedHasPdf && files.length > 1) return "PDF deve ser enviado sozinho.";
    const invalid = files.find((item) => !acceptedEssayUploadTypes.has(item.file.type));
    if (invalid) return `${invalid.file.name}: use ${ESSAY_ACCEPTED_FILE_LABEL}.`;
    const oversized = files.find((item) => item.file.size > MAX_ESSAY_UPLOAD_SIZE_BYTES);
    if (oversized) {
      return `${oversized.file.name} tem ${formatBytes(oversized.file.size)}. O limite é ${formatMegabytes(
        MAX_ESSAY_UPLOAD_SIZE_BYTES,
      )} por arquivo — fotografe em resolução menor ou envie como PDF.`;
    }
    if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) {
      return `As páginas somam ${formatBytes(totalSize)}. O limite é ${formatMegabytes(
        MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
      )} no total — envie uma página por vez ou fotografe em resolução menor.`;
    }
    return "";
  }, [deliveryMode, essayText, essayWordCount, files, selectedHasPdf, totalSize]);

  const canSubmit =
    hasCredits &&
    !pending &&
    !preparingFiles &&
    !validationMessage &&
    (deliveryMode === "upload" ? files.length > 0 : essayText.trim().length > 0);

  // O aviso só aparece depois que o aluno começou a preencher — um formulário
  // vazio não é um erro.
  const showValidation =
    deliveryMode === "online" ? essayText.trim().length > 0 : files.length > 0;

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const incoming = Array.from(fileList);
    const nextCount = files.length + incoming.length;
    const willHavePdf =
      selectedHasPdf || incoming.some((file) => file.type === "application/pdf");

    if (willHavePdf && nextCount > 1) {
      toast.error("PDF deve ser enviado como arquivo único.");
      return;
    }
    if (nextCount > MAX_ESSAY_UPLOAD_FILES) {
      toast.error(`Envie no máximo ${MAX_ESSAY_UPLOAD_FILES} arquivos por redação.`);
      return;
    }
    const unsupported = incoming.find((file) => !acceptedEssayUploadTypes.has(file.type));
    if (unsupported) {
      toast.error(`${unsupported.name}: envie ${ESSAY_ACCEPTED_FILE_LABEL}.`);
      return;
    }

    setPreparingFiles(true);
    try {
      const prepared = await Promise.all(incoming.map(shrinkImageForUpload));
      setFiles((current) => [
        ...current,
        ...prepared.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        })),
      ]);
      setConfirming(false);
    } finally {
      setPreparingFiles(false);
    }
  }

  function removeFile(id: string) {
    setConfirming(false);
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

  function requestConfirmation() {
    if (!hasCredits) {
      toast.error(
        `Você tem ${availableCreditBalance} créditos e o envio consome ${ESSAY_CREDIT_COST}. Complete o saldo na página de créditos.`,
      );
      return;
    }
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    if (!canSubmit) return;
    setConfirming(true);
  }

  function submitEssay() {
    if (!canSubmit) return;

    const formData = new FormData();
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("theme", theme);
    formData.set("studentNote", studentNote);
    if (deliveryMode === "online") {
      formData.set("essayText", essayText);
    } else {
      files.forEach((item) => formData.append("files", item.file));
    }

    startTransition(async () => {
      try {
        const result =
          deliveryMode === "online"
            ? await submitOnlineEssayCorrectionAction(formData)
            : await submitEssayCorrectionAction(formData);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setConfirming(false);
        setTheme("");
        setStudentNote("");
        setEssayText("");
        files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
        setFiles([]);
        setIdempotencyKey(newIdempotencyKey());
      } catch {
        // Falha de transporte (conexão caiu, arquivo recusado no caminho): o
        // texto e as fotos continuam na tela e a chave de envio é a mesma, então
        // repetir não gera cobrança dobrada.
        toast.error(
          deliveryMode === "online"
            ? "O envio não foi concluído. Seu texto continua aqui: verifique a conexão e confirme de novo."
            : "O envio não foi concluído. Suas fotos continuam aqui: verifique a conexão e confirme de novo. Se repetir, envie uma página por vez ou em PDF.",
        );
      }
    });
  }

  function useSuggestedTopic() {
    if (!weeklyTopicSuggestion) return;

    const suggestedTheme = weeklyTopicSuggestion.title;
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
      {readyCorrection && readyCorrectionVisible ? (
        <Notice tone="success" icon={CheckCircle2}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              A correção de <span className="font-semibold">{readyCorrection.theme}</span>{" "}
              está pronta.
            </span>
            <Link
              href={`/dashboard/correcao-redacao/${readyCorrection.id}`}
              onClick={() => rememberDismissedReadyCorrection(readyCorrection.id)}
              className={buttonClasses({ variant: "outline", size: "sm", className: "shrink-0" })}
            >
              Ver correção
            </Link>
          </div>
        </Notice>
      ) : null}

      {weeklyTopicSuggestion ? (
        <Reveal delay={0}>
          <WeeklyEssayTopicCard
            key={weeklyTopicSuggestion.id}
            topic={weeklyTopicSuggestion}
            creditBalance={availableCreditBalance}
            initiallyUnlocked={weeklyTopicUnlocks.includes(weeklyTopicSuggestion.id)}
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
                    onClick={() => {
                      setDeliveryMode("upload");
                      setConfirming(false);
                    }}
                  />
                  <ModeButton
                    active={deliveryMode === "online"}
                    icon={FileText}
                    title="Digitar online"
                    description="Escreva ou cole o texto aqui."
                    onClick={() => {
                      setDeliveryMode("online");
                      setConfirming(false);
                    }}
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
                    onChange={(event) => {
                      setEssayText(event.target.value);
                      setConfirming(false);
                    }}
                    rows={12}
                    placeholder="Digite sua redação completa aqui."
                    // O teto em dvh evita que as 12 linhas ocupem a tela inteira
                    // em telas baixas (paisagem no celular) e escondam o contador.
                    className="mt-2 max-h-[70dvh] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                            As fotos são reduzidas aqui no navegador antes de subir.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100 sm:h-10">
                        Selecionar arquivos
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            void addFiles(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    <ul className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                      {photoGuidance.map((tip) => (
                        <li key={tip} className="flex gap-2 text-xs leading-5 text-slate-600">
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700"
                            aria-hidden="true"
                          />
                          {tip}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Foto ilegível pode ser recusada na correção, e o crédito só
                      volta se você pedir pelo suporte — confira o zoom antes de enviar.
                    </p>
                  </div>

                  {preparingFiles ? (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700"
                      role="status"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-blue-700" aria-hidden="true" />
                      Preparando as fotos para o envio...
                    </div>
                  ) : null}

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

              {pending ? (
                <div
                  className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-950"
                  role="status"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-blue-700" aria-hidden="true" />
                  Enviando a redação — não feche esta página.
                </div>
              ) : null}

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
                Evite inserir informações pessoais ou dados sensíveis desnecessários seus
                ou de terceiros. O texto e os arquivos enviados serão utilizados para
                processar e entregar a correção da redação, conforme a Política de
                Privacidade.
              </div>

              {!hasCredits ? (
                <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Você tem {availableCreditBalance} créditos e cada envio consome{" "}
                    {ESSAY_CREDIT_COST}.
                  </span>
                  <Link
                    href="/dashboard/creditos"
                    className={buttonClasses({ size: "sm", className: "shrink-0" })}
                  >
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    Ver pacotes de crédito
                  </Link>
                </div>
              ) : confirming ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <p className="font-semibold">Confirmar o envio para correção?</p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      {deliveryMode === "upload"
                        ? `${files.length} página(s) anexada(s), na ordem mostrada acima.`
                        : `${essayWordCount} palavras digitadas.`}
                    </li>
                    <li className="tnum">
                      Débito de {ESSAY_CREDIT_COST_LABEL}: saldo {availableCreditBalance} →{" "}
                      {availableCreditBalance - ESSAY_CREDIT_COST}.
                    </li>
                    <li>Devolutiva completa em {ESSAY_TURNAROUND_LABEL}.</li>
                  </ul>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={submitEssay} disabled={pending}>
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                      Confirmar envio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirming(false)}
                      disabled={pending}
                    >
                      Voltar e revisar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-600">
                    O envio debita{" "}
                    <span className="font-semibold text-slate-950">
                      {ESSAY_CREDIT_COST_LABEL}
                    </span>{" "}
                    do seu saldo de{" "}
                    <span className="font-semibold text-slate-950">{availableCreditBalance}</span>{" "}
                    e a correção volta em {ESSAY_TURNAROUND_LABEL}.
                  </p>
                  <Button
                    type="button"
                    onClick={requestConfirmation}
                    disabled={!canSubmit}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Revisar e enviar
                  </Button>
                </div>
              )}

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
                    ? `Total: ${formatBytes(totalSize)} de ${formatMegabytes(
                        MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
                      )}`
                    : `palavras, mínimo ${MIN_ONLINE_ESSAY_WORDS}`}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Como funciona
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A correção é feita por pessoas, competência por competência, e a
                  devolutiva completa fica pronta em {ESSAY_TURNAROUND_LABEL} a partir do
                  envio. Você acompanha o status nesta página.
                </p>
                <ol className="mt-3 space-y-2.5">
                  {[
                    "Envie o texto digitado ou as fotos da folha.",
                    `A redação entra na fila de correção (${ESSAY_TURNAROUND_LABEL}).`,
                    "A nota das 5 competências e os comentários aparecem no histórico.",
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
              <>
                {progress ? (
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <ProgressTile
                      label="Última nota"
                      value={`${progress.lastScore}`}
                      hint="de 1000 pontos"
                    />
                    <ProgressTile
                      label="Variação"
                      value={progress.delta === null ? "—" : formatDelta(progress.delta)}
                      hint={
                        progress.delta === null
                          ? "aparece a partir da segunda correção"
                          : "frente à redação anterior"
                      }
                    />
                    {progress.weakest ? (
                      <ProgressTile
                        label="Competência a treinar"
                        value={ESSAY_COMPETENCE_LABELS[progress.weakest.key]}
                        hint={`${ESSAY_COMPETENCE_SUMMARIES[progress.weakest.key]} · média ${
                          progress.weakest.average
                        }/200`}
                      />
                    ) : null}
                  </div>
                ) : null}

                <ul className="divide-y divide-slate-100">
                  {submissions.map((submission) => {
                    const score = readEssayScoreRecord(submission.scores).total;
                    const waiting =
                      submission.status === "pending" || submission.status === "in_review";
                    const deadline = waiting
                      ? essayResponseDeadline(submission.submitted_at)
                      : null;

                    return (
                      <li
                        key={submission.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Clock3
                            className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
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
                            {deadline ? (
                              <p className="mt-0.5 text-xs font-medium text-blue-700">
                                Resposta prevista até {formatDeadlineDate(deadline)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {/* pl-7 alinha as ações com o texto no mobile (ícone + gap). */}
                        <div className="flex items-center gap-2 pl-7 sm:shrink-0 sm:pl-0">
                          {submission.status === "completed" && score !== null ? (
                            <Badge tone="green" className="tnum whitespace-nowrap">
                              {score}/1000
                            </Badge>
                          ) : null}
                          <Badge
                            tone={statusTones[submission.status]}
                            className="whitespace-nowrap"
                          >
                            {statusLabels[submission.status]}
                          </Badge>
                          <Link
                            href={`/dashboard/correcao-redacao/${submission.id}`}
                            className={buttonClasses({ variant: "outline", size: "sm" })}
                          >
                            Abrir
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <EmptyState
                icon={PenLine}
                title="Nenhuma redação enviada"
                description="Seus envios aparecem aqui com status, prazo de resposta, nota das competências e créditos utilizados."
              />
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function ProgressTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
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

/**
 * Reduz a foto no navegador antes de entrar no envio. Se o navegador não
 * conseguir decodificar a imagem, o arquivo original é mantido e a validação de
 * tamanho barra o envio com mensagem clara.
 */
async function shrinkImageForUpload(file: File) {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", IMAGE_JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], toJpegName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

function toJpegName(fileName: string) {
  const base = fileName.replace(/\.[^./\\]+$/, "") || "pagina";
  return `${base}.jpg`;
}

type EssayProgress = {
  lastScore: number;
  delta: number | null;
  weakest: { key: EssayCompetenceKey; average: number } | null;
};

/** Os envios chegam do mais recente para o mais antigo. */
function buildEssayProgress(submissions: EssayWithFiles[]): EssayProgress | null {
  const scored = submissions
    .filter((submission) => submission.status === "completed")
    .map((submission) => readEssayScoreRecord(submission.scores))
    .filter((record) => record.total !== null);

  const latest = scored[0];
  if (!latest || latest.total === null) return null;

  const previousTotal = scored[1]?.total ?? null;

  const averages = ESSAY_COMPETENCE_KEYS.map((key) => {
    const values = scored
      .map((record) => record.competences[key])
      .filter((value): value is number => value !== null);
    return {
      key,
      average: values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : null,
    };
  }).filter((entry): entry is { key: EssayCompetenceKey; average: number } => entry.average !== null);

  const weakest = averages.length
    ? averages.reduce((lowest, entry) => (entry.average < lowest.average ? entry : lowest))
    : null;

  return {
    lastScore: latest.total,
    delta: previousTotal === null ? null : latest.total - previousTotal,
    weakest,
  };
}

const READY_CORRECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const READY_CORRECTION_NOTICE_DURATION_MS = 12 * 1000;
const READY_CORRECTION_NOTICE_STORAGE_PREFIX = "essay-ready-notice-dismissed:";

/** Correção concluída nos últimos dias: é o aviso de "ficou pronta". */
function findRecentCompleted(submissions: EssayWithFiles[]) {
  return (
    submissions.find(
      (submission) =>
        submission.status === "completed" &&
        submission.completed_at !== null &&
        Date.now() - new Date(submission.completed_at).getTime() < READY_CORRECTION_WINDOW_MS,
    ) ?? null
  );
}

function readyCorrectionStorageKey(submissionId: string) {
  return `${READY_CORRECTION_NOTICE_STORAGE_PREFIX}${submissionId}`;
}

function hasDismissedReadyCorrection(submissionId: string) {
  try {
    return window.localStorage.getItem(readyCorrectionStorageKey(submissionId)) === "1";
  } catch {
    return false;
  }
}

function rememberDismissedReadyCorrection(submissionId: string) {
  try {
    window.localStorage.setItem(readyCorrectionStorageKey(submissionId), "1");
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function formatDelta(delta: number) {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function formatSubmissionDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeadlineDate(value: Date) {
  return formatAppDateTime(value, { day: "2-digit", month: "2-digit" });
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
