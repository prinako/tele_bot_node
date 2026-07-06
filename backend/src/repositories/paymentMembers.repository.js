import { query } from "../db/postgres.js";
import {
  findUserByTelegramId,
  telegramDisplayName,
} from "./users.repository.js";

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapMember(member) {
  return {
    _id: member.id,
    id: member.id,
    userId: member.user_id,
    telegramId: toNumberOrNull(member.telegram_id),
    senderId: toNumberOrNull(member.telegram_id),
    username: member.username,
    firstName: member.first_name,
    lastName: member.last_name,
    displayName: member.display_name || telegramDisplayName(member),
    isResponsible: member.is_responsible,
    isPaid: member.is_paid,
    paidStatus: member.is_paid,
    paidAt: member.paid_at,
    amountShare:
      member.amount_share === null || member.amount_share === undefined
        ? null
        : String(member.amount_share),
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };
}

async function getMembersByAgendaPaymentId(agendaPaymentId) {
  const result = await query(
    `SELECT
            apm.*,
            u.telegram_id,
            u.username,
            u.first_name,
            u.last_name,
            u.display_name
         FROM agenda_payment_members apm
         JOIN users u ON u.id = apm.user_id
         WHERE apm.agenda_payment_id = $1
         ORDER BY
            u.display_name ASC NULLS LAST,
            u.telegram_id ASC`,
    [agendaPaymentId],
  );

  return result.rows.map(mapMember);
}

async function updateFullPaymentState(db, agendaPaymentId) {
  const result = await db.query(
    `UPDATE agenda_payments ap
         SET
            is_fully_paid = payment_state.is_fully_paid,
            fully_paid_at = CASE
                WHEN payment_state.is_fully_paid AND ap.fully_paid_at IS NULL THEN NOW()
                WHEN NOT payment_state.is_fully_paid THEN NULL
                ELSE ap.fully_paid_at
            END,
            updated_at = NOW()
         FROM (
            SELECT
                agenda_payment_id,
                BOOL_AND(is_paid) FILTER (WHERE is_responsible) AS is_fully_paid
            FROM agenda_payment_members
            WHERE agenda_payment_id = $1
            GROUP BY agenda_payment_id
         ) payment_state
         WHERE ap.id = payment_state.agenda_payment_id
         RETURNING ap.*`,
    [agendaPaymentId],
  );

  return result.rows[0] || null;
}

async function setMemberPaid(db, agendaPaymentId, telegramId, isPaid) {
  const user = await findUserByTelegramId(db, telegramId);
  if (!user) {
    return false;
  }

  const result = await db.query(
    `UPDATE agenda_payment_members
         SET
            is_paid = $3,
            paid_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
            updated_at = NOW()
         WHERE agenda_payment_id = $1
           AND user_id = $2
           AND is_responsible = TRUE
         RETURNING *`,
    [agendaPaymentId, user.id, isPaid],
  );

  if (result.rowCount === 0) {
    return false;
  }

  await updateFullPaymentState(db, agendaPaymentId);
  return true;
}

export {
  getMembersByAgendaPaymentId,
  mapMember,
  setMemberPaid,
  updateFullPaymentState,
};
