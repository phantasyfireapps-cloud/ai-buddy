import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { customisationSchema, type Customisation } from "../personality/schema";
import { getPreset } from "../personality/registry";
import { buddyNameSchema } from "./validation";

export const buddyProfileSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  presetId: z.string(),
  presetVersion: z.number().int(),
  avatarId: z.string(),
  voiceId: z.string(),
  customisation: customisationSchema,
  updatedAt: z.string(),
});
export type BuddyProfile = z.infer<typeof buddyProfileSchema>;

export interface NewBuddyInput {
  name: string;
  presetId: string;
  avatarId: string;
  voiceId: string;
  customisation: Customisation;
}

export type BuddyPatch = Partial<Pick<BuddyProfile, "name" | "presetId" | "avatarId" | "voiceId" | "customisation">>;

interface BuddyRow {
  id: string;
  owner_id: string;
  name: string;
  preset_id: string;
  preset_version: number;
  avatar_id: string;
  voice_preference: { voiceId?: string } | null;
  updated_at: string;
  buddy_personality_settings:
    | { adjustments: unknown; catchphrase_preferences: unknown; behaviour_settings: unknown }
    | { adjustments: unknown; catchphrase_preferences: unknown; behaviour_settings: unknown }[]
    | null;
}

const SELECT = "id, owner_id, name, preset_id, preset_version, avatar_id, voice_preference, updated_at, buddy_personality_settings(adjustments, catchphrase_preferences, behaviour_settings)";

function toProfile(row: BuddyRow): BuddyProfile {
  const s = Array.isArray(row.buddy_personality_settings) ? row.buddy_personality_settings[0] : row.buddy_personality_settings;
  return buddyProfileSchema.parse({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    presetId: row.preset_id,
    presetVersion: row.preset_version,
    avatarId: row.avatar_id,
    voiceId: row.voice_preference?.voiceId ?? getPreset(row.preset_id).voice.profileId,
    customisation: customisationSchema.parse({
      adjustments: s?.adjustments ?? {},
      catchphrases: s?.catchphrase_preferences ?? {},
      behaviour: s?.behaviour_settings ?? {},
    }),
    updatedAt: row.updated_at,
  });
}

function settingsRow(buddyId: string, c: Customisation) {
  const parsed = customisationSchema.parse(c);
  return {
    buddy_id: buddyId,
    adjustments: parsed.adjustments,
    catchphrase_preferences: parsed.catchphrases,
    behaviour_settings: parsed.behaviour,
  };
}

export class BuddyRepoError extends Error {}

export function createBuddyRepo(client: SupabaseClient) {
  async function fetchMine(): Promise<BuddyProfile | null> {
    const { data, error } = await client.from("buddies").select(SELECT).maybeSingle<BuddyRow>();
    if (error) throw new BuddyRepoError(`Couldn't load your Buddy: ${error.message}`);
    return data ? toProfile(data) : null;
  }

  return {
    fetchMine,

    /**
     * Creates the account's Buddy. If one already exists (e.g. created on another device), the existing
     * Buddy is returned unchanged instead of creating a duplicate.
     */
    async create(input: NewBuddyInput): Promise<{ buddy: BuddyProfile; existed: boolean }> {
      const name = buddyNameSchema.parse(input.name);
      const preset = getPreset(input.presetId);
      const { data, error } = await client
        .from("buddies")
        .insert({
          name,
          preset_id: preset.id,
          preset_version: preset.version,
          avatar_id: input.avatarId,
          voice_preference: { voiceId: input.voiceId },
        })
        .select("id")
        .single<{ id: string }>();

      if (error) {
        if (error.code === "23505") {
          const existing = await fetchMine();
          if (existing) return { buddy: existing, existed: true };
        }
        throw new BuddyRepoError(`Couldn't save your Buddy: ${error.message}`);
      }

      const { error: sErr } = await client.from("buddy_personality_settings").upsert(settingsRow(data.id, input.customisation));
      if (sErr) throw new BuddyRepoError(`Couldn't save your Buddy's personality: ${sErr.message}`);
      const buddy = await fetchMine();
      if (!buddy) throw new BuddyRepoError("Your Buddy was saved but couldn't be loaded.");
      return { buddy, existed: false };
    },

    async update(buddyId: string, patch: BuddyPatch): Promise<BuddyProfile> {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = buddyNameSchema.parse(patch.name);
      if (patch.presetId !== undefined) {
        const preset = getPreset(patch.presetId);
        row.preset_id = preset.id;
        row.preset_version = preset.version;
      }
      if (patch.avatarId !== undefined) row.avatar_id = patch.avatarId;
      if (patch.voiceId !== undefined) row.voice_preference = { voiceId: patch.voiceId };

      if (Object.keys(row).length) {
        const { error } = await client.from("buddies").update(row).eq("id", buddyId);
        if (error) throw new BuddyRepoError(`Couldn't save changes: ${error.message}`);
      }
      if (patch.customisation) {
        const { error } = await client.from("buddy_personality_settings").upsert(settingsRow(buddyId, patch.customisation));
        if (error) throw new BuddyRepoError(`Couldn't save personality changes: ${error.message}`);
      }
      const buddy = await fetchMine();
      if (!buddy) throw new BuddyRepoError("Your Buddy couldn't be found.");
      return buddy;
    },
  };
}

export type BuddyRepo = ReturnType<typeof createBuddyRepo>;
