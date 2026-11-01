import { useEffect, useState } from "react";
import { Button, FormError, Notice, PanelHeader, TextField } from "../components/ui";
import { getAutostart, isFullscreen, openWifiSettings, quitApp, setAutostart, setFullscreen, showWindowsDesktop } from "../lib/desktop";
import { isTauri } from "../lib/platform";
import { useApp } from "../state/AppContext";

export function Settings() {
  const { go, session, services, signOut, prefs, setPrefs } = useApp();
  const [autostart, setAutostartState] = useState(false);
  const [full, setFull] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "password" | "delete">("none");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const desktop = isTauri();

  useEffect(() => {
    void getAutostart().then(setAutostartState);
    void isFullscreen().then(setFull);
  }, []);

  const guard = async (fn: () => Promise<void>, success?: string) => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await fn();
      if (success) setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel wide settings">
      <PanelHeader title="Settings & privacy" onBack={() => go("home")} />
      <Notice message={message} />
      <FormError message={error} />

      <h2>This device</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={autostart}
          disabled={!desktop}
          onChange={(e) => guard(async () => {
            await setAutostart(e.target.checked);
            setAutostartState(await getAutostart());
          })}
        />
        Launch AI Buddy when Windows starts
      </label>
      <label className="toggle">
        <input type="checkbox" checked={prefs.startFullscreen} onChange={(e) => void setPrefs({ ...prefs, startFullscreen: e.target.checked })} />
        Open in full screen
      </label>
      <div className="row">
        <Button variant="secondary" onClick={() => guard(async () => { await setFullscreen(!full); setFull(await isFullscreen()); })}>
          {full ? "Exit full screen" : "Go full screen"}
        </Button>
        <Button variant="secondary" onClick={() => void showWindowsDesktop()}>
          Show Windows desktop
        </Button>
        <Button variant="secondary" onClick={() => guard(async () => { if (!(await openWifiSettings())) setMessage("Open your device's Wi-Fi settings to connect."); })}>
          Wi-Fi settings
        </Button>
        <Button variant="ghost" onClick={() => void quitApp()}>
          Close AI Buddy
        </Button>
      </div>

      <h2>Privacy</h2>
      <ul className="privacy-list">
        <li>Camera: <strong>off</strong>. AI Buddy doesn't use your camera yet.</li>
        <li>Microphone: <strong>off</strong>. AI Buddy doesn't listen yet.</li>
        <li>Stored in your account: your email, your Buddy's name, look, voice and personality settings, and a list of devices you've signed in on.</li>
        <li>Your password is handled only by our sign-in provider and is never stored by AI Buddy or shared with any AI.</li>
        <li>On this device, your sign-in is encrypted so only your Windows user account can read it.</li>
      </ul>

      <h2>Account</h2>
      <p>Signed in as <strong>{session?.user.email}</strong></p>
      <div className="row">
        <Button variant="secondary" onClick={() => setPanel(panel === "password" ? "none" : "password")}>Change password</Button>
        <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
        <Button variant="danger" onClick={() => setPanel(panel === "delete" ? "none" : "delete")}>Delete account</Button>
      </div>

      {panel === "password" && (
        <div className="subpanel">
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters, with upper and lowercase letters and a number." />
          <Button
            busy={busy}
            onClick={() => guard(async () => {
              await services.auth.confirmPassword(current);
              await services.auth.changePassword(next);
              setCurrent("");
              setNext("");
              setPanel("none");
            }, "Your password has been changed.")}
          >
            Save new password
          </Button>
        </div>
      )}

      {panel === "delete" && (
        <div className="subpanel danger">
          <p>This permanently deletes your account and your Buddy from every device. This can't be undone.</p>
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <TextField label='Type "DELETE" to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <Button
            variant="danger"
            busy={busy}
            disabled={confirmText !== "DELETE"}
            onClick={() => guard(async () => {
              await services.auth.confirmPassword(current);
              await services.auth.deleteAccount();
              await signOut().catch(() => undefined);
            })}
          >
            Permanently delete my account
          </Button>
        </div>
      )}
    </section>
  );
}
