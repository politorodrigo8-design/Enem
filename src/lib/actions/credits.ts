"use server";

import { revalidatePath } from "next/cache";
import { accessRequiredMessage, getAccessContext } from "@/lib/access";
import type { ActionResult } from "@/lib/actions/auth";
import type { Profile } from "@/lib/db/types";
import {
  ESSAY_CREDIT_COST,
  ESSAY_SIGNED_URL_EXPIRES_IN_SECONDS,
  ESSAY_STORAGE_BUCKET,
  acceptedEssayUploadTypes,
  essayCancelSchema,
  essayFileSignedUrlSchema,
  essayStatusActionSchema,
  essaySubmissionSchema,
  essayTransferSchema,
  essayUploadFilesSchema,
  onlineEssaySubmissionSchema,
  type EssayCancelInput,
  type EssayTransferInput,
} from "@/lib/schemas/essay";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedContext() {
  if (!isSupabaseConfigured()) {
    return { error: "Configure o Supabase para salvar redacoes." } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessao expirada. Entre novamente." } as const;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { error: error.message } as const;

  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
    access: getAccessContext((profile as Profile | null) ?? null),
  } as const;
}

function mapEssaySubmitError(message: string) {
  if (message.includes("insufficient credits")) {
    return "Saldo insuficiente para enviar a redacao.";
  }
  if (message.includes("missing uploaded files")) {
    return "Nao foi possivel confirmar todos os arquivos enviados.";
  }
  if (message.includes("pdf must be a single file")) {
    return "PDF deve ser enviado como arquivo unico.";
  }
  if (message.includes("total upload size exceeded")) {
    return "A submissao deve ter no maximo 30 MB no total.";
  }
  if (message.includes("platform access required")) {
    return accessRequiredMessage();
  }
  if (message.includes("invalid file count")) {
    return "Envie de 1 a 4 arquivos por redacao.";
  }
  return message;
}

function mapAdminEssayError(message: string) {
  if (message.includes("admin access required")) {
    return "Apenas administradores podem executar esta operacao.";
  }
  if (message.includes("not available")) {
    return "Esta redacao ja foi assumida ou saiu da fila.";
  }
  if (message.includes("target admin access required")) {
    return "O responsavel informado nao e administrador ativo.";
  }
  if (message.includes("completed submission cannot be cancelled")) {
    return "Redacao concluida nao pode ser cancelada.";
  }
  if (message.includes("cancelled submission cannot be completed")) {
    return "Redacao cancelada nao pode ser concluida.";
  }
  return message;
}

export async function submitEssayCorrectionAction(
  formData: FormData,
): Promise<ActionResult & { submissionId?: string }> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };
  if (!context.access.hasPlatformAccess) {
    return {
      ok: false,
      message: context.access.expired
        ? "Seu acesso ao NexoENEM expirou."
        : accessRequiredMessage(),
    };
  }

  const raw = {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    theme: String(formData.get("theme") ?? ""),
    studentNote: String(formData.get("studentNote") ?? ""),
  };
  const parsed = essaySubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados invalidos.",
    };
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const fileMetadata = files.map((file) => ({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  }));
  const filesParsed = essayUploadFilesSchema.safeParse(fileMetadata);
  if (!filesParsed.success) {
    return {
      ok: false,
      message: filesParsed.error.issues[0]?.message ?? "Arquivos invalidos.",
    };
  }

  const { supabase, user } = context;
  const { data: attemptRows, error: attemptError } = await supabase.rpc(
    "initiate_essay_submission",
    {
      input_idempotency_key: parsed.data.idempotencyKey,
      input_theme: parsed.data.theme || null,
      input_student_note: parsed.data.studentNote || null,
      input_expected_file_count: files.length,
    },
  );

  const attempt = attemptRows?.[0];
  if (attemptError || !attempt?.submission_id) {
    return {
      ok: false,
      message: mapEssaySubmitError(attemptError?.message ?? "Nao foi possivel iniciar o envio."),
    };
  }

  if (attempt.already_confirmed) {
    return {
      ok: true,
      message: "Redacao ja registrada anteriormente.",
      submissionId: attempt.submission_id,
    };
  }

  if (attempt.submission_status === "upload_failed") {
    return {
      ok: false,
      message: "Esta tentativa de envio falhou. Inicie um novo envio.",
    };
  }

  const { data: existingFiles } = await supabase
    .from("essay_submission_files")
    .select("id")
    .eq("submission_id", attempt.submission_id);

  if ((existingFiles?.length ?? 0) > 0) {
    if (existingFiles?.length === files.length) {
      return confirmEssayAttempt(attempt.submission_id, parsed.data.idempotencyKey, files.length);
    }
    return {
      ok: false,
      message: "Esta tentativa ja tem arquivos em andamento. Inicie um novo envio.",
    };
  }

  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const pageOrder = index + 1;
      const storagePath = buildEssayStoragePath({
        userId: user.id,
        submissionId: attempt.submission_id,
        pageOrder,
        mimeType: file.type,
      });

      const { error: uploadError } = await supabase.storage
        .from(ESSAY_STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }
      uploadedPaths.push(storagePath);

      const { error: fileError } = await supabase.from("essay_submission_files").insert({
        submission_id: attempt.submission_id,
        user_id: user.id,
        storage_bucket: ESSAY_STORAGE_BUCKET,
        storage_path: storagePath,
        page_order: pageOrder,
        mime_type: file.type as "application/pdf" | "image/png" | "image/jpeg",
        size_bytes: file.size,
        original_name: trimFileName(file.name),
      });

      if (fileError) {
        throw new Error(fileError.message);
      }
    }
  } catch (error) {
    await removeUploadedFiles(uploadedPaths);
    await supabase
      .from("essay_submission_files")
      .delete()
      .in("storage_path", uploadedPaths.length ? uploadedPaths : [""]);
    await markUploadFailed(attempt.submission_id, parsed.data.idempotencyKey, errorMessage(error));

    return {
      ok: false,
      message: mapEssaySubmitError(errorMessage(error)),
    };
  }

  const confirmed = await confirmEssayAttempt(
    attempt.submission_id,
    parsed.data.idempotencyKey,
    files.length,
  );

  if (!confirmed.ok) {
    await removeUploadedFiles(uploadedPaths);
    await supabase
      .from("essay_submission_files")
      .delete()
      .in("storage_path", uploadedPaths.length ? uploadedPaths : [""]);
    await markUploadFailed(attempt.submission_id, parsed.data.idempotencyKey, confirmed.message);
  }

  return confirmed;
}

