import { useState } from "react";
import { login } from "../api/backendClient.js";
import "../styles/login.css";

function Icon({ name, ...props }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.8M6.3 6.3A22 22 0 0 0 2 12s3.5 7 10 7a13 13 0 0 0 5.7-1.3M10 10a3 3 0 0 0 4 4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const user = await login(password);
      setPassword("");
      onLogin(user);
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story" aria-labelledby="login-story-title">
        <div className="login-brand"><span className="login-brand-mark">TB</span><span>Tele Bot<span className="login-brand-caption">ADMINISTRATION</span></span></div>
        <div className="login-story-content">
          <span className="login-eyebrow">LESS ADMIN. MORE CLARITY.</span>
          <h1 id="login-story-title">Shared bills.{" "}<br />Everything{" "}<br /><span>in order.</span></h1>
          <p>Keep your bills, members, and PIX details organized in one place.</p>
          <ul className="login-features">
            <li><Icon name="check" />Track bills and payment progress</li>
            <li><Icon name="check" />Manage members and access</li>
            <li><Icon name="check" />Keep PIX details within reach</li>
          </ul>
        </div>
        <p className="login-story-footer">Built around your Telegram workflow.</p>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-lock"><Icon name="lock" /></div>
          <span className="login-eyebrow">ADMIN PORTAL</span>
          <h2 id="login-title">Welcome back.</h2>
          <p className="login-intro">Enter your admin password to access your workspace.</p>

          <form onSubmit={submit} aria-busy={busy}>
            {error && <div id="login-error" className="login-error" role="alert">{error}</div>}
            <label htmlFor="admin-password">Admin password</label>
            <div className="login-password">
              <Icon name="lock" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={busy}
                value={password}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error login-password-help" : "login-password-help"}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                onBlur={() => setCapsLock(false)}
              />
              <button className="login-password-toggle" type="button" disabled={busy}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword} aria-controls="admin-password"
                onClick={() => setShowPassword((visible) => !visible)}>
                <Icon name={showPassword ? "hidden" : "eye"} />
              </button>
            </div>
            <p id="login-password-help" className="login-help" aria-live="polite">
              {capsLock ? "Caps Lock is on." : "Use the password configured by your administrator."}
            </p>
            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? <><span className="login-spinner" aria-hidden="true" />Signing in…</> : <>Sign in to workspace<Icon name="arrow" /></>}
            </button>
          </form>

          <div className="login-access-note"><Icon name="lock" /><span>For authorized administrators only.</span></div>
        </div>
        <p className="login-access-footer">Tele Bot <span aria-hidden="true">/</span> Administration workspace</p>
      </section>
    </main>
  );
}
