import {
  REFERRAL_ATTRIBUTION_COOKIE_DAYS,
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
} from "@/lib/referrals/constants";

export const referralCodePattern = /^[A-Z0-9][A-Z0-9-]{5,31}$/;

export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isReferralCodeShape(value: unknown) {
  return referralCodePattern.test(normalizeReferralCode(value));
}

export function buildReferralUrl(baseUrl: string, referralCode: string) {
  const normalizedCode = normalizeReferralCode(referralCode);
  const safeBaseUrl = baseUrl.trim().replace(/\/+$/, "") || "http://localhost:3000";
  return `${safeBaseUrl}/cadastro?ref=${encodeURIComponent(normalizedCode)}`;
}

export function referralAttributionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_ATTRIBUTION_COOKIE_DAYS * 24 * 60 * 60,
  };
}

export { REFERRAL_ATTRIBUTION_COOKIE_NAME };
