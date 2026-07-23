import "server-only";

export const GENERIC_PUBLIC_ERROR =
  "Não foi possível concluir a operação agora. Tente novamente em instantes.";

type LogContext = Record<string, string | number | boolean | null | undefined>;

export function logServerError(
  scope: string,
  error: unknown,
  context: LogContext = {},
) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};

  console.error(`[Pontua Enem] ${scope}`, {
    ...context,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    code: record.code,
    status: record.status,
    hint: record.hint,
  });
}

export function publicDatabaseErrorMessage(
  error: unknown,
  fallback = GENERIC_PUBLIC_ERROR,
) {
  const message = rawErrorMessage(error);

  if (!message) return fallback;
  if (message.includes("row-level security") || message.includes("violates row-level security")) {
    return "Não foi possível salvar agora. Aguarde alguns minutos e tente novamente.";
  }
  if (message.includes("duplicate key")) {
    return "Este registro já existe.";
  }
  if (message.includes("invalid input syntax")) {
    return "Dados inválidos.";
  }
  if (message.includes("permission denied")) {
    return "Você não tem permissão para executar esta operação.";
  }

  return fallback;
}

export function rawErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}
