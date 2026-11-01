import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import { secureStorage } from "./secureStorage";

export const AUTH_STORAGE_KEY = "ai-buddy-auth";

export function createSupabase(url: string, anonKey: string, storage: SupportedStorage = secureStorage): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
