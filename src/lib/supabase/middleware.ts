import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { getAccessContext } from "@/lib/access";
import {
  AUTH_SESSION_STARTED_AT_COOKIE,
  clearSessionStartedResponseCookie,
  hasSessionTimedOut,
  setSessionStartedResponseCookie,
  supabaseAuthCookieOptions,
} from "@/lib/auth/session-timeout";
import {
  REFERRAL_ATTRIBUTION_COOKIE_NAME,
  isReferralCodeShape,
  normalizeReferralCode,
  referralAttributionCookieOptions,
} from "@/lib/referrals/cookies";
import {
  TIKTOK_CLICK_ID_COOKIE,
  TIKTOK_CLICK_ID_COOKIE_DAYS,
  isTikTokClickIdShape,
} from "@/lib/services/tiktok-events-payload.mjs";

/**
 * NextResponse.redirect() cria uma resposta NOVA: qualquer cookie acumulado em
 * `response` durante o middleware — atribuição de indicação, click ID do TikTok,
 * refresh de sessão do Supabase — é descartado silenciosamente. Verificado: um
 * GET /dashboard?ttclid=... deslogado saía sem Set-Cookie nenhum.
 */
function redirectPreservingCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("setup", "supabase");
      // Sem Supabase configurado nenhum cookie foi acumulado ainda.
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!request.cookies.get(REFERRAL_ATTRIBUTION_COOKIE_NAME)?.value) {
    const referralCode = normalizeReferralCode(request.nextUrl.searchParams.get("ref"));
    if (isReferralCodeShape(referralCode)) {
      const { data, error } = await supabase.rpc("resolve_referral_code", {
        input_code: referralCode,
      });
      const resolvedCode = Array.isArray(data) ? data[0]?.referral_code : null;
      if (!error && resolvedCode) {
        request.cookies.set(REFERRAL_ATTRIBUTION_COOKIE_NAME, resolvedCode);
        response.cookies.set(
          REFERRAL_ATTRIBUTION_COOKIE_NAME,
          resolvedCode,
          referralAttributionCookieOptions(),
        );
      }
    }
  }

  // Mesmo padrão do código de indicação, e pelo mesmo motivo: o identificador
  // chega uma única vez, na URL do clique, e precisa sobreviver a cadastro,
  // verificação de e-mail e ida ao Mercado Pago. Aqui ele é capturado no
  // servidor, antes de qualquer redirect e sem depender do Pixel ter carregado.
  // Sempre sobrescreve: um clique novo é uma atribuição nova.
  const clickId = request.nextUrl.searchParams.get("ttclid")?.trim();
  if (clickId && isTikTokClickIdShape(clickId)) {
    request.cookies.set(TIKTOK_CLICK_ID_COOKIE, clickId);
    response.cookies.set(TIKTOK_CLICK_ID_COOKIE, clickId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TIKTOK_CLICK_ID_COOKIE_DAYS * 24 * 60 * 60,
    });
  }

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isAuthPage = request.nextUrl.pathname === "/login";
  const sessionStartedAt = request.cookies.get(AUTH_SESSION_STARTED_AT_COOKIE)?.value;

  if (user && hasSessionTimedOut(sessionStartedAt)) {
    await supabase.auth.signOut();

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "session");

    const redirectResponse = redirectPreservingCookies(url, response);
    clearSessionStartedResponseCookie(redirectResponse);
    return redirectResponse;
  }

  if (user && !sessionStartedAt) {
    setSessionStartedResponseCookie(response);
  }

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return redirectPreservingCookies(url, response);
  }

  if (isDashboard && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_level, access_expires_at, beta_tester, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const access = getAccessContext(profile);

    // Sem `next` de propósito. Ele era gravado aqui e em nenhum lugar lido, e
    // honrá-lo não é possível: quem paga pela primeira vez é interceptado logo
    // depois pelo onboarding, e o onboarding termina no diagnóstico por decisão
    // de produto (onboarding-client.tsx). Parâmetro que ninguém consome é código
    // fingindo ter comportamento — some da URL até existir destino que o use.
    if (!access.hasPlatformAccess) {
      const url = request.nextUrl.clone();
      url.pathname = access.expired ? "/acesso-expirado" : "/checkout";
      return redirectPreservingCookies(url, response);
    }

    if (profile && !profile.onboarding_completed && request.nextUrl.pathname !== "/dashboard/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/onboarding";
      return redirectPreservingCookies(url, response);
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
    return redirectPreservingCookies(url, response);
  }

  return response;
}
