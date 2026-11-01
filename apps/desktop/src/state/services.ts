import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthService, type AuthService } from "../lib/auth";
import { createBuddyRepo, type BuddyRepo } from "../lib/buddyRepo";
import { createLocalStore, type KeyValueStore } from "../lib/localStore";
import { createSupabase } from "../lib/supabase";
import type { AppEnv } from "../lib/env";

export interface Services {
  client: SupabaseClient;
  auth: AuthService;
  buddies: BuddyRepo;
  store: KeyValueStore;
}

export function createServices(env: AppEnv): Services {
  const client = createSupabase(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  return {
    client,
    auth: createAuthService(client),
    buddies: createBuddyRepo(client),
    store: createLocalStore(),
  };
}
