import type { Profile } from "@/lib/db/types";

export type AccessLevel = "unpaid" | "paid" | "beta" | "admin";

export type AccessContext = {
  level: AccessLevel;
  hasPlatformAccess: boolean;
  isFull: boolean;
  betaTester: boolean;
  expiresAt: string | null;
  expired: boolean;
};

type AccessProfile = Pick<Profile, "access_level" | "access_expires_at" | "beta_tester">;

export const paidAccessLevels: AccessLevel[] = ["paid", "beta", "admin"];

export function normalizeAccessLevel(value?: string | null): AccessLevel {
  if (value === "full") return "paid";
  if (value === "free") return "unpaid";
  if (value === "paid" || value === "beta" || value === "admin") return value;
  return "unpaid";
}

export function isAccessExpired(expiresAt?: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export function getAccessContext(profile: AccessProfile | null): AccessContext {
  const level = normalizeAccessLevel(profile?.access_level);
  const expiresAt = profile?.access_expires_at ?? null;
  const expired = isAccessExpired(expiresAt);
  const hasPlatformAccess = paidAccessLevels.includes(level) && !expired;

  return {
    level,
    hasPlatformAccess,
    isFull: hasPlatformAccess,
    betaTester: level === "beta" || Boolean(profile?.beta_tester),
    expiresAt,
    expired,
  };
}

export function accessLevelLabel(level: AccessLevel) {
  const labels: Record<AccessLevel, string> = {
    unpaid: "Acesso nao adquirido",
    paid: "Cliente completo",
    beta: "Beta liberado",
    admin: "Administrador",
  };

  return labels[level];
}

export function accessRequiredMessage() {
  return "Seu acesso ao Pontua Enem Completo ainda nao foi adquirido. Finalize a compra para entrar na plataforma.";
}
