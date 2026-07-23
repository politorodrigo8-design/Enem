import { z } from "zod";
import { currentLegalAcceptanceVersions } from "@/lib/legal/config";

const legalVersions = currentLegalAcceptanceVersions();

export const legalAcceptanceSchema = z.object({
  terms_of_use: z.literal(legalVersions.terms_of_use, {
    error: "Aceite os Termos de Uso vigentes.",
  }),
  privacy_policy: z.literal(legalVersions.privacy_policy, {
    error: "Confirme a ciência da Política de Privacidade vigente.",
  }),
  refund_policy: z.literal(legalVersions.refund_policy, {
    error: "Aceite a Política de Reembolso vigente.",
  }),
});

export const signInSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export const signUpSchema = signInSchema
  .extend({
    fullName: z.string().min(3, "Informe seu nome completo."),
    confirmPassword: z.string().min(6, "Confirme sua senha."),
    legalAcceptance: legalAcceptanceSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(6, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
