import { invoke } from "@tauri-apps/api/core";
import type { SupportedStorage } from "@supabase/supabase-js";
import { isTauri } from "./platform";

/**
 * Storage for auth tokens. In the desktop app values are encrypted with Windows DPAPI (bound to the
 * signed-in Windows user) by the Rust backend. In a plain browser (development only) it uses localStorage.
 */
export const secureStorage: SupportedStorage = {
  async getItem(key) {
    if (!isTauri()) return localStorage.getItem(key);
    return (await invoke<string | null>("secure_get", { key })) ?? null;
  },
  async setItem(key, value) {
    if (!isTauri()) return localStorage.setItem(key, value);
    await invoke("secure_set", { key, value });
  },
  async removeItem(key) {
    if (!isTauri()) return localStorage.removeItem(key);
    await invoke("secure_remove", { key });
  },
};
