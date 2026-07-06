import { useEffect, useState } from "react";
import {
  getBotInstallation,
  getBotInstallationTopics,
} from "../api/backendClient.js";
import Table from "../components/Table.js";

export default function BotInstallationDetailsPage({ telegramChatId }) {
  const [installation, setInstallation] = useState(null);
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [installationData, topicData] = await Promise.all([
      getBotInstallation(telegramChatId),
      getBotInstallationTopics(telegramChatId),
    ]);
    setInstallation(installationData);
    setTopics(topicData);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [telegramChatId]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{installation?.title || "Group or Channel"}</h1>
          <p>Installation details and registered forum topics.</p>
        </div>
        <a className="button-link" href="#/bot-installations">Back</a>
      </header>
      {error && <div className="alert">{error}</div>}
      {installation && (
        <div className="details-grid">
          <div>
            <span>Telegram Chat ID</span>
            <strong>{installation.telegramChatId}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{installation.chatType}</strong>
          </div>
          <div>
            <span>Username</span>
            <strong>{installation.username || "-"}</strong>
          </div>
          <div>
            <span>Bot Status</span>
            <strong>{installation.botStatus}</strong>
          </div>
          <div>
            <span>Added By</span>
            <strong>{installation.addedByTelegramUserId || "-"}</strong>
          </div>
          <div>
            <span>Last Seen</span>
            <strong>{installation.lastSeenAt}</strong>
          </div>
        </div>
      )}
      <Table
        columns={[
          { key: "messageThreadId", label: "Message Thread ID" },
          { key: "name", label: "Name" },
          { key: "isActive", label: "Active" },
          { key: "firstSeenAt", label: "First Seen" },
          { key: "lastSeenAt", label: "Last Seen" },
          { key: "createdAt", label: "Created At" },
          { key: "updatedAt", label: "Updated At" },
        ]}
        rows={topics}
      />
    </section>
  );
}
