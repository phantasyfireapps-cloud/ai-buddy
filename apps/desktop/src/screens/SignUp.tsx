import { useState, type FormEvent } from "react";
import { Button, FormError, PanelHeader, TextField } from "../components/ui";
import { useApp } from "../state/AppContext";

export function SignUp() {
  const { go, services, setPendingEmail, avatar } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    avatar.play("think");
    try {
      await services.auth.signUp(email, password);
      setPendingEmail(email.trim().toLowerCase());
      avatar.play("smile", { durationMs: 1500 });
      go("verify");
    } catch (err) {
      avatar.play("idle");
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <PanelHeader title="Create your account" subtitle="Your account keeps your Buddy safe and lets you restore it on another device." onBack={() => go("welcome")} />
      <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 8 characters, with upper and lowercase letters and a number."
        required
      />
      <TextField label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <FormError message={error} />
      <Button type="submit" busy={busy}>
        Create Account
      </Button>
      <p className="switch">
        Already have a Buddy?{" "}
        <button type="button" className="link" onClick={() => go("signIn")}>
          Restore My Buddy
        </button>
      </p>
    </form>
  );
}
