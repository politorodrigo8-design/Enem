import { z } from "zod";
import { appDateISO } from "@/lib/dates";
import {
  ESSAY_TURNAROUND_BUSINESS_DAYS,
  essayResponseDeadlineDate,
} from "@/lib/essays/rules.mjs";

export const ESSAY_CREDIT_COST = 10;
export const ESSAY_STORAGE_BUCKET = "essay-submissions";
// O envio inteiro viaja em uma única requisição, que é cortada por volta de
// 4,5 MB antes de chegar à aplicação. Manter o teto abaixo disso é o que evita
// o envio morrer no meio; as fotos são reduzidas no navegador antes de subir.
export const MAX_ESSAY_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_ESSAY_UPLOAD_FILES = 2;
/**
 * Prazo de devolutiva prometido ao aluno (definido em @/lib/essays/rules.mjs).
 * Confirmação de envio, status de cada redação, aviso de acompanhamento e fila
 * de correção leem daqui — mudar o número lá muda o produto inteiro.
 */
export { ESSAY_TURNAROUND_BUSINESS_DAYS };
export const ESSAY_TURNAROUND_LABEL = `até ${ESSAY_TURNAROUND_BUSINESS_DAYS} dias úteis`;
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
  idempotencyKey: z.string().uuid("Chave de envio inválida."),
  theme: z
    .string()
    .trim()
    .max(180, "O tema deve ter no máximo 180 caracteres.")
    .optional(),
  studentNote: z
    .string()
    .trim()
    .max(1000, "A observação deve ter no máximo 1000 caracteres.")
    .optional(),
});

export const onlineEssaySubmissionSchema = essaySubmissionSchema.extend({
  essayText: z
    .string()
    .trim()
    .min(MIN_ONLINE_ESSAY_LENGTH, "Digite ao menos 400 caracteres para enviar online.")
    .max(MAX_ONLINE_ESSAY_LENGTH, "A redação deve ter no máximo 12000 caracteres.")
    .refine((value) => countWords(value) >= MIN_ONLINE_ESSAY_WORDS, {
      message: "Digite ao menos 80 palavras para enviar online.",
    }),
});

export const essayUploadMetadataSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(3, "Selecione um arquivo válido.")
    .max(180, "Nome de arquivo muito longo."),
  fileSize: z
    .number()
    .int()
    .positive("Arquivo vazio.")
    .max(
      MAX_ESSAY_UPLOAD_SIZE_BYTES,
      `Cada arquivo deve ter no máximo ${formatMegabytes(MAX_ESSAY_UPLOAD_SIZE_BYTES)}. Tire a foto em resolução menor ou envie como PDF.`,
    ),
  fileType: z.string().refine((value) => acceptedEssayUploadTypes.has(value), {
    message: "Use PDF, PNG, JPG ou JPEG.",
  }),
});

