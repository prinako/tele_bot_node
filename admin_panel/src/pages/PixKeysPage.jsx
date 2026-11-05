import { useEffect, useState } from "react";
import { getPixKeys, updatePix } from "../api/backendClient.js";
import Table from "../components/Table.jsx";

export default function PixKeysPage() {
  const [keys, setKeys] = useState([]);
  const [editing, setEditing] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const rows = await getPixKeys();
    setKeys(rows);
    setEditing(Object.fromEntries(rows.map((key) => [key.id, key.pix])));
  }

  async function save(key) {
    try {
      const updated = await updatePix(key.id, { pix: editing[key.id] });
      setKeys((rows) =>
        rows.map((row) => row.id === updated.id ? { ...row, ...updated } : row)
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
          <h1>PIX Keys</h1>
          <p>Registered keys with owner and bank context.</p>
        </div>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <Table
        loading={loading}
        columns={[
          {
            key: "owner",
            label: "Owner",
            searchValue: (key) => key.owner?.displayName || key.owner?.username || key.telegramId,
            render: (key) =>
              key.owner?.displayName || key.owner?.username || key.telegramId,
          },
          { key: "bank", label: "Bank" },
          {
            key: "pix",
            label: "PIX",
            render: (key) => (
              <input
                aria-label={`PIX key for ${key.owner?.displayName || key.owner?.username || key.telegramId}`}
                value={editing[key.id] ?? ""}
                onChange={(event) =>
                  setEditing((items) => ({
                    ...items,
                    [key.id]: event.target.value,
                  }))}
              />
            ),
          },
          { key: "createdAt", label: "Created" },
          { key: "updatedAt", label: "Updated" },
          {
            key: "actions",
            label: "Actions",
            render: (key) => <button onClick={() => save(key)}>Save</button>,
          },
        ]}
        rows={keys}
      />
    </section>
  );
}
