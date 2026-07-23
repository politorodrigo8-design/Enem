"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/auth";
import {
  recordCurrentLegalAcceptances,
  validateLegalAcceptancePayload,
} from "@/lib/legal/acceptances";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function acceptCurrentLegalDocumentsAction(input: {
  legalAcceptance?: unknown;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Sessão indisponível. Entre novamente." };
  }

  const validation = validateLegalAcceptancePayload(input.legalAcceptance);
  if (!validation.ok) return validation;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão expirada. Entre novamente." };
  }

  try {
    await recordCurrentLegalAcceptances({
      userId: user.id,
      context: "policy_reacceptance",
      documentVersions: validation.versions,
      metadata: { source: "dashboard_blocking_modal" },
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar os aceites legais.",
    };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Aceites registrados." };
}
