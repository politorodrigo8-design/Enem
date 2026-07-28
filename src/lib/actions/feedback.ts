"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAccessContext } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logServerError } from "@/lib/security/public-errors";

const adminFeedbackUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["novo", "em_analise", "resolvido", "ignorado"]),
  internal_note: z.string().trim().max(2000).optional().or(z.literal("")),
  return_query: z.string().max(500).optional().or(z.literal("")),
});

const allowedReturnParams = ["status", "type", "rating", "from", "to", "search"];

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
    return_query: formData.get("return_query"),
  });
  if (!parsed.success) {
    redirect(feedbacksPath("", "0"));
  }

  // Preserva quem já assumiu o feedback; só atribui quando ninguém assumiu.
  const { data: current } = await context.supabase
    .from("feedbacks")
    .select("assigned_admin_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error } = await context.supabase
    .from("feedbacks")
    .update({
      status: parsed.data.status,
      internal_note: parsed.data.internal_note || null,
      read_at: parsed.data.status === "novo" ? null : now,
      assigned_admin_id: current?.assigned_admin_id ?? context.userId,
    })
    .eq("id", parsed.data.id);

  if (error) {
    logServerError("feedback.updateStatus", error, { feedbackId: parsed.data.id });
    redirect(feedbacksPath(parsed.data.return_query, "0"));
  }

  revalidatePath("/dashboard/feedbacks");
  redirect(feedbacksPath(parsed.data.return_query, "1"));
}

function feedbacksPath(returnQuery: string | undefined, saved: "0" | "1") {
  const params = new URLSearchParams();
  const incoming = new URLSearchParams(returnQuery ?? "");
  for (const key of allowedReturnParams) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }
  params.set("salvo", saved);
  return `/dashboard/feedbacks?${params.toString()}`;
}

async function getAdminContext(): Promise<AdminFeedbackContext> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const access = getAccessContext(profile);
  if (access.level !== "admin") {
    return { error: "Acesso administrativo necessário." };
  }

  return { supabase, userId: user.id };
}
