import { useEffect, useState } from "react";
import {
  deleteAgendaPayment,
  getAgendaPayments,
  updateAgendaPayment,
} from "../api/backendClient.js";
import Table from "../components/Table.jsx";
import Badge from "../components/Badge.jsx";

export default function AgendaPage() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setPayments(await getAgendaPayments());
  }

  async function setPaid(payment, isPaid) {
    try {
      const updated = await updateAgendaPayment(payment.id, { isPaid });
      setPayments((rows) =>
        rows.map((row) => row.id === updated.id ? updated : row)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(payment) {
    try {
      await deleteAgendaPayment(payment.id);
      setPayments((rows) => rows.filter((row) => row.id !== payment.id));
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
          <h1>Agenda</h1>
          <p>Bill records and payment state.</p>
        </div>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <Table
        loading={loading}
        columns={[
          { key: "title", label: "Title" },
          { key: "date", label: "Due" },
          { key: "amount", label: "Bill amount" },
          { key: "surplusAmount", label: "Rounding surplus" },
          { key: "description", label: "Description" },
          { key: "pix", label: "PIX" },
          { key: "bank", label: "Bank" },
          {
            key: "isFullyPaid",
            label: "Paid",
            searchValue: (payment) => payment.isFullyPaid ? "Paid" : "Open",
            render: (payment) => <Badge tone={payment.isFullyPaid ? "success" : "warning"}>{payment.isFullyPaid ? "Paid" : "Open"}</Badge>,
          },
          { key: "senderId", label: "Created By" },
          { key: "createdAt", label: "Created" },
          {
            key: "actions",
            label: "Actions",
            render: (payment) => (
              <div className="row-actions">
                <a className="button-link" href={`#/agenda/${payment.id}`}>
                  Details
                </a>
                <button onClick={() => setPaid(payment, true)}>Paid</button>
                <button onClick={() => setPaid(payment, false)}>Unpaid</button>
                <button className="danger" onClick={() => remove(payment)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={payments}
      />
    </section>
  );
}
