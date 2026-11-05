import { useEffect, useState } from "react";
import { createBank, getBanks, updateBank } from "../api/backendClient.js";
import Form from "../components/Form.jsx";
import Table from "../components/Table.jsx";

const emptyBank = { name: "", isActive: true, sortOrder: 100 };

export default function BanksPage() {
  const [banks, setBanks] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newBank, setNewBank] = useState(emptyBank);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const rows = await getBanks();
    setBanks(rows);
    setDrafts(Object.fromEntries(rows.map((bank) => [bank.id, bank])));
  }

  function updateDraft(id, field, value) {
    setDrafts((items) => ({
      ...items,
      [id]: { ...items[id], [field]: value },
    }));
  }

  async function save(id) {
    try {
      const draft = drafts[id];
      const bank = await updateBank(id, {
        name: draft.name,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder),
      });
      setBanks((rows) => rows.map((row) => row.id === id ? bank : row));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await createBank({
        ...newBank,
        sortOrder: Number(newBank.sortOrder),
      });
      setNewBank(emptyBank);
      await load();
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
          <h1>Banks</h1>
          <p>Bank options used by PIX registration and agenda flows.</p>
        </div>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="panel">
        <h2>Add a bank</h2>
        <p className="panel-description">Make a bank available in your bot’s payment flows.</p>
        <Form
          fields={[
            { name: "name", label: "Bank name", placeholder: "e.g. Your bank" },
            { name: "sortOrder", label: "Sort Order", type: "number" },
            { name: "isActive", label: "Active", type: "checkbox" },
          ]}
          values={newBank}
          submitLabel="Add bank"
          onChange={(field, value) =>
            setNewBank((bank) => ({ ...bank, [field]: value }))}
          onSubmit={submit}
        />
      </div>
      <Table
        loading={loading}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (bank) => (
              <input
                aria-label={`Bank name for ${bank.name}`}
                value={drafts[bank.id]?.name ?? ""}
                onChange={(event) =>
                  updateDraft(bank.id, "name", event.target.value)}
              />
            ),
          },
          {
            key: "sortOrder",
            label: "Sort",
            render: (bank) => (
              <input
                type="number"
                aria-label={`Sort order for ${bank.name}`}
                value={drafts[bank.id]?.sortOrder ?? 100}
                onChange={(event) =>
                  updateDraft(bank.id, "sortOrder", event.target.value)}
              />
            ),
          },
          {
            key: "isActive",
            label: "Active",
            render: (bank) => (
              <input
                checked={Boolean(drafts[bank.id]?.isActive)}
                type="checkbox"
                aria-label={`Active status for ${bank.name}`}
                onChange={(event) =>
                  updateDraft(bank.id, "isActive", event.target.checked)}
              />
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (bank) => (
              <button onClick={() => save(bank.id)}>Save</button>
            ),
          },
        ]}
        rows={banks}
      />
    </section>
  );
}
