import { z } from "zod";
import voicesJson from "../../../../presets/voices.json";

export const voiceProfileSchema = z.object({
  id: z.string(),
  label: z.string(),
  pitch: z.number().min(0).max(2),
  rate: z.number().min(0.1).max(10),
  preferredGender: z.enum(["male", "female", "any"]),
});
export type VoiceProfile = z.infer<typeof voiceProfileSchema>;

export const VOICES: VoiceProfile[] = z
  .object({ version: z.number(), voices: z.array(voiceProfileSchema) })
  .parse(voicesJson).voices;

export function getVoice(id: string): VoiceProfile {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}

const FEMALE_HINTS = /zira|hazel|susan|female|woman|libby|sonia|aria|jenny/i;
const MALE_HINTS = /david|mark|george|male|man|ryan|guy|thomas/i;

/** Speaks a short preview using the OS text-to-speech voices. No microphone involved. */
export function previewVoice(profile: VoiceProfile, text: string, onEnd?: () => void): (() => void) | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = profile.pitch;
  u.rate = profile.rate;
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const hint = profile.preferredGender === "female" ? FEMALE_HINTS : profile.preferredGender === "male" ? MALE_HINTS : null;
  u.voice = (hint && voices.find((v) => hint.test(v.name))) || voices[0] || null;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
  return () => synth.cancel();
}
