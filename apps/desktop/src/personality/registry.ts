import { personalityPresetSchema, type PersonalityPreset } from "./schema";

const modules = import.meta.glob("../../../../presets/personalities/*.json", {
  eager: true,
  import: "default",
});

export function parsePresets(raw: unknown[]): PersonalityPreset[] {
  const presets = raw.map((r) => personalityPresetSchema.parse(r));
  const ids = new Set<string>();
  for (const p of presets) {
    if (ids.has(p.id)) throw new Error(`Duplicate personality preset id: ${p.id}`);
    ids.add(p.id);
  }
  return presets;
}

export const PRESET_ORDER = [
  "jolly-santa",
  "the-goth",
  "the-comedian",
  "the-butler",
  "the-rebel",
  "gentle-companion",
];

export const PRESETS: PersonalityPreset[] = parsePresets(Object.values(modules)).sort(
  (a, b) => PRESET_ORDER.indexOf(a.id) - PRESET_ORDER.indexOf(b.id),
);

export function getPreset(id: string): PersonalityPreset {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown personality preset: ${id}`);
  return preset;
}

export const DEFAULT_PRESET_ID = "gentle-companion";
