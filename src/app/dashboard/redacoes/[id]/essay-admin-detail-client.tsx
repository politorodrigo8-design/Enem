"use client";

import { Ban, CheckCircle2, Loader2, Play, RotateCcw, SendHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
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
import { formatAppDateTime } from "@/lib/dates";

const statusLabels = {
  uploading: "Enviando",
  pending: "Pendente",
  in_review: "Em analise",
  completed: "Concluida",
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

export function EssayAdminDetailClient({ essay }: { essay: EssaySubmissionDetail }) {
  const [pending, startTransition] = useTransition();
  const [targetAdminId, setTargetAdminId] = useState("");
  const [cancelReason, setCancelReason] = useState(essay.cancellation_reason ?? "");
  const finalized = essay.status === "completed" || essay.status === "cancelled";

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      toast[result.ok ? "success" : "error"](result.message);
    });
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
            <Info label="Creditos cobrados" value={`${essay.credit_cost} creditos`} />
            <Info
              label="Assumida em"
              value={essay.assigned_at ? formatDate(essay.assigned_at) : "Nao assumida"}
            />
            <Info
              label="Concluida em"
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
            <Button
              type="button"
              onClick={() => run(() => completeEssaySubmissionAction(essay.id))}
              disabled={pending || finalized || essay.status === "uploading" || essay.status === "upload_failed"}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Marcar concluida
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                ID do novo responsavel
              </span>
              <input
                value={targetAdminId}
                onChange={(event) => setTargetAdminId(event.target.value)}
                placeholder="UUID do administrador"
                disabled={pending || finalized}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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
            Cancelar e estornar 10 creditos
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

function Textarea({
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
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
      />
    </label>
  );
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
