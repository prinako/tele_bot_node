import { useEffect, useState } from "react";
import {
  getAgendaMembers,
  getAgendaPayment,
  markAgendaMemberPaid,
  markAgendaMemberUnpaid,
} from "../api/backendClient.js";
import Table from "../components/Table.jsx";
import Badge from "../components/Badge.jsx";

export default function AgendaDetailsPage({ id }) {
  const [payment, setPayment] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
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
      {error && <div className="alert" role="alert">{error}</div>}
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
            <span>Allocated total</span>
            <strong>{payment.allocatedAmount}</strong>
          </div>
          <div>
            <span>Rounding surplus</span>
            <strong>{payment.surplusAmount}</strong>
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
            <strong><Badge tone={payment.isFullyPaid ? "success" : "warning"}>{payment.isFullyPaid ? "Paid" : "Open"}</Badge></strong>
          </div>
          <div>
            <span>Created By</span>
            <strong>{payment.senderId}</strong>
          </div>
        </div>
      )}
      <Table
        loading={loading}
        columns={[
          { key: "telegramId", label: "Telegram ID" },
          { key: "displayName", label: "Name" },
          { key: "username", label: "Username" },
          { key: "amountShare", label: "Share" },
          {
            key: "isPaid",
            label: "Paid",
            searchValue: (member) => member.isPaid ? "Paid" : "Open",
            render: (member) => <Badge tone={member.isPaid ? "success" : "warning"}>{member.isPaid ? "Paid" : "Open"}</Badge>,
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
