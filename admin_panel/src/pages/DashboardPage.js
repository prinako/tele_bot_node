import { useEffect, useState } from "react";
import { getStats } from "../api/backendClient.js";

const cards = [
  ["usersCount", "Users"],
  ["activeBanksCount", "Active Banks"],
  ["pixKeysCount", "PIX Keys"],
  ["unpaidAgendaPaymentsCount", "Unpaid Agenda"],
  ["paidAgendaPaymentsCount", "Paid Agenda"],
  ["botInstallationsCount", "Bot Installations"],
  ["botInstallationTopicsCount", "Topics"],
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
          <p>Operational snapshot for the bill bot.</p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <div className="metric-grid">
        {cards.map(([key, label]) => (
          <div className="metric" key={key}>
            <span>{label}</span>
            <strong>{stats ? stats[key] : "-"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
