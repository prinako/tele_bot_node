import { useEffect, useState } from "react";
import {
  getBotInstallation,
  getBotInstallationTopics,
  getBotInstallationUsers,
  updateBotInstallationTopicSettings,
} from "../api/backendClient.js";
import Table from "../components/Table.js";

const tabs = ["Overview", "Users", "Topics", "Settings"];

function topicLabel(topic) {
  return topic.name || `Topic ${topic.messageThreadId}`;
}

export default function BotInstallationDetailsPage({ telegramChatId }) {
  const [installation, setInstallation] = useState(null);
  const [topics, setTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [settings, setSettings] = useState({
    agendaRegisterTopicId: "",
    agendaPaidTopicId: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const [installationData, topicData, userData] = await Promise.all([
      getBotInstallation(telegramChatId),
      getBotInstallationTopics(telegramChatId),
      getBotInstallationUsers(telegramChatId),
    ]);
    setInstallation(installationData);
    setTopics(topicData);
    setUsers(userData);
    setSettings({
      agendaRegisterTopicId: installationData.agendaRegisterTopicId || "",
      agendaPaidTopicId: installationData.agendaPaidTopicId || "",
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [telegramChatId]);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateBotInstallationTopicSettings(telegramChatId, {
        agendaRegisterTopicId: settings.agendaRegisterTopicId || null,
        agendaPaidTopicId: settings.agendaPaidTopicId || null,
      });
      setInstallation(updated);
      setSettings({
        agendaRegisterTopicId: updated.agendaRegisterTopicId || "",
        agendaPaidTopicId: updated.agendaPaidTopicId || "",
      });
      setSuccess("Topic settings saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{installation?.title || "Chat Details"}</h1>
          <p>Installation details, seen users, and registered forum topics.</p>
        </div>
        <a className="button-link" href="#/bot-installations">Back</a>
      </header>
      {error && <div className="alert">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab ? "primary" : ""}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && installation && (
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
          <div>
            <span>Agenda Register Topic</span>
            <strong>
              {installation.agendaRegisterTopic
                ? topicLabel(installation.agendaRegisterTopic)
                : "-"}
            </strong>
          </div>
          <div>
            <span>Agenda Paid Topic</span>
            <strong>
              {installation.agendaPaidTopic
                ? topicLabel(installation.agendaPaidTopic)
                : "-"}
            </strong>
          </div>
        </div>
      )}

      {activeTab === "Users" && (
        <>
          <h2>Users</h2>
          <Table
            columns={[
              { key: "telegramUserId", label: "Telegram User ID" },
              { key: "displayName", label: "Display" },
              { key: "username", label: "Username" },
              { key: "firstName", label: "First" },
              { key: "lastName", label: "Last" },
              { key: "isAllowed", label: "Allowed" },
              { key: "isAdmin", label: "Admin" },
              { key: "messageCount", label: "Messages" },
              { key: "firstSeenAt", label: "First Seen" },
              { key: "lastSeenAt", label: "Last Seen" },
            ]}
            rows={users}
          />
        </>
      )}

      {activeTab === "Topics" && (
        <>
          <h2>Topics</h2>
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
        </>
      )}

      {activeTab === "Settings" && (
        <div className="panel">
          {topics.length === 0 ? (
            <p>
              No topics registered yet. Send a message inside the Telegram
              topic first so the bot can detect it.
            </p>
          ) : (
            <form className="form-grid" onSubmit={saveSettings}>
              <label>
                <span>Agenda register topic</span>
                <small>Where new agenda/bill messages are sent.</small>
                <select
                  value={settings.agendaRegisterTopicId}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      agendaRegisterTopicId: event.target.value,
                    }))}
                >
                  <option value="">None / Not configured</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topicLabel(topic)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Agenda paid topic</span>
                <small>Where paid confirmation messages are sent.</small>
                <select
                  value={settings.agendaPaidTopicId}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      agendaPaidTopicId: event.target.value,
                    }))}
                >
                  <option value="">None / Not configured</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topicLabel(topic)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
