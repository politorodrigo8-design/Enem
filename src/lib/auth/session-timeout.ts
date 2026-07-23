import { type NextResponse } from "next/server";

export const AUTH_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
export const AUTH_SESSION_STARTED_AT_COOKIE = "auth_session_started_at";

const cookieOptions = {
  httpOnly: true,
  maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

type CookieStore = {
  set: (name: string, value: string, options?: CookieOptions) => void;
  delete: (name: string) => void;
};

type CookieOptions = typeof cookieOptions;

export function getSessionStartedAt(cookieValue: string | undefined) {
  if (!cookieValue) return null;

  const timestamp = Number(cookieValue);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function hasSessionTimedOut(cookieValue: string | undefined, now = Date.now()) {
  const startedAt = getSessionStartedAt(cookieValue);
  return startedAt !== null && now - startedAt >= AUTH_SESSION_MAX_AGE_SECONDS * 1000;
}

export function setSessionStartedCookie(cookieStore: CookieStore, startedAt = Date.now()) {
  cookieStore.set(AUTH_SESSION_STARTED_AT_COOKIE, String(startedAt), cookieOptions);
}

export function clearSessionStartedCookie(cookieStore: CookieStore) {
  cookieStore.delete(AUTH_SESSION_STARTED_AT_COOKIE);
}

export function setSessionStartedResponseCookie(response: NextResponse, startedAt = Date.now()) {
  response.cookies.set(AUTH_SESSION_STARTED_AT_COOKIE, String(startedAt), cookieOptions);
}

export function clearSessionStartedResponseCookie(response: NextResponse) {
  response.cookies.set(AUTH_SESSION_STARTED_AT_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export const supabaseAuthCookieOptions = {
  maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
