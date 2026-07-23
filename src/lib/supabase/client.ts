"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { supabaseAuthCookieOptions } from "@/lib/auth/session-timeout";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookieOptions: supabaseAuthCookieOptions,
  });
}
