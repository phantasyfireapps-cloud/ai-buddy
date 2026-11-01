import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

export async function setFullscreen(on: boolean): Promise<void> {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(on);
  } else if (on && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.().catch(() => undefined);
  } else if (!on && document.fullscreenElement) {
    await document.exitFullscreen?.().catch(() => undefined);
  }
}

export async function isFullscreen(): Promise<boolean> {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow().isFullscreen();
  }
  return Boolean(document.fullscreenElement);
}

/** Leaves full-screen and minimises so the Windows desktop is visible; Buddy keeps running. */
export async function showWindowsDesktop(): Promise<void> {
  if (!isTauri()) return setFullscreen(false);
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  await w.setFullscreen(false);
  await w.minimize();
}

export async function quitApp(): Promise<void> {
  if (isTauri()) await invoke("quit_app");
  else window.close();
}

export async function openWifiSettings(): Promise<boolean> {
  if (!isTauri()) return false;
  await invoke("open_wifi_settings");
  return true;
}

export async function getAutostart(): Promise<boolean> {
  if (!isTauri()) return false;
  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostart(on: boolean): Promise<void> {
  if (!isTauri()) return;
  const m = await import("@tauri-apps/plugin-autostart");
  if (on) await m.enable();
  else await m.disable();
}

export async function getPlatformInfo(): Promise<{ os: string; version: string; arch: string }> {
  if (!isTauri()) return { os: "web", version: navigator.userAgent.slice(0, 120), arch: "unknown" };
  const os = await import("@tauri-apps/plugin-os");
  return { os: os.platform(), version: os.version(), arch: os.arch() };
}