export const essayUploadFilesSchema = z
  .array(essayUploadMetadataSchema)
  .min(1, "Selecione pelo menos um arquivo.")
  .max(MAX_ESSAY_UPLOAD_FILES, "Envie no máximo 2 arquivos por redação.")
  .superRefine((files, context) => {
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    if (totalSize > MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES) {
      context.addIssue({
        code: "custom",
        message: `O envio deve ter no máximo ${formatMegabytes(
          MAX_ESSAY_TOTAL_UPLOAD_SIZE_BYTES,
        )} somando os arquivos. Tire as fotos em resolução menor ou envie como PDF.`,
      });
    }

    if (files.some((file) => file.fileType === "application/pdf") && files.length > 1) {
      context.addIssue({
        code: "custom",
        message: "PDF deve ser enviado como arquivo único.",
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
  targetAdminId: z.string().uuid("Administrador inválido."),
});

export const essayCancelSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

const essayCompetenceScoreSchema = z.coerce
  .number()
  .int("A nota deve ser um número inteiro.")
  .min(0, "A nota mínima é 0.")
  .max(200, "A nota máxima por competência é 200.");

export const essayCompletionSchema = z.object({
  submissionId: z.string().uuid(),
  generalFeedback: z
    .string()
    .trim()
    .min(10, "Escreva uma correção geral com pelo menos 10 caracteres.")
    .max(8000, "A correção geral deve ter no máximo 8000 caracteres."),
  competence1Score: essayCompetenceScoreSchema,
  competence2Score: essayCompetenceScoreSchema,
  competence3Score: essayCompetenceScoreSchema,
  competence4Score: essayCompetenceScoreSchema,
  competence5Score: essayCompetenceScoreSchema,
  competence1Feedback: z.string().trim().max(1500).optional(),
  competence2Feedback: z.string().trim().max(1500).optional(),
  competence3Feedback: z.string().trim().max(1500).optional(),
  competence4Feedback: z.string().trim().max(1500).optional(),
  competence5Feedback: z.string().trim().max(1500).optional(),
  reviewerNotes: z.string().trim().max(1500).optional(),
});

export type EssaySubmissionInput = z.infer<typeof essaySubmissionSchema>;
export type OnlineEssaySubmissionInput = z.infer<typeof onlineEssaySubmissionSchema>;
export type EssayCancelInput = z.infer<typeof essayCancelSchema>;
export type EssayTransferInput = z.infer<typeof essayTransferSchema>;
export type EssayCompletionInput = z.infer<typeof essayCompletionSchema>;

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function formatMegabytes(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  const rounded = Number.isInteger(megabytes) ? megabytes : Math.round(megabytes * 10) / 10;
  return `${rounded.toString().replace(".", ",")} MB`;
}

/** Data-limite da devolutiva, contada em dias úteis a partir do envio. */
export function essayResponseDeadline(submittedAt: string | number | Date) {
  const submitted = new Date(submittedAt);
  if (Number.isNaN(submitted.getTime())) return null;

  const deadline: string = essayResponseDeadlineDate(appDateISO(submitted));
  return new Date(`${deadline}T12:00:00.000Z`);
}

export const ESSAY_COMPETENCE_KEYS = [
  "competence_1",
  "competence_2",
  "competence_3",
  "competence_4",
  "competence_5",
] as const;

export type EssayCompetenceKey = (typeof ESSAY_COMPETENCE_KEYS)[number];

export const ESSAY_COMPETENCE_LABELS: Record<EssayCompetenceKey, string> = {
  competence_1: "Competência 1",
  competence_2: "Competência 2",
  competence_3: "Competência 3",
  competence_4: "Competência 4",
  competence_5: "Competência 5",
};

/** O que cada competência cobra, para o aluno saber o que treinar. */
export const ESSAY_COMPETENCE_SUMMARIES: Record<EssayCompetenceKey, string> = {
  competence_1: "domínio da norma padrão",
  competence_2: "compreensão da proposta e repertório",
  competence_3: "seleção e organização dos argumentos",
  competence_4: "coesão e uso de conectivos",
  competence_5: "proposta de intervenção",
};

export type EssayScoreRecord = {
  total: number | null;
  competences: Record<EssayCompetenceKey, number | null>;
};

/** Lê o jsonb de notas da redação, que pode vir com números ou strings. */
export function readEssayScoreRecord(value: unknown): EssayScoreRecord {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const competences = ESSAY_COMPETENCE_KEYS.reduce((accumulator, key) => {
    accumulator[key] = readFiniteNumber(record[key]);
    return accumulator;
  }, {} as Record<EssayCompetenceKey, number | null>);

  const scored = ESSAY_COMPETENCE_KEYS.map((key) => competences[key]).filter(
    (score): score is number => score !== null,
  );
  const total =
    readFiniteNumber(record.total) ??
    (scored.length === ESSAY_COMPETENCE_KEYS.length
      ? scored.reduce((sum, score) => sum + score, 0)
      : null);

  return { total, competences };
}

function readFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type EssayWaitStatus = {
  deadline: Date | null;
  hoursWaiting: number;
  /** Passou do prazo prometido. */
  overdue: boolean;
  /** Passou da metade do prazo e ainda não foi devolvida. */
  nearingDeadline: boolean;
};

export function essayWaitStatus(
  submittedAt: string | number | Date,
  now: Date = new Date(),
): EssayWaitStatus {
  const submitted = new Date(submittedAt);
  const deadline = essayResponseDeadline(submitted);
  if (Number.isNaN(submitted.getTime()) || !deadline) {
    return { deadline: null, hoursWaiting: 0, overdue: false, nearingDeadline: false };
  }

  const elapsed = now.getTime() - submitted.getTime();
  const window = deadline.getTime() - submitted.getTime();

  return {
    deadline,
    hoursWaiting: Math.max(0, Math.floor(elapsed / (60 * 60 * 1000))),
    overdue: elapsed > window,
    nearingDeadline: elapsed > window / 2,
  };
}
