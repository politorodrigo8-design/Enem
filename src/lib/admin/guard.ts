import "server-only";

import { redirect } from "next/navigation";
import { requirePlatformAccess } from "@/lib/db/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { canAccessAdminPanel } from "@/lib/admin/rules.mjs";

/**
 * Porta de entrada de toda página e action administrativa.
 *
 * A checagem é feita com a sessão do usuário (RLS ligada) e só depois o cliente
 * de service role é criado — ele ignora RLS por definição, então nunca pode ser
 * instanciado antes de provar que quem chamou é admin.
 */
export async function requireAdmin() {
  const context = await requirePlatformAccess();

  if (!canAccessAdminPanel(context.profile?.access_level)) {
    redirect("/dashboard");
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada: o painel administrativo precisa dela para ler dados de toda a base.",
    );
  }

  return {
    ...context,
    admin: createAdminClient(),
    adminId: context.user.id,
  };
}

/**
 * Versão sem redirect, para actions que devolvem erro em vez de navegar.
 *
 * Sem anotação explícita de retorno de propósito: anotar o cliente como
 * `ReturnType<typeof createAdminClient>` dentro da união colapsa os genéricos
 * do Supabase e todo `insert`/`update` passa a exigir `never`.
 */
export async function assertAdmin() {
  const context = await requirePlatformAccess();

  if (!canAccessAdminPanel(context.profile?.access_level)) {
    return { ok: false as const, error: "Esta ação é restrita a administradores." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { ok: false as const, error: "Configuração administrativa do banco indisponível." };
  }

  return { ok: true as const, adminId: context.user.id, admin: createAdminClient() };
}
