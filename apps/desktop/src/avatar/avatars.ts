import { z } from "zod";
import avatarsJson from "../../../../presets/avatars.json";

export const appearanceSchema = z.object({
  skin: z.string(),
  hair: z.string(),
  hairStyle: z.enum(["short", "beard", "long", "curly", "neat", "mohawk", "bob"]),
  eyes: z.string(),
  outfit: z.string(),
  accessory: z.enum(["none", "santa-hat", "choker", "bow-tie-spotty", "bow-tie", "bandana", "glasses"]),
  background: z.string(),
  cheeks: z.string().optional(),
  lips: z.string().optional(),
  eyeliner: z.boolean().optional(),
  moustache: z.boolean().optional(),
});
export type Appearance = z.infer<typeof appearanceSchema>;

export const avatarDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetRef: z.string(),
  appearance: appearanceSchema,
  animation: z.object({
    blinkIntervalMs: z.tuple([z.number().positive(), z.number().positive()]),
    idleAmplitude: z.number().min(0).max(3),
    renderer: z.literal("svg-2d"),
  }),
});
export type AvatarDefinition = z.infer<typeof avatarDefinitionSchema>;

export const AVATARS: AvatarDefinition[] = z
  .object({ version: z.number(), avatars: z.array(avatarDefinitionSchema) })
  .parse(avatarsJson).avatars;

export const DEFAULT_AVATAR_ID = "buddy";
export const STARTER_AVATARS = AVATARS.filter((a) => a.id !== DEFAULT_AVATAR_ID);

export function getAvatar(id: string | null | undefined): AvatarDefinition {
  return AVATARS.find((a) => a.id === id) ?? AVATARS.find((a) => a.id === DEFAULT_AVATAR_ID)!;
}
