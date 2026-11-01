import { useState, type FormEvent } from "react";
import { Button, FormError, Notice, PanelHeader, TextField } from "../components/ui";
import { useApp } from "../state/AppContext";

export function VerifyEmail() {
  const { go, services, pendingEmail, afterSignIn, avatar } = useApp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await services.auth.verifySignupCode(pendingEmail, code);
      avatar.play("wave");
      await afterSignIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await services.auth.resendSignupCode(pendingEmail);
      setInfo("We've sent a new code.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <PanelHeader title="Check your email" subtitle={<>We sent a 6-digit code to <strong>{pendingEmail}</strong>. Enter it below to verify your account.</>} onBack={() => go("signUp")} />
      <TextField label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="otp" />
      <FormError message={error} />
      <Notice message={info} />
      <Button type="submit" busy={busy}>
        Verify
      </Button>
      <Button type="button" variant="ghost" onClick={resend}>
        Send a new code
      </Button>
      <Button type="button" variant="ghost" onClick={() => go("signIn")}>
        Got a link instead? Click it, then sign in
      </Button>
    </form>
  );
}
