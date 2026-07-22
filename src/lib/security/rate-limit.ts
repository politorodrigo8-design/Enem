import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { logServerError } from "@/lib/security/public-errors";

type RateLimitOptions = {
  operation: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitRpcRow = {
  allowed: boolean;
  retry_after_seconds: number | null;
  remaining: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number; message: string };

export async function checkRateLimit({
  operation,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return { allowed: true, remaining: limit };

  if (!isSupabaseAdminConfigured()) {
    logServerError("rateLimit.skipped", new Error("Supabase admin is not configured"), {
      operation,
    });
    return { allowed: true, remaining: limit };
  }

  const admin = createAdminClient();
  const { data, error } = (await admin.rpc("consume_rate_limit" as never, {
    input_operation: operation,
    input_identifier_hash: hashIdentifier(`${operation}:${normalizedIdentifier}`),
    input_limit: limit,
    input_window_seconds: windowSeconds,
  } as never)) as {
    data: RateLimitRpcRow[] | null;
    error: unknown;
  };

  const result = data?.[0];
  if (error || !result) {
    logServerError("rateLimit.consume", error, { operation });
    return { allowed: true, remaining: limit };
  }

  if (result.allowed) {
    return { allowed: true, remaining: result.remaining };
  }

  const retryAfterSeconds = Math.max(1, result.retry_after_seconds ?? windowSeconds);
  return {
    allowed: false,
    retryAfterSeconds,
    message: `Muitas tentativas. Aguarde ${formatRetryAfter(retryAfterSeconds)} e tente novamente.`,
  };
}

export function emailRateLimitIdentifier(email: string) {
  return `email:${email.trim().toLowerCase()}`;
}

export function userRateLimitIdentifier(userId: string) {
  return `user:${userId}`;
}

export function requestRateLimitIdentifier(request: NextRequest | Request) {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwardedFor ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown";

  return `ip:${ip}`;
}

export function rateLimitedResult(result: Extract<RateLimitResult, { allowed: false }>) {
  return { ok: false, message: result.message };
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function formatRetryAfter(seconds: number) {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}
