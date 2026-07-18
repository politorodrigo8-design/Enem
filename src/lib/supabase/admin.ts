import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/config";

export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
