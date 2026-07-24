"use server";

import { recordProductEvent } from "@/lib/services/product-events";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ActionResult } from "@/lib/actions/auth";

type ReferralShareEvent = "referral_link_copied" | "referral_share_started";

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
