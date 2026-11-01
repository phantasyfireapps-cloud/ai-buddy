/**
 * End-to-end account + Buddy tests against a real Supabase (local `supabase start`).
 * Skipped unless SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY are set. MAILPIT_URL reads verification codes.
 */
import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createAuthService, type AuthService } from "../../src/lib/auth";
import { createBuddyRepo } from "../../src/lib/buddyRepo";
import { createSupabase } from "../../src/lib/supabase";
import { defaultCustomisation } from "../../src/personality/resolve";

const URL = process.env.SUPABASE_TEST_URL;
const KEY = process.env.SUPABASE_TEST_ANON_KEY;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const PASSWORD = "GoodPass123";

function memoryStorage(): SupportedStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const body = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const msg = body.messages?.find((m) => new Date(m.Created).getTime() >= after - 1000);
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string };
      const code = full.Text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No code emailed to ${email}`);
}

function newInstall() {
  const storage = memoryStorage();
  const client = createSupabase(URL!, KEY!, storage);
  return { storage, client, auth: createAuthService(client), buddies: createBuddyRepo(client) };
}

async function registerVerified(): Promise<{ email: string; install: ReturnType<typeof newInstall> }> {
  const email = `buddy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const install = newInstall();
  const t = Date.now();
  const { needsVerification } = await install.auth.signUp(email, PASSWORD);
  expect(needsVerification).toBe(true);
  await install.auth.verifySignupCode(email, await latestCode(email, t));
  return { email, install };
}

const input = () => ({ name: "Nick", presetId: "jolly-santa", avatarId: "santa", voiceId: "deep-warm", customisation: defaultCustomisation() });

