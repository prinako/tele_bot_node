import { useState } from "react";
import { login } from "../api/backendClient.js";
import Icon from "../components/Icon.jsx";
import "../styles/login.css";

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
