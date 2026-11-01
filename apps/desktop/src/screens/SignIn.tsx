import { useState, type FormEvent } from "react";
import { Button, FormError, Notice, PanelHeader, TextField } from "../components/ui";
import { AuthFlowError } from "../lib/auth";
import { useApp } from "../state/AppContext";

export function SignIn() {
  const { go, services, afterSignIn, setPendingEmail, notice, avatar } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    avatar.play("think");
    try {
      await services.auth.signIn(email, password);
      await afterSignIn();
    } catch (err) {
      avatar.play("idle");
      if (err instanceof AuthFlowError && err.code === "email_not_confirmed") {
        setPendingEmail(email.trim().toLowerCase());
        await services.auth.resendSignupCode(email).catch(() => undefined);
        go("verify");
        return;
      }
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <PanelHeader title="Restore my Buddy" subtitle="Sign in to bring your Buddy to this device." onBack={() => go("welcome")} />
      <Notice message={notice} />
      <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <FormError message={error} />
      <Button type="submit" busy={busy}>
        Sign in
      </Button>
      <button
        type="button"
        className="link"
        onClick={() => {
          setPendingEmail(email.trim().toLowerCase());
          go("forgot");
        }}
      >
        Forgot your password?
      </button>
      <p className="switch">
        New here?{" "}
        <button type="button" className="link" onClick={() => go("signUp")}>
          Create Account
        </button>
      </p>
    </form>
  );
}
