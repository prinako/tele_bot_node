import { useEffect, useState } from "react";
import { getStats } from "../api/backendClient.js";
import Icon from "../components/Icon.jsx";

const cards = [
  ["usersCount", "Registered users", "users", "#/users"],
  ["activeBanksCount", "Active banks", "bank", "#/banks"],
  ["pixKeysCount", "PIX keys", "pix", "#/pix"],
  ["unpaidAgendaPaymentsCount", "Open bills", "clock", "#/agenda"],
  ["paidAgendaPaymentsCount", "Paid bills", "check", "#/agenda"],
  ["botInstallationsCount", "Groups & channels", "chat", "#/bot-installations"],
  ["botInstallationTopicsCount", "Forum topics", "topic", "#/bot-installations"],
  ["botInstallationUsersCount", "Seen users", "users", "#/bot-installations"],
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>A clear view of your bot, bills, and community.</p>
        </div>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="dashboard-welcome">
        <div><span className="section-eyebrow">YOUR WORKSPACE, AT A GLANCE</span><h2>Everything in order.</h2><p>Follow payment progress and keep your Telegram workspace running smoothly.</p><a className="button-link welcome-action" href="#/agenda">Manage your bills<Icon name="arrow" /></a></div>
        <div className="welcome-art" aria-hidden="true"><Icon name="calendar" /><span><Icon name="check" /></span></div>
      </div>
      <div className="section-heading"><h2>Workspace overview</h2><span>Current totals</span></div>
      <div className="metric-grid" aria-busy={!stats && !error}>
        {cards.map(([key, label, icon, href]) => (
          <a className={`metric metric-${icon}`} key={key} href={href}>
            <div className="metric-heading"><span className="metric-icon"><Icon name={icon} /></span><Icon className="metric-arrow" name="arrow" /></div>
            <strong>{stats ? stats[key] ?? "—" : error ? "—" : <span className="skeleton" aria-label="Loading" />}</strong>
            <span className="metric-label">{label}</span>
          </a>
        ))}
      </div>
      <div className="section-heading"><h2>Quick access</h2><span>Everyday essentials</span></div>
      <div className="quick-links">
        <a href="#/users"><span className="quick-icon"><Icon name="users" /></span><div><strong>Manage access</strong><p>Review users and permissions.</p></div><Icon name="arrow" /></a>
        <a href="#/pix"><span className="quick-icon"><Icon name="pix" /></span><div><strong>Payment details</strong><p>Review registered PIX keys.</p></div><Icon name="arrow" /></a>
        <a href="#/bot-installations"><span className="quick-icon"><Icon name="chat" /></span><div><strong>Your community</strong><p>Explore groups and topics.</p></div><Icon name="arrow" /></a>
      </div>
    </section>
  );
}
