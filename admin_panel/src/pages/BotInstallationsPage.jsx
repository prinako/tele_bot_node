import { useEffect, useState } from "react";
import { getBotInstallations } from "../api/backendClient.js";
import Table from "../components/Table.js";

export default function BotInstallationsPage() {
  const [installations, setInstallations] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getBotInstallations()
      .then(setInstallations)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Groups & Channels</h1>
          <p>
            Telegram groups, supergroups, and channels where the bot is active.
          </p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <Table
        columns={[
          { key: "telegramChatId", label: "Telegram Chat ID" },
          { key: "chatType", label: "Type" },
          { key: "title", label: "Title" },
          { key: "username", label: "Username" },
          { key: "botStatus", label: "Bot Status" },
          { key: "addedByTelegramUserId", label: "Added By" },
          { key: "firstSeenAt", label: "First Seen" },
          { key: "lastSeenAt", label: "Last Seen" },
          { key: "createdAt", label: "Created At" },
          { key: "updatedAt", label: "Updated At" },
          {
            key: "actions",
            label: "Actions",
            render: (installation) => (
              <a
                className="button-link"
                href={`#/bot-installations/${installation.telegramChatId}`}
              >
                View
              </a>
            ),
          },
        ]}
        rows={installations}
      />
    </section>
  );
}
