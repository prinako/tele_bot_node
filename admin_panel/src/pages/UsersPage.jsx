import { useEffect, useState } from "react";
import { getUsers, updateUser } from "../api/backendClient.js";
import Table from "../components/Table.jsx";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setUsers(await getUsers());
  }

  async function toggle(user, field) {
    try {
      const next = await updateUser(user.telegramId, {
        [field]: !user[field],
      });
      setUsers((rows) =>
        rows.map((row) => row.telegramId === next.telegramId ? next : row)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Users</h1>
          <p>Registered Telegram users and access flags.</p>
        </div>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <Table
        loading={loading}
        columns={[
          { key: "telegramId", label: "Telegram ID" },
          { key: "username", label: "Username" },
          { key: "firstName", label: "First" },
          { key: "lastName", label: "Last" },
          { key: "displayName", label: "Display" },
          {
            key: "isAllowed",
            label: "Allowed",
            searchValue: (user) => user.isAllowed ? "Allowed" : "Blocked",
            render: (user) => (
              <button
                className={`ghost access-toggle ${user.isAllowed ? "is-enabled" : "is-blocked"}`}
                aria-pressed={user.isAllowed}
                aria-label={`Allow access for ${user.displayName || user.username || user.telegramId}`}
                onClick={() => toggle(user, "isAllowed")}
              >
                {user.isAllowed ? "Allowed" : "Blocked"}
              </button>
            ),
          },
          {
            key: "isAdmin",
            label: "Admin",
            searchValue: (user) => user.isAdmin ? "Admin" : "User",
            render: (user) => (
              <button
                className={`ghost access-toggle ${user.isAdmin ? "is-admin" : ""}`}
                aria-pressed={user.isAdmin}
                aria-label={`Administrator access for ${user.displayName || user.username || user.telegramId}`}
                onClick={() => toggle(user, "isAdmin")}
              >
                {user.isAdmin ? "Admin" : "User"}
              </button>
            ),
          },
          { key: "lastSeenAt", label: "Last Seen" },
        ]}
        rows={users}
      />
    </section>
  );
}
