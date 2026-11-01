import { isTauri } from "./platform";

/** Small key/value store for non-sensitive local data (settings, offline Buddy cache, device id). */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

class BrowserStore implements KeyValueStore {
  constructor(private prefix = "ai-buddy:") {}
  async get<T>(key: string) {
    const raw = localStorage.getItem(this.prefix + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }
  async set<T>(key: string, value: T) {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }
  async delete(key: string) {
    localStorage.removeItem(this.prefix + key);
  }
}

class TauriStore implements KeyValueStore {
  private storePromise = import("@tauri-apps/plugin-store").then((m) => m.load("ai-buddy.json", { defaults: {}, autoSave: 200 }));
  async get<T>(key: string) {
    return ((await (await this.storePromise).get<T>(key)) ?? null) as T | null;
  }
  async set<T>(key: string, value: T) {
    const s = await this.storePromise;
    await s.set(key, value);
    await s.save();
  }
  async delete(key: string) {
    const s = await this.storePromise;
    await s.delete(key);
    await s.save();
  }
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, unknown>();
  async get<T>(key: string) {
    return (this.map.has(key) ? (this.map.get(key) as T) : null);
  }
  async set<T>(key: string, value: T) {
    this.map.set(key, structuredClone(value));
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

export function createLocalStore(): KeyValueStore {
  return isTauri() ? new TauriStore() : new BrowserStore();
}
