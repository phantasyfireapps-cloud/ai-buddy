import { useEffect, useRef, useState } from "react";
import { AvatarPicker, PersonalityAdjuster, PersonalityPicker, VoicePicker } from "../components/BuddyEditor";
import { FormError, PanelHeader, TextField } from "../components/ui";
import type { BuddyPatch } from "../lib/buddyRepo";
import { buddyNameSchema, firstError } from "../lib/validation";
import { getPreset } from "../personality/registry";
import { useApp } from "../state/AppContext";

const TABS = ["Personality", "Name", "Look", "Voice", "Fine-tune"] as const;
const AUTOSAVE_MS = 700;

const STATUS_TEXT = { idle: "", saving: "Saving…", saved: "All changes saved", offline: "Saved on this device · will sync when online", error: "Couldn't save · will retry" };

export function Customise() {
  const { buddy, saveBuddy, saveStatus, go, setPreviewAvatar } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Personality");
  const [name, setName] = useState(buddy?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const pending = useRef<BuddyPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length) void saveBuddy(patch);
  };

  const queue = (patch: BuddyPatch) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  };

  useEffect(() => () => {
    flush();
    setPreviewAvatar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!buddy) return null;
  const view = { ...buddy, ...pending.current };

  return (
    <section className="panel wide">
      <PanelHeader title={`Customise ${buddy.name}`} subtitle={<span className={`save-status ${saveStatus}`}>{STATUS_TEXT[saveStatus]}</span>} onBack={() => { flush(); go("home"); }} />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="step-body">
        {tab === "Personality" && (
          <>
            <p className="hint">Changing personality keeps {buddy.name}'s name, look and voice. Fine-tune settings reset to the new personality's defaults.</p>
            <PersonalityPicker value={view.presetId} onChange={(presetId) => queue({ presetId, customisation: { ...view.customisation, adjustments: {}, catchphrases: { disabled: [] } } })} />
          </>
        )}
        {tab === "Name" && (
          <>
            <TextField
              label="Name"
              value={name}
              maxLength={40}
              onChange={(e) => {
                setName(e.target.value);
                const err = firstError(buddyNameSchema.safeParse(e.target.value));
                setNameError(err);
                if (!err) queue({ name: e.target.value.trim() });
              }}
            />
            <FormError message={nameError} />
          </>
        )}
        {tab === "Look" && (
          <AvatarPicker
            value={view.avatarId}
            onChange={(avatarId) => {
              setPreviewAvatar(avatarId);
              queue({ avatarId });
            }}
          />
        )}
        {tab === "Voice" && <VoicePicker value={view.voiceId} onChange={(voiceId) => queue({ voiceId })} sample={`Hello! I'm ${buddy.name}. ${getPreset(view.presetId).greetings[0]}`} />}
        {tab === "Fine-tune" && (
          <>
            <PersonalityAdjuster presetId={view.presetId} value={view.customisation} onChange={(customisation) => queue({ customisation })} />
            <label className="toggle">
              <input
                type="checkbox"
                checked={view.customisation.behaviour.greetOnLaunch}
                onChange={(e) => queue({ customisation: { ...view.customisation, behaviour: { ...view.customisation.behaviour, greetOnLaunch: e.target.checked } } })}
              />
              Greet me when AI Buddy starts
            </label>
          </>
        )}
      </div>
    </section>
  );
}
