import { z } from "zod";

export const ESSAY_CREDIT_COST = 10;
export const ESSAY_STORAGE_BUCKET = "essay-submissions";
export const MAX_ESSAY_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_ESSAY_UPLOAD_FILES = 4;
export const ESSAY_SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;
export const MIN_ONLINE_ESSAY_WORDS = 80;
export const MIN_ONLINE_ESSAY_LENGTH = 400;
export const MAX_ONLINE_ESSAY_LENGTH = 12000;

export const acceptedEssayUploadTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export const essayStatuses = [
  "uploading",
  "pending",
  "in_review",
  "completed",
  "cancelled",
  "upload_failed",
] as const;

export const essaySubmissionSchema = z.object({
  idempotencyKey: z.string().uuid("Chave de envio invalida."),
  theme: z
    .string()
    .trim()
    .max(180, "O tema deve ter no maximo 180 caracteres.")
    .optional(),
  studentNote: z
    .string()
    .trim()
    .max(1000, "A observacao deve ter no maximo 1000 caracteres.")
    .optional(),
});

export const onlineEssaySubmissionSchema = essaySubmissionSchema.extend({
  essayText: z
    .string()
    .trim()
    .min(MIN_ONLINE_ESSAY_LENGTH, "Digite ao menos 400 caracteres para enviar online.")
    .max(MAX_ONLINE_ESSAY_LENGTH, "A redacao deve ter no maximo 12000 caracteres.")
    .refine((value) => countWords(value) >= MIN_ONLINE_ESSAY_WORDS, {
      message: "Digite ao menos 80 palavras para enviar online.",
    }),
});

export const essayUploadMetadataSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(3, "Selecione um arquivo valido.")
    .max(180, "Nome de arquivo muito longo."),
  fileSize: z
    .number()
    .int()
    .positive("Arquivo vazio.")
    .max(MAX_ESSAY_UPLOAD_SIZE_BYTES, "O arquivo deve ter no maximo 10 MB."),
  fileType: z.string().refine((value) => acceptedEssayUploadTypes.has(value), {
    message: "Use PDF, PNG, JPG ou JPEG.",
  }),
});

export const essayUploadFilesSchema = z
  .array(essayUploadMetadataSchema)
  .min(1, "Selecione pelo menos um arquivo.")
  .max(MAX_ESSAY_UPLOAD_FILES, "Envie no maximo 4 arquivos por redacao.")
  .superRefine((files, context) => {
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) {
      context.addIssue({
        code: "custom",
        message: "A submissao deve ter no maximo 30 MB no total.",
      });
    }

    if (files.some((file) => file.fileType === "application/pdf") && files.length > 1) {
      context.addIssue({
        code: "custom",
        message: "PDF deve ser enviado como arquivo unico.",
      });
    }
  });

export const essayStatusActionSchema = z.object({
  submissionId: z.string().uuid(),
});

export const essayFileSignedUrlSchema = z.object({
  fileId: z.string().uuid(),
});

export const essayTransferSchema = z.object({
  submissionId: z.string().uuid(),
  targetAdminId: z.string().uuid("Administrador invalido."),
});

export const essayCancelSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export type EssaySubmissionInput = z.infer<typeof essaySubmissionSchema>;
export type OnlineEssaySubmissionInput = z.infer<typeof onlineEssaySubmissionSchema>;
export type EssayCancelInput = z.infer<typeof essayCancelSchema>;
export type EssayTransferInput = z.infer<typeof essayTransferSchema>;

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