export async function submitOnlineEssayCorrectionAction(
  formData: FormData,
): Promise<ActionResult & { submissionId?: string }> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };
  if (!context.access.hasPlatformAccess) {
    return {
      ok: false,
      message: context.access.expired
        ? "Seu acesso ao NexoENEM expirou."
        : accessRequiredMessage(),
    };
  }

  const raw = {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    theme: String(formData.get("theme") ?? ""),
    studentNote: String(formData.get("studentNote") ?? ""),
    essayText: String(formData.get("essayText") ?? ""),
  };
  const parsed = onlineEssaySubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados invalidos.",
    };
  }

  const { data, error } = await context.supabase.rpc("submit_essay_for_correction", {
    input_client_token: parsed.data.idempotencyKey,
    input_theme: parsed.data.theme || "Redacao sem tema",
    input_delivery_type: "online",
    input_essay_text: parsed.data.essayText,
    input_file_name: null,
    input_file_size: null,
    input_file_type: null,
    input_storage_bucket: null,
    input_storage_path: null,
    input_student_note: parsed.data.studentNote || null,
  });

  if (error || !data) {
    return {
      ok: false,
      message: mapEssaySubmitError(error?.message ?? "Nao foi possivel enviar a redacao."),
    };
  }

  revalidatePath("/dashboard/correcao-redacao");
  revalidatePath("/dashboard/creditos");
  revalidatePath("/dashboard/redacoes");

  return {
    ok: true,
    message: `Redacao enviada para a fila. Foram debitados ${ESSAY_CREDIT_COST} creditos.`,
    submissionId: data,
  };
}

async function confirmEssayAttempt(
  submissionId: string,
  idempotencyKey: string,
  fileCount: number,
): Promise<ActionResult & { submissionId?: string }> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { data, error } = await context.supabase.rpc("confirm_essay_submission", {
    input_submission_id: submissionId,
    input_idempotency_key: idempotencyKey,
    input_expected_file_count: fileCount,
  });

  if (error || !data) {
    return {
      ok: false,
      message: mapEssaySubmitError(error?.message ?? "Nao foi possivel confirmar o envio."),
    };
  }

  revalidatePath("/dashboard/correcao-redacao");
  revalidatePath("/dashboard/creditos");
  revalidatePath("/dashboard/redacoes");

  return {
    ok: true,
    message: `Redacao enviada para a fila. Foram debitados ${ESSAY_CREDIT_COST} creditos.`,
    submissionId: data,
  };
}

export async function createEssayFileSignedUrlAction(
  fileId: string,
): Promise<ActionResult & { url?: string; mimeType?: string; fileName?: string }> {
  const parsed = essayFileSignedUrlSchema.safeParse({ fileId });
  if (!parsed.success) return { ok: false, message: "Arquivo invalido." };

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { data: file, error } = await context.supabase
    .from("essay_submission_files")
    .select("storage_bucket, storage_path, mime_type, original_name")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (error || !file) {
    return { ok: false, message: error?.message ?? "Arquivo nao encontrado." };
  }

  const { data, error: signedError } = await context.supabase.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, ESSAY_SIGNED_URL_EXPIRES_IN_SECONDS);

  if (signedError || !data?.signedUrl) {
    return { ok: false, message: signedError?.message ?? "Nao foi possivel abrir o arquivo." };
  }

  return {
    ok: true,
    message: "URL assinada gerada.",
    url: data.signedUrl,
    mimeType: file.mime_type,
    fileName: file.original_name ?? undefined,
  };
}

