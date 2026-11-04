import { useState } from "react";
import { login } from "../api/backendClient.js";

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(password);
      setPassword("");
      onLogin(user);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-shell">
    <form className="login-card" onSubmit={submit}>
      <h1>Tele Bot Admin</h1>
      <p>Sign in to manage bills, members, and PIX details.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" type="password" autoComplete="current-password"
        required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </main>;
}
