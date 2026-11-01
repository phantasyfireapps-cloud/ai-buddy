import { z } from "zod";

export const ADJUSTMENT_KEYS = ["warmth", "humour", "formality", "energy", "chattiness"] as const;
export type AdjustmentKey = (typeof ADJUSTMENT_KEYS)[number];

const level = z.number().int().min(0).max(100);

export const adjustmentsSchema = z.object({
  warmth: level,
  humour: level,
  formality: level,
  energy: level,
  chattiness: level,
});
export type Adjustments = z.infer<typeof adjustmentsSchema>;

export const catchphraseFrequencySchema = z.enum(["never", "rare", "occasional", "frequent"]);
export type CatchphraseFrequency = z.infer<typeof catchphraseFrequencySchema>;

export const presetIdSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);

/** Layer 1: permanent identity. Shipped with the app and stored in `personality_presets`. Never edited by users. */
export const personalityPresetSchema = z.object({
  $schema: z.string().optional(),
  id: presetIdSchema,
  version: z.number().int().positive(),
  name: z.string().min(1).max(60),
  tagline: z.string().min(1).max(140),
  identity: z.object({
    traits: z.array(z.string()).min(1),
    speakingStyle: z.string(),
    humour: z.string(),
    values: z.array(z.string()),
    laughStyle: z.string(),
    catchphrases: z.array(z.string()),
    expressions: z.array(z.string()),
    gestures: z.array(z.string()),
  }),
  defaults: z.object({
    adjustments: adjustmentsSchema,
    catchphraseFrequency: catchphraseFrequencySchema,
  }),
  voice: z.object({ profileId: z.string() }),
  avatar: z.object({ defaultAvatarId: z.string() }),
  greetings: z.array(z.string()).min(1),
  behaviour: z.record(z.string(), z.unknown()).optional(),
});
export type PersonalityPreset = z.infer<typeof personalityPresetSchema>;

/** Layer 2: user-approved customisation. Stored per Buddy in `buddy_personality_settings`. */
export const customisationSchema = z.object({
  adjustments: adjustmentsSchema.partial().default({}),
  catchphrases: z
    .object({
      frequency: catchphraseFrequencySchema.optional(),
      disabled: z.array(z.string()).default([]),
    })
    .default({ disabled: [] }),
  behaviour: z
    .object({
      greetOnLaunch: z.boolean().default(true),
    })
    .default({ greetOnLaunch: true }),
});
export type Customisation = z.infer<typeof customisationSchema>;

/** Layer 3: temporary, context-sensitive behaviour. Computed at runtime and never persisted. */
export interface RuntimeContext {
  now?: Date;
  /** Nudges applied on top of the user's settings, e.g. calmer late at night. */
  moodShift?: Partial<Adjustments>;
}

export interface EffectivePersonality {
  preset: PersonalityPreset;
  adjustments: Adjustments;
  catchphraseFrequency: CatchphraseFrequency;
  activeCatchphrases: string[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  greetOnLaunch: boolean;
}
