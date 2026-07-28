"use client";

import { Ban, CheckCircle2, Loader2, Play, RotateCcw, SendHorizontal } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelEssaySubmissionAction,
  completeEssaySubmissionAction,
  releaseEssaySubmissionAction,
  startEssayReviewAction,
  transferEssaySubmissionAction,
} from "@/lib/actions/credits";
import type { EssaySubmissionDetail } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { formatAppDateTime } from "@/lib/dates";

const statusLabels = {
  uploading: "Enviando",
  pending: "Pendente",
  in_review: "Em análise",
  completed: "Concluída",
  cancelled: "Cancelada",
  upload_failed: "Falha no envio",
} as const;

const statusTones = {
  uploading: "amber",
  pending: "blue",
  in_review: "blue",
  completed: "green",
  cancelled: "red",
  upload_failed: "red",
} as const;

const competenceFields = [
  { key: "competence_1", label: "Competência 1" },
  { key: "competence_2", label: "Competência 2" },
  { key: "competence_3", label: "Competência 3" },
  { key: "competence_4", label: "Competência 4" },
  { key: "competence_5", label: "Competência 5" },
] as const;

const controlBase =
  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
// 44px de alvo de toque no mobile, densidade de 40px a partir de sm.
const inputClass = `${controlBase} h-11 sm:h-10`;
const textareaClass = `${controlBase} py-2 leading-6`;

type CompetenceKey = (typeof competenceFields)[number]["key"];
type ScoreState = Record<CompetenceKey, string>;
type FeedbackState = Record<CompetenceKey, string>;

export function EssayAdminDetailClient({ essay }: { essay: EssaySubmissionDetail }) {
  const [pending, startTransition] = useTransition();
  const [targetAdminId, setTargetAdminId] = useState("");
  const [cancelReason, setCancelReason] = useState(essay.cancellation_reason ?? "");
  const [generalFeedback, setGeneralFeedback] = useState(
    essay.essay_correction_results?.[0]?.general_text ?? "",
  );
  const [reviewerNotes, setReviewerNotes] = useState(essay.reviewer_notes ?? "");
  const [scores, setScores] = useState<ScoreState>(() => buildInitialScores(essay));
  const [feedback, setFeedback] = useState<FeedbackState>(() => buildInitialFeedback(essay));
  const finalized = essay.status === "completed" || essay.status === "cancelled";
  const canSubmitCorrection = essay.status === "in_review" && !finalized;
  const scoresAreValid = competenceFields.every((field) => isValidScore(scores[field.key]));
  const totalScore = useMemo(
    () =>
      competenceFields.reduce((sum, field) => {
        const parsed = Number(scores[field.key]);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [scores],
  );

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  function submitCorrection() {
    run(() =>
      completeEssaySubmissionAction({
        submissionId: essay.id,
        generalFeedback,
        competence1Score: Number(scores.competence_1),
        competence2Score: Number(scores.competence_2),
        competence3Score: Number(scores.competence_3),
        competence4Score: Number(scores.competence_4),
        competence5Score: Number(scores.competence_5),
        competence1Feedback: feedback.competence_1,
        competence2Feedback: feedback.competence_2,
        competence3Feedback: feedback.competence_3,
        competence4Feedback: feedback.competence_4,
        competence5Feedback: feedback.competence_5,
        reviewerNotes,
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Fluxo administrativo</CardTitle>
            <Badge tone={statusTones[essay.status]}>{statusLabels[essay.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="Créditos cobrados" value={`${essay.credit_cost} créditos`} />
            <Info
              label="Assumida em"
              value={essay.assigned_at ? formatDate(essay.assigned_at) : "Não assumida"}
            />
            <Info
              label="Concluída em"
              value={essay.completed_at ? formatDate(essay.completed_at) : "Em aberto"}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => run(() => startEssayReviewAction(essay.id))}
              disabled={pending || essay.status !== "pending" || Boolean(essay.assigned_admin_id)}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Assumir
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => run(() => releaseEssaySubmissionAction(essay.id))}
              disabled={pending || essay.status !== "in_review"}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Devolver para fila
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                ID do novo responsável
              </span>
              <input
                value={targetAdminId}
                onChange={(event) => setTargetAdminId(event.target.value)}
                placeholder="UUID do administrador"
                disabled={pending || finalized}
                className={inputClass}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={() =>
                run(() =>
                  transferEssaySubmissionAction({
                    submissionId: essay.id,
                    targetAdminId,
                  }),
                )
              }
              disabled={pending || finalized || !targetAdminId.trim()}
            >
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              Transferir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Correção</CardTitle>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200">
              {totalScore}/1000
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {essay.status === "pending" ? (
            <Notice tone="info">Assuma a redação para enviar a correção ao aluno.</Notice>
          ) : null}

          <Textarea
            label="Correção geral"
            value={generalFeedback}
            onChange={setGeneralFeedback}
            rows={7}
            disabled={finalized}
          />

          <div className="grid gap-4">
            {competenceFields.map((field) => (
              <div
                key={field.key}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[150px_1fr]"
              >
                <ScoreInput
                  label={field.label}
                  value={scores[field.key]}
                  onChange={(value) =>
                    setScores((current) => ({ ...current, [field.key]: value }))
                  }
                  disabled={finalized}
                />
                <Textarea
                  label={`Comentário - ${field.label}`}
                  value={feedback[field.key]}
                  onChange={(value) =>
                    setFeedback((current) => ({ ...current, [field.key]: value }))
                  }
                  rows={3}
                  disabled={finalized}
                />
              </div>
            ))}
          </div>

          <Textarea
            label="Notas internas"
            value={reviewerNotes}
            onChange={setReviewerNotes}
            rows={3}
            disabled={finalized}
          />

          <Button
            type="button"
            onClick={submitCorrection}
            disabled={
              pending ||
              !canSubmitCorrection ||
              !scoresAreValid ||
              generalFeedback.trim().length < 10
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            Enviar correção
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cancelamento e estorno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Motivo"
            value={cancelReason}
            onChange={setCancelReason}
            disabled={essay.status === "completed" || essay.status === "cancelled"}
          />
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              run(() =>
                cancelEssaySubmissionAction({
                  submissionId: essay.id,
                  reason: cancelReason,
                }),
              )
            }
            disabled={pending || essay.status === "completed" || essay.status === "cancelled"}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Cancelar e estornar 10 créditos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        min={0}
        max={200}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${inputClass} font-semibold`}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={textareaClass}
      />
    </label>
  );
}

function buildInitialScores(essay: EssaySubmissionDetail): ScoreState {
  const scoresRecord = readJsonRecord(essay.scores);
  return competenceFields.reduce((accumulator, field) => {
    const raw = scoresRecord[field.key];
    accumulator[field.key] =
      typeof raw === "number" || typeof raw === "string" ? String(raw) : "0";
    return accumulator;
  }, {} as ScoreState);
}

function buildInitialFeedback(essay: EssaySubmissionDetail): FeedbackState {
  const feedbackRecord = readJsonRecord(essay.feedback);
  return competenceFields.reduce((accumulator, field) => {
    const raw = feedbackRecord[field.key];
    accumulator[field.key] = typeof raw === "string" ? raw : "";
    return accumulator;
  }, {} as FeedbackState);
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isValidScore(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 200;
}

function formatDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
