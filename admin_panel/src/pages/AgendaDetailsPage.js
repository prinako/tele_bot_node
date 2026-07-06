import { useEffect, useState } from "react";
import {
  getAgendaMembers,
  getAgendaPayment,
  markAgendaMemberPaid,
  markAgendaMemberUnpaid,
} from "../api/backendClient.js";
import Table from "../components/Table.js";

export default function AgendaDetailsPage({ id }) {
  const [payment, setPayment] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [paymentData, memberData] = await Promise.all([
      getAgendaPayment(id),
      getAgendaMembers(id),
    ]);
    setPayment(paymentData);
    setMembers(memberData);
  }

  async function setMember(member, isPaid) {
    try {
      if (isPaid) {
        await markAgendaMemberPaid(id, member.telegramId);
      } else {
        await markAgendaMemberUnpaid(id, member.telegramId);
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{payment?.title || "Agenda Details"}</h1>
          <p>Payment details and responsible member status.</p>
        </div>
        <a className="button-link" href="#/agenda">Back</a>
      </header>
      {error && <div className="alert">{error}</div>}
      {payment && (
        <div className="details-grid">
          <div>
            <span>Due</span>
            <strong>{payment.date}</strong>
          </div>
          <div>
            <span>Amount</span>
            <strong>{payment.amount}</strong>
          </div>
          <div>
            <span>Bank</span>
            <strong>{payment.bank}</strong>
          </div>
          <div>
            <span>PIX</span>
            <strong>{payment.pix}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{payment.isFullyPaid ? "Paid" : "Open"}</strong>
          </div>
          <div>
            <span>Created By</span>
            <strong>{payment.senderId}</strong>
          </div>
        </div>
      )}
      <Table
        columns={[
          { key: "telegramId", label: "Telegram ID" },
          { key: "displayName", label: "Name" },
          { key: "username", label: "Username" },
          { key: "amountShare", label: "Share" },
          {
            key: "isPaid",
            label: "Paid",
            render: (member) => member.isPaid ? "Paid" : "Open",
          },
          { key: "paidAt", label: "Paid At" },
          {
            key: "actions",
            label: "Actions",
            render: (member) => (
              <div className="row-actions">
                <button onClick={() => setMember(member, true)}>Paid</button>
                <button onClick={() => setMember(member, false)}>Unpaid</button>
              </div>
            ),
          },
        ]}
        rows={members}
      />
    </section>
  );
}
