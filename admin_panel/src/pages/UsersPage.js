import { useEffect, useState } from "react";
import { getUsers, updateUser } from "../api/backendClient.js";
import Table from "../components/Table.js";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

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
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Users</h1>
          <p>Registered Telegram users and access flags.</p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <Table
        columns={[
          { key: "telegramId", label: "Telegram ID" },
          { key: "username", label: "Username" },
          { key: "firstName", label: "First" },
          { key: "lastName", label: "Last" },
          { key: "displayName", label: "Display" },
          {
            key: "isAllowed",
            label: "Allowed",
            render: (user) => (
              <button
                className="ghost"
                onClick={() => toggle(user, "isAllowed")}
              >
                {user.isAllowed ? "Allowed" : "Blocked"}
              </button>
            ),
          },
          {
            key: "isAdmin",
            label: "Admin",
            render: (user) => (
              <button
                className="ghost"
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
