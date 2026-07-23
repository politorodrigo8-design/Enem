import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeInternalPath } from "@/lib/utils";
import { setSessionStartedResponseCookie } from "@/lib/auth/session-timeout";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(requestUrl.searchParams.get("next"));
  let sessionCreated = false;

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("error", "auth_callback");
      return NextResponse.redirect(loginUrl);
    }
    sessionCreated = true;
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  if (sessionCreated) {
    setSessionStartedResponseCookie(response);
  }

  return response;
}
