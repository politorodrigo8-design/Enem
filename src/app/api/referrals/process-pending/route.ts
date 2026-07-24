import { NextResponse, type NextRequest } from "next/server";
import { processAllPendingReferralRewards } from "@/lib/referrals/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ ok: false, message: "Supabase admin indisponível." }, { status: 503 });
  }

  const configuredSecret = process.env.REFERRAL_REWARD_PROCESS_SECRET?.trim();
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, message: "Processador não configurado." }, { status: 503 });
  }

  if (configuredSecret) {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (token !== configuredSecret) {
      return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
    }
  }

  const processed = await processAllPendingReferralRewards();
  return NextResponse.json({ ok: true, processed });
}
