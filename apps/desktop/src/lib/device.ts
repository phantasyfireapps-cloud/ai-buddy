import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeyValueStore } from "./localStore";
import { getPlatformInfo } from "./desktop";

const DEVICE_KEY = "deviceId";

export async function getDeviceId(store: KeyValueStore): Promise<string> {
  let id = await store.get<string>(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    await store.set(DEVICE_KEY, id);
  }
  return id;
}

function deviceType(os: string): string {
  if (os === "windows") return "windows-desktop";
  if (os === "android") return "android-tablet";
  if (os === "web") return "web";
  return "other";
}

/** Records this installation against the signed-in account. Failures are non-fatal. */
export async function registerDevice(client: SupabaseClient, store: KeyValueStore, appVersion: string): Promise<void> {
  const id = await getDeviceId(store);
  const info = await getPlatformInfo();
  const { error } = await client.from("devices").upsert(
    {
      installation_id: id,
      device_type: deviceType(info.os),
      operating_system: info.os,
      os_version: info.version,
      app_version: appVersion,
      last_sync_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,installation_id" },
  );
  if (error) console.warn("Device registration failed:", error.message);
}
