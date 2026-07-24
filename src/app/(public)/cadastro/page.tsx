import { redirect } from "next/navigation";
import { normalizeReferralCode } from "@/lib/referrals/cookies";

export default async function SignupRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ref = normalizeReferralCode(Array.isArray(params.ref) ? params.ref[0] : params.ref);
  const target = new URLSearchParams({ mode: "signup" });
  if (ref) target.set("ref", ref);

  redirect(`/login?${target.toString()}`);
}
