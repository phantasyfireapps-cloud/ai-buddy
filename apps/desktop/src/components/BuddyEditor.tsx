import { useEffect, useRef, useState } from "react";
import { Avatar } from "../avatar/Avatar";
import { STARTER_AVATARS } from "../avatar/avatars";
import { PRESETS, getPreset } from "../personality/registry";
import { ADJUSTMENT_KEYS, type AdjustmentKey, type Adjustments, type CatchphraseFrequency, type Customisation } from "../personality/schema";
import { resolvePersonality } from "../personality/resolve";
import { VOICES, getVoice, previewVoice } from "../personality/voices";
import { useApp } from "../state/AppContext";

export function PersonalityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Personality">
      {PRESETS.map((p) => (
        <button key={p.id} role="radio" aria-checked={value === p.id} className={`choice ${value === p.id ? "selected" : ""}`} onClick={() => onChange(p.id)}>
          <Avatar avatarId={p.avatar.defaultAvatarId} className="choice-avatar" title={p.name} />
          <strong>{p.name}</strong>
          <span>{p.tagline}</span>
        </button>
      ))}
    </div>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="choice-grid compact" role="radiogroup" aria-label="Avatar">
      {STARTER_AVATARS.map((a) => (
        <button key={a.id} role="radio" aria-checked={value === a.id} className={`choice ${value === a.id ? "selected" : ""}`} onClick={() => onChange(a.id)}>
          <Avatar avatarId={a.id} className="choice-avatar" title={a.name} />
          <strong>{a.name}</strong>
        </button>
      ))}
    </div>
  );
}

export function VoicePicker({ value, onChange, sample }: { value: string; onChange: (id: string) => void; sample: string }) {
  const { avatar } = useApp();
  const stopRef = useRef<(() => void) | null>(null);
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  useEffect(() => () => stopRef.current?.(), []);

  const preview = (id: string) => {
    stopRef.current?.();
    avatar.play("speak");
    stopRef.current = previewVoice(getVoice(id), sample, () => avatar.play("idle"));
    if (!stopRef.current) setTimeout(() => avatar.play("idle"), 1500);
  };

  return (
    <div className="voice-list" role="radiogroup" aria-label="Voice">
      {VOICES.map((v) => (
        <div key={v.id} className={`voice-row ${value === v.id ? "selected" : ""}`}>
          <button role="radio" aria-checked={value === v.id} className="voice-select" onClick={() => onChange(v.id)}>
            {v.label}
          </button>
          {supported && (
            <button className="btn btn-ghost" onClick={() => preview(v.id)} aria-label={`Preview ${v.label}`}>
              ▶ Preview
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const LABELS: Record<AdjustmentKey, [string, string, string]> = {
  warmth: ["Warmth", "Reserved", "Very warm"],
  humour: ["Humour", "Serious", "Hilarious"],
  formality: ["Formality", "Casual", "Very formal"],
  energy: ["Energy", "Calm", "Lively"],
  chattiness: ["Chattiness", "Brief", "Chatty"],
};

const FREQUENCIES: { id: CatchphraseFrequency; label: string }[] = [
  { id: "never", label: "Never" },
  { id: "rare", label: "Rarely" },
  { id: "occasional", label: "Sometimes" },
  { id: "frequent", label: "Often" },
];

export function PersonalityAdjuster({ presetId, value, onChange }: { presetId: string; value: Customisation; onChange: (c: Customisation) => void }) {
  const preset = getPreset(presetId);
  const effective = resolvePersonality(preset, value, { now: new Date(2000, 0, 1, 12) });

  const setAdj = (key: AdjustmentKey, n: number) => {
    const adjustments: Partial<Adjustments> = { ...value.adjustments, [key]: n };
    if (n === preset.defaults.adjustments[key]) delete adjustments[key];
    onChange({ ...value, adjustments });
  };

  return (
    <div className="adjuster">
      {ADJUSTMENT_KEYS.map((key) => (
        <label key={key} className="slider">
          <span className="slider-label">
            {LABELS[key][0]} <em>{effective.adjustments[key]}</em>
          </span>
          <input type="range" min={0} max={100} step={5} value={effective.adjustments[key]} onChange={(e) => setAdj(key, Number(e.target.value))} aria-label={LABELS[key][0]} />
          <span className="slider-ends">
            <small>{LABELS[key][1]}</small>
            <small>{LABELS[key][2]}</small>
          </span>
        </label>
      ))}
      {preset.identity.catchphrases.length > 0 && (
        <fieldset className="catchphrases">
          <legend>Catchphrases ({preset.identity.catchphrases.map((c) => `“${c}”`).join(", ")})</legend>
          <div className="segmented" role="radiogroup" aria-label="Catchphrase frequency">
            {FREQUENCIES.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={effective.catchphraseFrequency === f.id}
                className={effective.catchphraseFrequency === f.id ? "selected" : ""}
                onClick={() => onChange({ ...value, catchphrases: { ...value.catchphrases, frequency: f.id } })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <button className="btn btn-ghost" onClick={() => onChange({ ...value, adjustments: {}, catchphrases: { disabled: [] } })}>
        Reset to {preset.name} defaults
      </button>
    </div>
  );
}
