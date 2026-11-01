import { useEffect, useMemo } from "react";
import { Button } from "../components/ui";
import { getPreset } from "../personality/registry";
import { pickGreeting, resolvePersonality } from "../personality/resolve";
import { useApp } from "../state/AppContext";

export function Home() {
  const { buddy, go, avatar, saveStatus } = useApp();
  const greeting = useMemo(() => {
    if (!buddy) return "";
    return pickGreeting(resolvePersonality(getPreset(buddy.presetId), buddy.customisation));
  }, [buddy]);

  useEffect(() => {
    if (!buddy?.customisation.behaviour.greetOnLaunch) return;
    avatar.play("speak", { durationMs: Math.min(4000, greeting.length * 60) });
  }, [avatar, buddy, greeting]);

  if (!buddy) return null;
  const preset = getPreset(buddy.presetId);

  return (
    <section className="panel home">
      <p className="speech-bubble" aria-live="polite">
        {greeting}
      </p>
      <h1 className="hero">{buddy.name}</h1>
      <p className="lead">{preset.name} · {preset.tagline}</p>
      {saveStatus === "offline" && <p className="notice">You're offline. Changes will sync when you reconnect.</p>}
      <div className="stack">
        <Button onClick={() => go("customise")}>Customise {buddy.name}</Button>
        <Button variant="secondary" onClick={() => go("settings")}>
          Settings & privacy
        </Button>
      </div>
      <p className="fine-print">Conversations with {buddy.name} are coming in the next update.</p>
    </section>
  );
}
