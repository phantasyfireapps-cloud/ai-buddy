import { isTauri as tauriCheck } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  try {
    return tauriCheck();
  } catch {
    return false;
  }
}
