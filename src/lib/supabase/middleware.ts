import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { getAccessContext } from "@/lib/access";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("setup", "supabase");
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isAuthPage = request.nextUrl.pathname === "/login";

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isDashboard && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_level, access_expires_at, beta_tester, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const access = getAccessContext(profile);

    if (!access.hasPlatformAccess) {
      const url = request.nextUrl.clone();
      url.pathname = access.expired ? "/acesso-expirado" : "/checkout";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    if (profile && !profile.onboarding_completed && request.nextUrl.pathname !== "/dashboard/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/onboarding";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isAuthPage && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_level, access_expires_at, beta_tester")
      .eq("id", user.id)
      .maybeSingle();
    const access = getAccessContext(profile);
    const url = request.nextUrl.clone();
    url.pathname = access.hasPlatformAccess ? "/dashboard" : "/checkout";
    return NextResponse.redirect(url);
  }

  return response;
}
