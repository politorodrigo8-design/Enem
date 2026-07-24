import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";
import { logServerError } from "@/lib/security/public-errors";
import {
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
  normalizeReferralCode,
  referralAttributionCookieOptions,
} from "@/lib/referrals/cookies";

export async function getReferralCodeFromCookie() {
  const cookieStore = await cookies();
  return normalizeReferralCode(cookieStore.get(REFERRAL_ATTRIBUTION_COOKIE_NAME)?.value);
}

export async function clearReferralCodeCookie() {
  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_ATTRIBUTION_COOKIE_NAME, "", {
    ...referralAttributionCookieOptions(),
    maxAge: 0,
  });
}

export async function attachReferralFromCurrentCookie(userId: string) {
  const referralCode = await getReferralCodeFromCookie();
  if (!referralCode || !isSupabaseAdminConfigured()) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("attach_referral_to_new_user" as never, {
    target_referred_user_id: userId,
    input_referral_code: referralCode,
    input_source: "signup_cookie",
  } as never);

  if (error) {
    logServerError("referrals.attach_from_cookie", error, { userId });
    return null;
  }

  await clearReferralCodeCookie();
  return data;
}

export async function processPendingReferralRewardsForUser(userId: string) {
  if (!isSupabaseAdminConfigured()) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_pending_referral_rewards" as never, {
    target_referrer_user_id: userId,
  } as never);

  if (error) {
    logServerError("referrals.process_pending_for_user", error, { userId });
    return 0;
  }

  return Number(data ?? 0);
}

export async function processAllPendingReferralRewards() {
  if (!isSupabaseAdminConfigured()) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_pending_referral_rewards" as never, {
    target_referrer_user_id: null,
  } as never);

  if (error) {
    logServerError("referrals.process_pending_all", error);
    return 0;
  }

  return Number(data ?? 0);
}