describe.skipIf(!URL || !KEY)("accounts and Buddy profiles (Supabase)", () => {
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = createClient(URL!, KEY!, { auth: { persistSession: false } });
  });

  it("rejects weak passwords and invalid emails before calling the server", async () => {
    const { auth } = newInstall();
    await expect(auth.signUp("not-an-email", PASSWORD)).rejects.toThrow(/valid email/);
    await expect(auth.signUp("a@example.com", "weak")).rejects.toThrow(/8 characters/);
  });

  it("requires email verification before sign-in", async () => {
    const email = `unverified-${Date.now()}@example.com`;
    const { auth } = newInstall();
    await auth.signUp(email, PASSWORD);
    await expect(auth.signIn(email, PASSWORD)).rejects.toMatchObject({ code: "email_not_confirmed" });
  });

  it("rejects a wrong verification code", async () => {
    const email = `wrongcode-${Date.now()}@example.com`;
    const { auth } = newInstall();
    await auth.signUp(email, PASSWORD);
    await expect(auth.verifySignupCode(email, "000000")).rejects.toThrow();
  });

  it("registers, verifies, creates a Buddy, persists the session and restores on another device without duplicates", async () => {
    const { email, install } = await registerVerified();
    const { data } = await install.client.auth.getSession();
    expect(data.session?.user.email).toBe(email);
    expect(await install.buddies.fetchMine()).toBeNull();

    const custom = { ...defaultCustomisation(), adjustments: { humour: 20 }, catchphrases: { frequency: "rare" as const, disabled: [] } };
    const { buddy, existed } = await install.buddies.create({ ...input(), customisation: custom });
    expect(existed).toBe(false);
    expect(buddy).toMatchObject({ name: "Nick", presetId: "jolly-santa", presetVersion: 1, avatarId: "santa", voiceId: "deep-warm" });
    expect(buddy.customisation.adjustments).toEqual({ humour: 20 });

    // "Restart": a new client over the same persisted storage restores the session silently.
    const restarted = createSupabase(URL!, KEY!, install.storage);
    const { data: restored } = await restarted.auth.getSession();
    expect(restored.session?.user.id).toBe(buddy.ownerId);
    expect((await createBuddyRepo(restarted).fetchMine())?.id).toBe(buddy.id);

    // Second installation signs in and gets the same Buddy.
    const other = newInstall();
    await other.auth.signIn(email, PASSWORD);
    const again = await other.buddies.fetchMine();
    expect(again).toMatchObject({ id: buddy.id, name: "Nick", customisation: { adjustments: { humour: 20 }, catchphrases: { frequency: "rare" } } });

    // Running the creation flow again must not create a duplicate.
    const dup = await other.buddies.create({ ...input(), name: "Duplicate" });
    expect(dup.existed).toBe(true);
    expect(dup.buddy.id).toBe(buddy.id);
    expect(dup.buddy.name).toBe("Nick");

    // Autosave-style update is visible from the first device.
    await other.buddies.update(buddy.id, { name: "Saint Nick", avatarId: "gentle", customisation: { ...custom, adjustments: { warmth: 50 } } });
    const synced = await install.buddies.fetchMine();
    expect(synced).toMatchObject({ name: "Saint Nick", avatarId: "gentle", customisation: { adjustments: { warmth: 50 } } });

    await install.auth.signOut();
    expect((await install.client.auth.getSession()).data.session).toBeNull();
    expect(install.storage.map.size).toBe(0);
  });

  it("enforces row-level security between accounts", async () => {
    const a = await registerVerified();
    const b = await registerVerified();
    const { buddy } = await a.install.buddies.create(input());

    expect(await b.install.buddies.fetchMine()).toBeNull();
    const { data: rows } = await b.install.client.from("buddies").select("id").eq("id", buddy.id);
    expect(rows).toEqual([]);
    await b.install.client.from("buddies").update({ name: "Hacked" }).eq("id", buddy.id);
    await b.install.client.from("buddy_personality_settings").upsert({ buddy_id: buddy.id, adjustments: { warmth: 0 } });
    const { error: insertErr } = await b.install.client.from("buddies").insert({ owner_id: buddy.ownerId, name: "x", preset_id: "the-goth", preset_version: 1, avatar_id: "goth" });
    expect(insertErr).not.toBeNull();
    expect((await a.install.buddies.fetchMine())?.name).toBe("Nick");
    expect((await a.install.buddies.fetchMine())?.customisation.adjustments).toEqual({});

    // Anonymous users can read the catalogue but nothing personal, and cannot modify presets.
    expect((await anon.from("personality_presets").select("id")).data).toHaveLength(6);
    expect((await anon.from("buddies").select("id")).data ?? []).toEqual([]);
    const { error: presetErr } = await a.install.client.from("personality_presets").update({ name: "x" }).eq("id", "the-goth");
    const { data: goth } = await anon.from("personality_presets").select("name").eq("id", "the-goth").single();
    expect(presetErr !== null || goth?.name === "The Goth").toBe(true);
    expect(goth?.name).toBe("The Goth");
  });

  it("registers devices per installation", async () => {
    const { install } = await registerVerified();
    const installationId = crypto.randomUUID();
    for (let i = 0; i < 2; i++) {
      const { error } = await install.client.from("devices").upsert({ installation_id: installationId, device_type: "windows-desktop", operating_system: "windows" }, { onConflict: "owner_id,installation_id" });
      expect(error).toBeNull();
    }
    expect((await install.client.from("devices").select("id")).data).toHaveLength(1);
  });

  it("resets a forgotten password with an emailed code", async () => {
    const { email } = await registerVerified();
    const device = newInstall();
    const t = Date.now();
    await device.auth.requestPasswordReset(email);
    await device.auth.resetPasswordWithCode(email, await latestCode(email, t), "NewPass456");
    const fresh: AuthService = newInstall().auth;
    await expect(fresh.signIn(email, PASSWORD)).rejects.toMatchObject({ code: "invalid_credentials" });
    await fresh.signIn(email, "NewPass456");
  });

  it("changes password after confirming the current one, and deletes the account", async () => {
    const { email, install } = await registerVerified();
    await install.buddies.create(input());
    await expect(install.auth.confirmPassword("WrongPass999")).rejects.toThrow();
    await install.auth.confirmPassword(PASSWORD);
    await install.auth.changePassword("Changed789A");
    await newInstall().auth.signIn(email, "Changed789A");

    await install.auth.deleteAccount();
    await expect(newInstall().auth.signIn(email, "Changed789A")).rejects.toMatchObject({ code: "invalid_credentials" });
  });
});
