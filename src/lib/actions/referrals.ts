"use server";

import { revalidatePath } from "next/cache";
import { recordProductEvent } from "@/lib/services/product-events";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ActionResult } from "@/lib/actions/auth";
import { logServerError } from "@/lib/security/public-errors";

type ReferralShareEvent = "referral_link_copied" | "referral_share_started";
type ReferralCodeResult = ActionResult & { referralCode?: string };

export async function ensureReferralCodeAction(): Promise<ReferralCodeResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Não conseguimos carregar seu link de indicação agora.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão expirada. Entre novamente para copiar seu link." };
  }

  const { data, error } = await supabase.rpc("ensure_referral_code", {
    target_user_id: user.id,
  });

  if (error || !data) {
    logServerError("referrals.ensure_code.action", error ?? new Error("empty referral code"), {
      userId: user.id,
    });
    return {
      ok: false,
      message: "Não conseguimos gerar seu link agora. Tente novamente em alguns minutos.",
    };
  }

  revalidatePath("/dashboard/creditos");
  revalidatePath("/dashboard/configuracoes");
  return { ok: true, message: "Link de indicação pronto.", referralCode: data };
}

export async function recordReferralShareEventAction(
  eventName: ReferralShareEvent,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Evento indisponível." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão expirada." };
  }

  await recordProductEvent({
    supabase,
    userId: user.id,
    eventName,
    route: "/dashboard/creditos",
  });

  return { ok: true, message: "Evento registrado." };
}