export async function startEssayReviewAction(
  submissionId: string,
): Promise<ActionResult> {
  const parsed = essayStatusActionSchema.safeParse({ submissionId });
  if (!parsed.success) return { ok: false, message: "Redacao invalida." };

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { error } = await context.supabase.rpc("admin_claim_essay_submission", {
    input_submission_id: parsed.data.submissionId,
  });
  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  revalidatePath("/dashboard/redacoes");
  revalidatePath(`/dashboard/redacoes/${parsed.data.submissionId}`);
  return { ok: true, message: "Redacao assumida para revisao." };
}

export async function releaseEssaySubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  const parsed = essayStatusActionSchema.safeParse({ submissionId });
  if (!parsed.success) return { ok: false, message: "Redacao invalida." };

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { error } = await context.supabase.rpc("admin_release_essay_submission", {
    input_submission_id: parsed.data.submissionId,
  });
  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  revalidatePath("/dashboard/redacoes");
  revalidatePath(`/dashboard/redacoes/${parsed.data.submissionId}`);
  return { ok: true, message: "Redacao devolvida para a fila." };
}

export async function transferEssaySubmissionAction(
  input: EssayTransferInput,
): Promise<ActionResult> {
  const parsed = essayTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Transferencia invalida." };
  }

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { error } = await context.supabase.rpc("admin_transfer_essay_submission", {
    input_submission_id: parsed.data.submissionId,
    input_target_admin_id: parsed.data.targetAdminId,
  });
  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  revalidatePath("/dashboard/redacoes");
  revalidatePath(`/dashboard/redacoes/${parsed.data.submissionId}`);
  return { ok: true, message: "Responsabilidade transferida." };
}

export async function completeEssaySubmissionAction(
  submissionId: string,
): Promise<ActionResult> {
  const parsed = essayStatusActionSchema.safeParse({ submissionId });
  if (!parsed.success) return { ok: false, message: "Redacao invalida." };

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { error } = await context.supabase.rpc("admin_complete_essay_submission", {
    input_submission_id: parsed.data.submissionId,
  });
  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  revalidatePath("/dashboard/redacoes");
  revalidatePath("/dashboard/correcao-redacao");
  revalidatePath(`/dashboard/redacoes/${parsed.data.submissionId}`);
  return { ok: true, message: "Redacao marcada como concluida." };
}

export async function cancelEssaySubmissionAction(
  input: EssayCancelInput,
): Promise<ActionResult> {
  const parsed = essayCancelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Cancelamento invalido." };
  }

  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { error } = await context.supabase.rpc("admin_cancel_essay_submission", {
    input_submission_id: parsed.data.submissionId,
    input_reason: parsed.data.reason ?? null,
  });

  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  revalidatePath("/dashboard/redacoes");
  revalidatePath("/dashboard/correcao-redacao");
  revalidatePath("/dashboard/creditos");
  revalidatePath(`/dashboard/redacoes/${parsed.data.submissionId}`);
  return { ok: true, message: "Redacao cancelada e creditos estornados quando aplicavel." };
}

export async function cleanupAbandonedEssayUploadsAction(): Promise<
  ActionResult & { removedFiles?: number }
> {
  const context = await getAuthenticatedContext();
  if ("error" in context) return { ok: false, message: context.error ?? "Erro de autenticacao." };

  const { data, error } = await context.supabase.rpc("admin_mark_abandoned_essay_uploads", {
    input_older_than: "24 hours",
  });
  if (error) return { ok: false, message: mapAdminEssayError(error.message) };

  const paths = ((data ?? []) as Array<{ storage_path: string | null }>)
    .map((item) => item.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    await context.supabase.storage.from(ESSAY_STORAGE_BUCKET).remove(paths);
  }

  revalidatePath("/dashboard/redacoes");
  return {
    ok: true,
    message: `${paths.length} arquivo(s) abandonado(s) removido(s).`,
    removedFiles: paths.length,
  };
}

function buildEssayStoragePath({
  userId,
  submissionId,
  pageOrder,
  mimeType,
}: {
  userId: string;
  submissionId: string;
  pageOrder: number;
  mimeType: string;
}) {
  return `essays/${userId}/${submissionId}/${pageOrder}-${crypto.randomUUID()}.${extensionForMime(
    mimeType,
  )}`;
}

function extensionForMime(mime: string) {
  if (!acceptedEssayUploadTypes.has(mime)) return "bin";
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  return "jpg";
}

function trimFileName(fileName: string) {
  const cleaned = fileName.trim();
  return cleaned.length > 180 ? cleaned.slice(0, 180) : cleaned || "arquivo";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel enviar a redacao.";
}

async function removeUploadedFiles(paths: string[]) {
  if (!paths.length) return;
  const supabase = await createClient();
  await supabase.storage.from(ESSAY_STORAGE_BUCKET).remove(paths);
}

async function markUploadFailed(submissionId: string, idempotencyKey: string, reason: string) {
  const supabase = await createClient();
  await supabase.rpc("mark_essay_upload_failed", {
    input_submission_id: submissionId,
    input_idempotency_key: idempotencyKey,
    input_reason: reason,
  });
}
