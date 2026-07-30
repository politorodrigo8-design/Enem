"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin/guard";
import { asAdminWriter } from "@/lib/supabase/admin-writer";
import { logServerError } from "@/lib/security/public-errors";

export type AdminActionResult = { ok: boolean; message: string };

const grantAccessSchema = z.object({
  userId: z.string().uuid(),
  level: z.enum(["unpaid", "paid", "beta", "admin"]),
  expiresAt: z.string().trim().max(40).optional().or(z.literal("")),
});

/**
 * Ajusta o acesso de um aluno. O trigger
 * `profiles_prevent_student_access_field_update` impede que o próprio aluno
 * mexa nesses campos, então esta escrita só existe pelo service role.
 */
export async function setCustomerAccessAction(formData: FormData): Promise<AdminActionResult> {
  const context = await assertAdmin();
  if (!context.ok) return { ok: false, message: context.error };

  const parsed = grantAccessSchema.safeParse({
    userId: formData.get("userId"),
    level: formData.get("level"),
    expiresAt: formData.get("expiresAt"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para alterar o acesso." };
  }

  const { userId, level, expiresAt } = parsed.data;

  if (userId === context.adminId && level !== "admin") {
    return {
      ok: false,
      message: "Você não pode remover o próprio acesso administrativo.",
    };
  }

  let expiresValue: string | null = null;
  if (expiresAt) {
    const parsedDate = new Date(expiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return { ok: false, message: "Data de expiração inválida." };
    }
    expiresValue = parsedDate.toISOString();
  }

  const writer = asAdminWriter(context.admin);

  const { error } = await writer
    .from("profiles")
    .update({
      access_level: level,
      access_expires_at: expiresValue,
      beta_tester: level === "beta",
    })
    .eq("id", userId);

  if (error) {
    logServerError("admin.setCustomerAccess", error, { userId });
    return { ok: false, message: "Não foi possível atualizar o acesso." };
  }

  await writer.from("product_events").insert({
    user_id: userId,
    event_name: level === "unpaid" ? "access_revoked" : "access_granted",
    route: "/dashboard/admin/clientes",
    metadata: { level, expires_at: expiresValue, changed_by: context.adminId },
  });

  revalidatePath("/dashboard/admin/clientes");
  revalidatePath(`/dashboard/admin/clientes/${userId}`);

  return { ok: true, message: "Acesso atualizado." };
}

const creditAdjustmentSchema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().int().refine((value) => value !== 0, "Informe um valor diferente de zero."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Crédito manual. Escreve conta e extrato na mesma passada porque o saldo
 * mostrado ao aluno vem de `credit_accounts` e a auditoria, de `credit_ledger`
 * — deixar um sem o outro produz saldo sem origem rastreável.
 */
export async function adjustCustomerCreditsAction(formData: FormData): Promise<AdminActionResult> {
  const context = await assertAdmin();
  if (!context.ok) return { ok: false, message: context.error };

  const parsed = creditAdjustmentSchema.safeParse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Informe um ajuste de créditos válido." };
  }

  const { userId, amount, note } = parsed.data;

  const writer = asAdminWriter(context.admin);

  const { data: account, error: accountError } = await writer
    .from("credit_accounts")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError) {
    logServerError("admin.adjustCredits.account", accountError, { userId });
    return { ok: false, message: "Não foi possível ler o saldo do aluno." };
  }

  const currentBalance = Number(account?.balance ?? 0);
  const nextBalance = currentBalance + amount;

  if (nextBalance < 0) {
    return {
      ok: false,
      message: `Saldo insuficiente: o aluno tem ${currentBalance} crédito(s).`,
    };
  }

  if (!account) {
    const { error: createError } = await writer
      .from("credit_accounts")
      .insert({ user_id: userId, balance: nextBalance });
    if (createError) {
      logServerError("admin.adjustCredits.create", createError, { userId });
      return { ok: false, message: "Não foi possível criar a conta de créditos." };
    }
  } else {
    const { error: updateError } = await writer
      .from("credit_accounts")
      .update({ balance: nextBalance })
      .eq("user_id", userId);
    if (updateError) {
      logServerError("admin.adjustCredits.update", updateError, { userId });
      return { ok: false, message: "Não foi possível atualizar o saldo." };
    }
  }

  const { error: ledgerError } = await writer.from("credit_ledger").insert({
    user_id: userId,
    amount,
    balance_after: nextBalance,
    reason: "manual_adjustment",
    reference_type: "credit_account",
    metadata: { note: note || null, adjusted_by: context.adminId },
  });

  if (ledgerError) {
    logServerError("admin.adjustCredits.ledger", ledgerError, { userId });
    return { ok: false, message: "Saldo alterado, mas o extrato não registrou." };
  }

  revalidatePath(`/dashboard/admin/clientes/${userId}`);
  return {
    ok: true,
    message: `Saldo ajustado para ${nextBalance} crédito(s).`,
  };
}
