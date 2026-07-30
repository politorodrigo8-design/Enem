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

export const verifyEmailOtpSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  // Faixa, não comprimento fixo: produção usa OTP de 8 dígitos e o stack local
  // usa 6 (supabase/config.toml). Travar em 6 passaria em todo teste local e
  // rejeitaria 100% dos cadastros reais antes mesmo de chamar o Supabase.
  token: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "O código tem só números. Confira o e-mail e digite de novo."),
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
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
