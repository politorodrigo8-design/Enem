import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot mutate cookies; middleware refreshes the session.
          }
        },
      },
    });
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
