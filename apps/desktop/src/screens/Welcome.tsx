import { useState } from "react";
import { Button, Notice } from "../components/ui";
import { openWifiSettings } from "../lib/desktop";
import { useApp } from "../state/AppContext";

export function Welcome() {
  const { go, notice, avatar } = useApp();
  const [wifiMsg, setWifiMsg] = useState<string | null>(null);

  return (
    <section className="panel welcome">
      <h1 className="hero">Hello! I'm your AI Buddy.</h1>
      <p className="lead">I'm here to keep you company, have a chat and make your day a little brighter. Let's get you set up.</p>
      <Notice message={notice ?? wifiMsg} />
      <div className="stack">
        <Button onClick={() => go("signUp")} onMouseEnter={() => avatar.play("smile", { durationMs: 1200 })}>
          Create Account
        </Button>
        <Button variant="secondary" onClick={() => go("signIn")}>
          Restore My Buddy
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            const ok = await openWifiSettings();
            if (!ok) setWifiMsg("Open your device's Wi-Fi settings to connect to the internet.");
          }}
        >
          Wi-Fi settings
        </Button>
      </div>
      <p className="fine-print">AI Buddy doesn't use your camera or microphone during setup.</p>
    </section>
  );
}
