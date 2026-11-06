"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { content } from "@/config/content";

const a = content.admin;

export function AdminLogin({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!password) {
      setError(a.wrongPassword);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; retryAfterSeconds?: number } | null;
      if (res.ok && data?.ok) {
        setPassword("");
        window.location.assign("/admin");
        return;
      }
      if (res.status === 429) setError(a.tooManyAttempts(Math.max(1, Math.ceil((data?.retryAfterSeconds ?? 900) / 60))));
      else if (res.status === 503) setError(a.notConfigured);
      else if (res.status === 401) setError(a.wrongPassword);
      else setError(a.loginFailed);
    } catch {
      setError(a.loginFailed);
    } finally {
      setBusy(false);
    }
    setPassword("");
    inputRef.current?.focus();
  }

  return (
    <form className="admin-login" onSubmit={onSubmit} noValidate>
      <div className="admin-login__head">
        <h2 id="admin-login-title" className="admin-login__title">
          {a.loginTitle}
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={a.close}>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M5,5 L15,15 M15,5 L5,15" />
          </svg>
        </button>
      </div>
      <div className="field">
        <label htmlFor="admin-password" className="field__label">
          {a.passwordLabel}
        </label>
        <input
          ref={inputRef}
          id="admin-password"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="admin-password-error"
          maxLength={256}
        />
        <p id="admin-password-error" className="field__error" role="alert">
          {error}
        </p>
      </div>
      <button type="submit" className="btn btn--primary admin-login__submit" disabled={busy}>
        {busy ? a.loggingIn : a.login}
      </button>
    </form>
  );
}
