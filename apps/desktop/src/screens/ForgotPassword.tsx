import { useState, type FormEvent } from "react";
import { Button, FormError, Notice, PanelHeader, TextField } from "../components/ui";
import { useApp } from "../state/AppContext";

export function ForgotPassword() {
  const { go, services, pendingEmail, afterSignIn } = useApp();
  const [email, setEmail] = useState(pendingEmail);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await services.auth.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await services.auth.resetPasswordWithCode(email, code, password);
      await afterSignIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!sent) {
    return (
      <form className="panel" onSubmit={request} noValidate>
        <PanelHeader title="Reset your password" subtitle="We'll email you a code to set a new password." onBack={() => go("signIn")} />
        <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <FormError message={error} />
        <Button type="submit" busy={busy}>
          Send reset code
        </Button>
      </form>
    );
  }

  return (
    <form className="panel" onSubmit={reset} noValidate>
      <PanelHeader title="Choose a new password" subtitle={<>If an account exists for <strong>{email}</strong>, we've emailed it a 6-digit code.</>} onBack={() => setSent(false)} />
      <Notice message="Codes expire after 1 hour." />
      <TextField label="Reset code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="otp" />
      <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters, with upper and lowercase letters and a number." />
      <FormError message={error} />
      <Button type="submit" busy={busy}>
        Set new password
      </Button>
    </form>
  );
}
