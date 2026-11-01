import { describe, expect, it } from "vitest";
import { PRESETS, getPreset, parsePresets } from "./registry";
import { diffAdjustments, pickGreeting, resolvePersonality, timeOfDay } from "./resolve";
import { customisationSchema } from "./schema";
import { VOICES } from "./voices";
import { AVATARS } from "../avatar/avatars";

describe("personality presets", () => {
  it("loads the six required presets in order", () => {
    expect(PRESETS.map((p) => p.name)).toEqual(["Jolly Santa", "The Goth", "The Comedian", "The Butler", "The Rebel", "Gentle Companion"]);
  });

  it("every preset is versioned and references a known voice and avatar", () => {
    for (const p of PRESETS) {
      expect(p.version).toBeGreaterThanOrEqual(1);
      expect(VOICES.some((v) => v.id === p.voice.profileId)).toBe(true);
      expect(AVATARS.some((a) => a.id === p.avatar.defaultAvatarId)).toBe(true);
    }
  });

  it("Jolly Santa has the Ho ho ho catchphrase", () => {
    expect(getPreset("jolly-santa").identity.catchphrases).toContain("Ho ho ho!");
  });

  it("rejects invalid or duplicate presets", () => {
    const santa = getPreset("jolly-santa");
    expect(() => parsePresets([{ ...santa, version: 0 }])).toThrow();
    expect(() => parsePresets([santa, santa])).toThrow(/Duplicate/);
  });

  it("throws for unknown presets", () => {
    expect(() => getPreset("nope")).toThrow();
  });
});

describe("resolvePersonality", () => {
  const noon = new Date(2026, 0, 1, 12);
  const santa = getPreset("jolly-santa");

  it("uses preset defaults with no customisation", () => {
    const r = resolvePersonality(santa, undefined, { now: noon });
    expect(r.adjustments).toEqual(santa.defaults.adjustments);
    expect(r.activeCatchphrases).toEqual(["Ho ho ho!"]);
  });

  it("applies user customisation without modifying the preset", () => {
    const before = structuredClone(santa);
    const c = customisationSchema.parse({ adjustments: { humour: 10 }, catchphrases: { frequency: "never" } });
    const r = resolvePersonality(santa, c, { now: noon });
    expect(r.adjustments.humour).toBe(10);
    expect(r.adjustments.warmth).toBe(santa.defaults.adjustments.warmth);
    expect(r.activeCatchphrases).toEqual([]);
    expect(santa).toEqual(before);
  });

  it("applies temporary context on top and clamps to 0..100", () => {
    const r = resolvePersonality(santa, customisationSchema.parse({ adjustments: { energy: 95 } }), { now: noon, moodShift: { energy: 30 } });
    expect(r.adjustments.energy).toBe(100);
    const night = resolvePersonality(santa, undefined, { now: new Date(2026, 0, 1, 23) });
    expect(night.timeOfDay).toBe("night");
    expect(night.adjustments.energy).toBe(santa.defaults.adjustments.energy - 15);
  });

  it("rejects out-of-range customisation", () => {
    expect(() => customisationSchema.parse({ adjustments: { warmth: 150 } })).toThrow();
  });

  it("stores only differences from the preset", () => {
    expect(diffAdjustments(santa, { ...santa.defaults.adjustments, humour: 5 })).toEqual({ humour: 5 });
  });

  it("picks a greeting and maps time of day", () => {
    expect(santa.greetings).toContain(pickGreeting(resolvePersonality(santa), 0.99));
    expect(timeOfDay(new Date(2026, 0, 1, 8))).toBe("morning");
    expect(timeOfDay(new Date(2026, 0, 1, 18))).toBe("evening");
  });
});
