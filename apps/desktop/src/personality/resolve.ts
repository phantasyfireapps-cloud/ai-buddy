import {
  ADJUSTMENT_KEYS,
  customisationSchema,
  type Adjustments,
  type Customisation,
  type EffectivePersonality,
  type PersonalityPreset,
  type RuntimeContext,
} from "./schema";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function timeOfDay(d: Date): EffectivePersonality["timeOfDay"] {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

export function defaultCustomisation(): Customisation {
  return customisationSchema.parse({});
}

/** Combines the three layers without mutating any of them. */
export function resolvePersonality(
  preset: PersonalityPreset,
  customisation: Customisation = defaultCustomisation(),
  context: RuntimeContext = {},
): EffectivePersonality {
  const custom = customisationSchema.parse(customisation);
  const now = context.now ?? new Date();
  const tod = timeOfDay(now);

  const adjustments = {} as Adjustments;
  for (const key of ADJUSTMENT_KEYS) {
    const base = custom.adjustments[key] ?? preset.defaults.adjustments[key];
    adjustments[key] = clamp(base + (context.moodShift?.[key] ?? 0));
  }
  if (tod === "night" && context.moodShift?.energy === undefined) {
    adjustments.energy = clamp(adjustments.energy - 15);
  }

  const catchphraseFrequency = custom.catchphrases.frequency ?? preset.defaults.catchphraseFrequency;
  const disabled = new Set(custom.catchphrases.disabled);
  const activeCatchphrases =
    catchphraseFrequency === "never" ? [] : preset.identity.catchphrases.filter((c) => !disabled.has(c));

  return {
    preset,
    adjustments,
    catchphraseFrequency,
    activeCatchphrases,
    timeOfDay: tod,
    greetOnLaunch: custom.behaviour.greetOnLaunch,
  };
}

/** Returns only the values that differ from the preset, so presets can evolve without clobbering user choices. */
export function diffAdjustments(preset: PersonalityPreset, values: Adjustments): Partial<Adjustments> {
  const out: Partial<Adjustments> = {};
  for (const key of ADJUSTMENT_KEYS) {
    if (values[key] !== preset.defaults.adjustments[key]) out[key] = clamp(values[key]);
  }
  return out;
}

export function pickGreeting(p: EffectivePersonality, seed = Math.random()): string {
  const list = p.preset.greetings;
  return list[Math.floor(seed * list.length) % list.length];
}
