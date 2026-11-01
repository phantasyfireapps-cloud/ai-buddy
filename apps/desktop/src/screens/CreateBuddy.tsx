import { useEffect, useState } from "react";
import { AvatarPicker, PersonalityAdjuster, PersonalityPicker, VoicePicker } from "../components/BuddyEditor";
import { Button, FormError, PanelHeader, TextField } from "../components/ui";
import { DEFAULT_PRESET_ID, getPreset } from "../personality/registry";
import { defaultCustomisation } from "../personality/resolve";
import type { Customisation } from "../personality/schema";
import { buddyNameSchema, firstError } from "../lib/validation";
import { useApp } from "../state/AppContext";

const STEPS = ["Personality", "Name", "Look", "Voice", "Fine-tune"] as const;

export function CreateBuddy() {
  const { createBuddy, setPreviewAvatar, avatar, signOut } = useApp();
  const [step, setStep] = useState(0);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(getPreset(DEFAULT_PRESET_ID).avatar.defaultAvatarId);
  const [voiceId, setVoiceId] = useState(getPreset(DEFAULT_PRESET_ID).voice.profileId);
  const [customisation, setCustomisation] = useState<Customisation>(defaultCustomisation());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPreviewAvatar(avatarId);
  }, [avatarId, setPreviewAvatar]);

  const choosePreset = (id: string) => {
    const p = getPreset(id);
    setPresetId(id);
    setAvatarId(p.avatar.defaultAvatarId);
    setVoiceId(p.voice.profileId);
    setCustomisation(defaultCustomisation());
    avatar.play("smile", { durationMs: 1200 });
  };

  const next = () => {
    setError(null);
    if (STEPS[step] === "Name") {
      const err = firstError(buddyNameSchema.safeParse(name));
      if (err) return setError(err);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    setError(null);
    setBusy(true);
    try {
      await createBuddy({ name, presetId, avatarId, voiceId, customisation });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preset = getPreset(presetId);
  const displayName = name.trim() || "your Buddy";

  return (
    <section className="panel wide">
      <PanelHeader
        title={`Create your Buddy · ${STEPS[step]}`}
        subtitle={`Step ${step + 1} of ${STEPS.length}`}
        onBack={step > 0 ? () => setStep(step - 1) : undefined}
      />
      <ol className="steps" aria-hidden>
        {STEPS.map((s, i) => (
          <li key={s} className={i <= step ? "done" : ""} />
        ))}
      </ol>

      <div className="step-body">
        {STEPS[step] === "Personality" && <PersonalityPicker value={presetId} onChange={choosePreset} />}
        {STEPS[step] === "Name" && (
          <TextField label="What would you like to call your Buddy?" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={preset.name} autoFocus />
        )}
        {STEPS[step] === "Look" && <AvatarPicker value={avatarId} onChange={setAvatarId} />}
        {STEPS[step] === "Voice" && <VoicePicker value={voiceId} onChange={setVoiceId} sample={`Hello! I'm ${displayName}. ${preset.greetings[0]}`} />}
        {STEPS[step] === "Fine-tune" && <PersonalityAdjuster presetId={presetId} value={customisation} onChange={setCustomisation} />}
      </div>

      <FormError message={error} />
      <div className="row">
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Next</Button>
        ) : (
          <Button onClick={finish} busy={busy}>
            Meet {displayName}
          </Button>
        )}
        {step === 0 && (
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </section>
  );
}
