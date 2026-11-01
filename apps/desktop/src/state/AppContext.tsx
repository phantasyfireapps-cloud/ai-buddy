import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AvatarController } from "../avatar/AvatarController";
import { buddyProfileSchema, type BuddyPatch, type BuddyProfile, type NewBuddyInput } from "../lib/buddyRepo";
import { registerDevice } from "../lib/device";
import { setFullscreen } from "../lib/desktop";
import type { Services } from "./services";

export type Screen =
  | "booting"
  | "welcome"
  | "signUp"
  | "verify"
  | "signIn"
  | "forgot"
  | "create"
  | "home"
  | "customise"
  | "settings";

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

export interface Preferences {
  startFullscreen: boolean;
}

const CACHE_KEY = "cachedBuddy";
const PENDING_KEY = "pendingBuddyPatch";
const PREFS_KEY = "preferences";
const DEFAULT_PREFS: Preferences = { startFullscreen: true };
export const APP_VERSION = "0.1.0";

interface AppState {
  services: Services;
  screen: Screen;
  go: (s: Screen) => void;
  session: Session | null;
  buddy: BuddyProfile | null;
  /** Avatar shown in the persistent stage (overridden while previewing choices). */
  stageAvatarId: string | null;
  setPreviewAvatar: (id: string | null) => void;
  avatar: AvatarController;
  pendingEmail: string;
  setPendingEmail: (e: string) => void;
  notice: string | null;
  setNotice: (n: string | null) => void;
  saveStatus: SaveStatus;
  createBuddy: (input: NewBuddyInput) => Promise<{ existed: boolean }>;
  saveBuddy: (patch: BuddyPatch) => Promise<void>;
  afterSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  prefs: Preferences;
  setPrefs: (p: Preferences) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

export function AppProvider({ services, children }: { services: Services; children: ReactNode }) {
  const { client, store, buddies } = services;
  const [screen, setScreen] = useState<Screen>("booting");
  const [session, setSession] = useState<Session | null>(null);
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);
  const avatar = useMemo(() => new AvatarController(), []);
  const buddyRef = useRef<BuddyProfile | null>(null);
  buddyRef.current = buddy;

  const go = useCallback((s: Screen) => {
    setNotice(null);
    setScreen(s);
  }, []);

  const cacheBuddy = useCallback(
    async (b: BuddyProfile | null) => {
      setBuddy(b);
      if (b) await store.set(CACHE_KEY, b);
      else await store.delete(CACHE_KEY);
    },
    [store],
  );

  const loadBuddy = useCallback(async (): Promise<BuddyProfile | null> => {
    try {
      const b = await buddies.fetchMine();
      await cacheBuddy(b);
      return b;
    } catch (e) {
      const cached = await store.get<unknown>(CACHE_KEY);
      const parsed = buddyProfileSchema.safeParse(cached);
      if (parsed.success) {
        setBuddy(parsed.data);
        setSaveStatus("offline");
        return parsed.data;
      }
      throw e;
    }
  }, [buddies, cacheBuddy, store]);

  const afterSignIn = useCallback(async () => {
    const { data } = await client.auth.getSession();
    setSession(data.session);
    void registerDevice(client, store, APP_VERSION);
    const b = await loadBuddy();
    setScreen(b ? "home" : "create");
    if (b) avatar.play("wave");
  }, [avatar, client, loadBuddy, store]);

  // Boot: restore preferences and any persisted session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = { ...DEFAULT_PREFS, ...((await store.get<Preferences>(PREFS_KEY)) ?? {}) };
      if (cancelled) return;
      setPrefsState(saved);
      if (saved.startFullscreen) void setFullscreen(true);
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setScreen("welcome");
        return;
      }
      try {
        await afterSignIn();
      } catch {
        setNotice("We couldn't load your Buddy. Check your connection and sign in again.");
        setScreen("signIn");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") {
        void cacheBuddy(null);
        void store.delete(PENDING_KEY);
        setScreen((cur) => (cur === "booting" ? cur : "welcome"));
      }
    });
    return () => data.subscription.unsubscribe();
  }, [cacheBuddy, client, store]);

  const flushPending = useCallback(async () => {
    const pending = await store.get<BuddyPatch>(PENDING_KEY);
    const current = buddyRef.current;
    if (!pending || !current) return;
    setSaveStatus("saving");
    try {
      const updated = await buddies.update(current.id, pending);
      await store.delete(PENDING_KEY);
      await cacheBuddy(updated);
      setSaveStatus("saved");
    } catch {
      setSaveStatus(navigator.onLine ? "error" : "offline");
    }
  }, [buddies, cacheBuddy, store]);

  useEffect(() => {
    const onOnline = () => void flushPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushPending]);

  const saveBuddy = useCallback(
    async (patch: BuddyPatch) => {
      const current = buddyRef.current;
      if (!current) return;
      // Apply locally first so the change survives restarts even when offline.
      const optimistic = { ...current, ...patch };
      await cacheBuddy(optimistic);
      const pending = { ...((await store.get<BuddyPatch>(PENDING_KEY)) ?? {}), ...patch };
      await store.set(PENDING_KEY, pending);
      await flushPending();
    },
    [cacheBuddy, flushPending, store],
  );

  const createBuddy = useCallback(
    async (input: NewBuddyInput) => {
      const { buddy: b, existed } = await buddies.create(input);
      await cacheBuddy(b);
      setPreviewAvatar(null);
      setScreen("home");
      avatar.play("wave");
      return { existed };
    },
    [avatar, buddies, cacheBuddy],
  );

  const signOut = useCallback(async () => {
    await services.auth.signOut();
    await cacheBuddy(null);
    await store.delete(PENDING_KEY);
    setScreen("welcome");
  }, [cacheBuddy, services.auth, store]);

  const setPrefs = useCallback(
    async (p: Preferences) => {
      setPrefsState(p);
      await store.set(PREFS_KEY, p);
    },
    [store],
  );

  const value: AppState = {
    services,
    screen,
    go,
    session,
    buddy,
    stageAvatarId: previewAvatar ?? buddy?.avatarId ?? null,
    setPreviewAvatar,
    avatar,
    pendingEmail,
    setPendingEmail,
    notice,
    setNotice,
    saveStatus,
    createBuddy,
    saveBuddy,
    afterSignIn,
    signOut,
    prefs,
    setPrefs,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
