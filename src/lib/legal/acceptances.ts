import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  currentLegalAcceptanceVersions,
  currentLegalDocuments,
  legalDocumentTypes,
  type LegalAcceptanceContext,
  type LegalDocumentType,
} from "@/lib/legal/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import type { Database, Json } from "@/lib/supabase/types";

export type LegalAcceptancePayload = {
  terms_of_use?: unknown;
  privacy_policy?: unknown;
  refund_policy?: unknown;
};

export type LegalAcceptanceValidation =
  | { ok: true; versions: Record<LegalDocumentType, string> }
  | { ok: false; message: string };

type LegalVersionRow = {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  is_current: boolean;
};

const validContexts = new Set<LegalAcceptanceContext>([
  "signup",
  "main_checkout",
  "credit_checkout",
  "policy_reacceptance",
]);

const blockedMetadataKeys = new Set([
  "password",
  "senha",
  "token",
  "access_token",
  "refresh_token",
  "service_role",
  "card",
  "cartao",
  "prompt",
  "essay_text",
  "redacao",
]);

export class LegalAcceptanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LegalAcceptanceError";
  }
}

export function validateLegalAcceptancePayload(
  payload: unknown,
): LegalAcceptanceValidation {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      message: "Confirme os documentos legais obrigatórios antes de continuar.",
    };
  }

  const source = payload as LegalAcceptancePayload;
  const current = currentLegalAcceptanceVersions();
  for (const type of legalDocumentTypes) {
    if (source[type] !== current[type]) {
      return {
        ok: false,
        message: "A versão dos documentos legais informada não está vigente.",
      };
    }
  }

  return { ok: true, versions: current };
}

export async function recordCurrentLegalAcceptances({
  userId,
  context,
  documentVersions,
  orderId,
  productId,
  metadata,
}: {
  userId: string;
  context: LegalAcceptanceContext;
  documentVersions: Record<LegalDocumentType, string>;
  orderId?: string | null;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseAdminConfigured()) {
    throw new LegalAcceptanceError(
      "Não foi possível registrar os aceites legais no servidor.",
    );
  }
  if (!validContexts.has(context)) {
    throw new LegalAcceptanceError("Contexto de aceite inválido.");
  }

  const admin = createAdminClient();
  const versionRows = await getCurrentLegalVersionRows(admin);
  const safeMetadata = sanitizeLegalMetadata(metadata);
  const rows = currentLegalDocuments.map((document) => {
    const versionRow = versionRows.get(document.type);
    if (!versionRow || documentVersions[document.type] !== versionRow.version) {
      throw new LegalAcceptanceError(
        "A versão dos documentos legais informada não está vigente.",
      );
    }

    return {
      acceptance_key: buildAcceptanceKey({
        userId,
        context,
        documentType: document.type,
        version: versionRow.version,
        orderId,
      }),
      user_id: userId,
      document_type: document.type,
      document_version: versionRow.version,
      document_version_id: versionRow.id,
      acceptance_context: context,
      order_id: orderId ?? null,
      product_id: productId ?? null,
      metadata: safeMetadata,
    };
  });

  const { error } = await admin
    .from("legal_acceptances" as never)
    .upsert(rows as never, { onConflict: "acceptance_key" });

  if (error) {
    throw new LegalAcceptanceError("Não foi possível registrar os aceites legais.");
  }
}

export async function getMissingCurrentLegalAcceptances(userId: string) {
  if (!isSupabaseAdminConfigured()) return currentLegalDocuments;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("legal_acceptances" as never)
    .select("document_type, document_version")
    .eq("user_id", userId);

  if (error) return currentLegalDocuments;

  const accepted = new Set(
    ((data ?? []) as Array<{ document_type: LegalDocumentType; document_version: string }>).map(
      (row) => `${row.document_type}:${row.document_version}`,
    ),
  );

  return currentLegalDocuments.filter(
    (document) => !accepted.has(`${document.type}:${document.version}`),
  );
}

async function getCurrentLegalVersionRows(
  admin: SupabaseClient<Database>,
): Promise<Map<LegalDocumentType, LegalVersionRow>> {
  const { data, error } = await admin
    .from("legal_document_versions" as never)
    .select("id, document_type, version, is_current")
    .eq("is_current", true);

  if (error) {
    throw new LegalAcceptanceError("Não foi possível validar as versões legais.");
  }

  const rows = (data ?? []) as LegalVersionRow[];
  const map = new Map(rows.map((row) => [row.document_type, row]));
  for (const document of currentLegalDocuments) {
    const row = map.get(document.type);
    if (!row || row.version !== document.version) {
      throw new LegalAcceptanceError(
        "A versão vigente dos documentos legais não está sincronizada.",
      );
    }
  }
  return map;
}

function buildAcceptanceKey({
  userId,
  context,
  documentType,
  version,
  orderId,
}: {
  userId: string;
  context: LegalAcceptanceContext;
  documentType: LegalDocumentType;
  version: string;
  orderId?: string | null;
}) {
  return [userId, context, documentType, version, orderId ?? "no-order"].join(":");
}

function sanitizeLegalMetadata(metadata?: Record<string, unknown>): Record<string, Json> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !blockedMetadataKeys.has(key.toLowerCase()))
      .slice(0, 12)
      .map(([key, value]) => [key, toJsonValue(value)]),
  );
}

function toJsonValue(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 8).map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !blockedMetadataKeys.has(key.toLowerCase()))
        .slice(0, 8)
        .map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}
