import { z } from "zod";

const optionalScore = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().min(0).max(1000).optional(),
);

export const onboardingSchema = z.object({
  full_name: z.string().min(3, "Informe seu nome."),
  target_course: z.string().min(2, "Informe o curso desejado."),
  target_university: z.string().min(2, "Informe a universidade desejada."),
  target_score: z.coerce.number().min(0).max(1000),
  previous_score: optionalScore,
  weekly_hours: z.coerce.number().min(1).max(80),
  available_days: z.string().min(3, "Informe seus dias disponiveis."),
  perceived_difficulties: z.record(z.string(), z.coerce.number().min(1).max(5)),
  study_preferences: z.record(z.string(), z.unknown()).default({}),
});

export const profileSettingsSchema = onboardingSchema.extend({
  onboarding_completed: z.boolean().optional(),
});

export const betaApplicationSchema = z.object({
  full_name: z.string().min(3, "Informe seu nome."),
  email: z.string().email("Informe um e-mail valido.").transform((value) => value.toLowerCase()),
  city: z.string().min(2, "Informe sua cidade."),
  school_year: z.string().min(2, "Informe seu ano escolar."),
  previous_score: optionalScore,
  target_course: z.string().min(2, "Informe o curso desejado."),
  main_difficulty: z.string().min(3, "Informe sua principal dificuldade."),
  whatsapp: z.string().max(32).optional().or(z.literal("")),
  contact_authorized: z.coerce.boolean().refine(Boolean, {
    message: "Autorize o contato para participar da beta.",
  }),
  comments: z.string().max(1200).optional().or(z.literal("")),
});

export const feedbackSchema = z.object({
  feedback_type: z.enum(["erro", "sugestao", "duvida", "elogio"]),
  route: z.string().min(1).max(200),
  message: z.string().trim().min(8, "Descreva o feedback com um pouco mais de detalhe.").max(1200),
  rating: z.coerce.number().int().min(1).max(5),
  easy_to_understand: z.coerce.boolean().optional(),
  client_created_at: z.string().datetime().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type BetaApplicationInput = z.infer<typeof betaApplicationSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
