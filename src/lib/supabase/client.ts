"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
}
