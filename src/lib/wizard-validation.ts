import type { ZodType } from "zod";

/**
 * Mensagens em pt-BR dos campos numéricos cujo schema não define texto próprio
 * — sem isso o zod devolveria a mensagem padrão em inglês para o usuário.
 */
const fallbackMessages: Record<string, string> = {
  target_score: "Informe a nota-alvo entre 0 e 1000.",
  previous_score: "A nota anterior deve ficar entre 0 e 1000.",
  weekly_hours: "Informe de 1 a 80 horas de estudo por semana.",
  perceived_difficulties: "Marque de 1 a 5 em cada área.",
};

export type WizardIssue = { step: number; message: string };

/**
 * Valida o formulário inteiro e devolve a primeira pendência até `upToStep`,
 * já com a etapa em que o campo mora, para o wizard levar o usuário de volta ao
 * campo em vez de mostrar o erro só na última etapa.
 */
export function findWizardIssue(
  schema: ZodType,
  value: unknown,
  stepFields: readonly (readonly string[])[],
  upToStep: number = stepFields.length - 1,
): WizardIssue | null {
  const parsed = schema.safeParse(value, {
    error: (issue) => fallbackMessages[String(issue.path?.[0] ?? "")],
  });
  if (parsed.success) return null;

  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    const step = stepFields.findIndex((fields) => fields.includes(field));
    if (step > -1 && step <= upToStep) {
      return { step, message: issue.message };
    }
  }

  return null;
}
