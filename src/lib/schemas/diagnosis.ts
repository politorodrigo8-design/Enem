import { z } from "zod";

export const diagnosisSchema = z.object({
  target_course: z.string().min(2, "Informe o curso desejado."),
  target_university: z.string().min(2, "Informe a universidade desejada."),
  target_score: z.coerce.number().min(0).max(1000),
  previous_score: z.coerce.number().min(0).max(1000).optional(),
  weekly_hours: z.coerce.number().min(1).max(80),
  available_days: z.string().min(3, "Informe seus dias disponíveis."),
  perceived_difficulties: z.record(z.string(), z.coerce.number().min(1).max(5)),
});

export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
