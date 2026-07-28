"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logServerError } from "@/lib/security/public-errors";

const adminFeedbackUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["novo", "em_analise", "resolvido", "ignorado"]),
  internal_note: z.string().trim().max(2000).optional().or(z.literal("")),
});

type AdminFeedbackContext =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
    };

export async function updateFeedbackStatusAction(formData: FormData): Promise<void> {
  const context = await getAdminContext();
  if ("error" in context) return;

  const parsed = adminFeedbackUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    internal_note: formData.get("internal_note"),
  });
  if (!parsed.success) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await context.supabase.from("feedbacks" as never).update({
    status: parsed.data.status,
    internal_note: parsed.data.internal_note || null,
    read_at: parsed.data.status === "novo" ? null : now,
    assigned_admin_id: context.userId,
  } as never).eq("id" as never, parsed.data.id as never);

  if (error) {
    logServerError("feedback.updateStatus", error, { feedbackId: parsed.data.id });
    return;
  }

  revalidatePath("/dashboard/feedbacks");
}

async function getAdminContext(): Promise<AdminFeedbackContext> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase nao configurado." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessao expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const access = getAccessContext(profile);
  if (access.level !== "admin") {
    return { error: "Acesso administrativo necessario." };
  }

  return { supabase, userId: user.id };
}
