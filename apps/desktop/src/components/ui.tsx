import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useApp } from "../state/AppContext";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({ variant = "primary", busy, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button {...rest} className={`btn btn-${variant} ${rest.className ?? ""}`} disabled={busy || rest.disabled} aria-busy={busy || undefined}>
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function TextField({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  const { avatar } = useApp();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        {...rest}
        onFocus={(e) => {
          avatar.play("listen");
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          avatar.play("idle");
          rest.onBlur?.(e);
        }}
      />
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="notice" role="status">
      {message}
    </p>
  );
}

export function PanelHeader({ title, subtitle, onBack }: { title: string; subtitle?: ReactNode; onBack?: () => void }) {
  return (
    <header className="panel-header">
      {onBack && (
        <button className="back" onClick={onBack} aria-label="Back">
          ← Back
        </button>
      )}
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
