import { useEffect, useState } from "react";
import {
  deleteAgendaPayment,
  getAgendaPayments,
  updateAgendaPayment,
} from "../api/backendClient.js";
import Table from "../components/Table.js";

export default function AgendaPage() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");

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
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Agenda</h1>
          <p>Bill records and payment state.</p>
        </div>
      </header>
      {error && <div className="alert">{error}</div>}
      <Table
        columns={[
          { key: "title", label: "Title" },
          { key: "date", label: "Due" },
          { key: "amount", label: "Amount" },
          { key: "description", label: "Description" },
          { key: "pix", label: "PIX" },
          { key: "bank", label: "Bank" },
          {
            key: "isFullyPaid",
            label: "Paid",
            render: (payment) => payment.isFullyPaid ? "Paid" : "Open",
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
