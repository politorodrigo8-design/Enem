import type { Json } from "@/lib/supabase/types";

export const productEventNames = [
  "signup_completed",
  "checkout_started",
  "order_created",
  "payment_pending",
  "payment_approved",
  "payment_rejected",
  "payment_refunded",
  "access_granted",
  "access_revoked",
  "onboarding_started",
  "onboarding_completed",
  "diagnosis_started",
  "diagnosis_completed",
  "question_answered",
  "high_priority_training_started",
  "high_priority_question_completed",
  "simulation_started",
  "simulation_completed",
  "study_plan_generated",
  "study_plan_item_completed",
  "premium_block_seen",
  "beta_application_submitted",
  "feedback_submitted",
  "essay_submitted",
  "essay_corrected",
  "essay_cancelled",
] as const;

export type ProductEventName = (typeof productEventNames)[number];
type EventInsertError = { code?: string; message?: string } | null;
type ProductEventWriter = {
  from: (table: "product_events") => {
    insert: (values: Record<string, unknown>) => PromiseLike<{ error: EventInsertError }>;
  };
};

const blockedMetadataKeys = new Set([
  "password",
  "senha",
  "token",
  "access_token",
  "refresh_token",
  "service_role",
  "key",
  "email",
  "phone",
  "whatsapp",
  "name",
  "full_name",
]);

export function isProductEventName(value: string): value is ProductEventName {
  return productEventNames.includes(value as ProductEventName);
}

export function sanitizeEventMetadata(
  metadata?: Record<string, unknown>,
): Record<string, Json> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedMetadataKeys.has(key.toLowerCase()))
      .slice(0, 12)
      .map(([key, value]) => [key, toJsonValue(value)]),
  );
}

export async function recordProductEvent({
  supabase,
  userId,
  eventName,
  route,
  metadata,
}: {
  supabase: ProductEventWriter;
  userId: string;
  eventName: ProductEventName;
  route?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase.from("product_events").insert({
      user_id: userId,
      event_name: eventName,
      route: route ?? null,
      metadata: sanitizeEventMetadata(metadata),
    });

    if (error) {
      console.warn("[NexoENEM events] failed to record product event", {
        eventName,
        code: error.code,
      });
    }
  } catch (error) {
    console.warn("[NexoENEM events] event ignored", {
      eventName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function toJsonValue(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 10).map(toJsonValue);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !blockedMetadataKeys.has(key.toLowerCase()))
        .slice(0, 10)
        .map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}
