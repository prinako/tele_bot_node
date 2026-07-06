import { getClient, query } from "../db/postgres.js";
import {
  findUserByTelegramId,
  upsertUser,
} from "./users.repository.js";
import {
  mapMember,
  setMemberPaid,
  updateFullPaymentState,
} from "./paymentMembers.repository.js";

const agendaColumnMap = {
  chatId: "chat_id",
  messageThreadId: "message_thread_id",
  topicId: "topic_id",
  date: "due_date",
  title: "title",
  amount: "total_amount",
  description: "description",
  pix: "pix",
  bank: "bank",
};

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function uniqueByTelegramId(users) {
  const seen = new Set();
  const uniqueUsers = [];

  for (const user of users) {
    const telegramId = Number(
      user.telegram_id || user.telegramId || user.senderId || user.id || user,
    );
    if (!telegramId || seen.has(telegramId)) {
      continue;
    }

    seen.add(telegramId);
    uniqueUsers.push({ ...user, telegram_id: telegramId });
  }

  return uniqueUsers;
}

function explicitResponsibleUsers(data) {
  const explicit = data.responsibleUserIds || data.responsibleTelegramIds ||
    data.members;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return uniqueByTelegramId(explicit.map((member) => (
      typeof member === "object"
        ? {
          telegram_id: member.telegramId || member.telegram_id ||
            member.senderId || member.id,
          username: member.username,
          first_name: member.firstName || member.first_name,
          last_name: member.lastName || member.last_name,
          display_name: member.displayName || member.display_name,
        }
        : { telegram_id: member }
    )));
  }

  return null;
}

function parseMoney(value) {
  if (typeof value === "number") {
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseDueDate(value) {
  const text = String(value ?? "");
  const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilianDate) {
    const [, day, month, year] = brazilianDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return text;
}

function mapAgenda(row) {
  if (!row) {
    return row;
  }

  const members = Array.isArray(row.members) ? row.members.map(mapMember) : [];

  return {
    _id: row.id,
    id: row.id,
    chatId: toNumberOrNull(row.chat_id),
    senderId: toNumberOrNull(row.created_by_telegram_id),
    createdByUserId: row.created_by_user_id,
    messageThreadId: toNumberOrNull(row.message_thread_id),
    topicId: toNumberOrNull(row.topic_id),
    date: row.due_date_text || row.due_date,
    title: row.title,
    amount: row.total_amount === null || row.total_amount === undefined
      ? null
      : String(row.total_amount),
    description: row.description,
    pixKeyId: row.pix_key_id,
    pix: row.pix,
    bank: row.bank,
    isPaid: row.is_fully_paid,
    isFullyPaid: row.is_fully_paid,
    fullyPaidAt: row.fully_paid_at,
    members,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildUpdate(data, columnMap) {
  const entries = Object.entries(data)
    .filter(([field]) =>
      Object.prototype.hasOwnProperty.call(columnMap, field)
    );

  if (entries.length === 0) {
    return null;
  }

  const sets = entries.map(([field], index) =>
    `${columnMap[field]} = $${index + 1}`
  );
  const values = entries.map(([field, value]) => {
    if (field === "date") {
      return parseDueDate(value);
    }

    if (field === "amount") {
      return parseMoney(value);
    }

    return value;
  });

  return {
    setSql: `${sets.join(", ")}, updated_at = NOW()`,
    values,
  };
}

async function resolveResponsibleUsers(db, data, creator) {
  const explicitUsers = explicitResponsibleUsers(data);
  if (explicitUsers) {
    const users = [];
    for (const explicitUser of explicitUsers) {
      users.push(
        await upsertUser(db, {
          telegramId: explicitUser.telegram_id,
          username: explicitUser.username,
          firstName: explicitUser.first_name,
          lastName: explicitUser.last_name,
          displayName: explicitUser.display_name,
        }),
      );
    }

    const uniqueUsers = uniqueByTelegramId(users);
    if (!data.chatId) {
      return uniqueUsers.length > 0 ? uniqueUsers : creator ? [creator] : [];
    }

    const installationUsers = await filterUsersByBotInstallationChatId(
      db,
      data.chatId,
      uniqueUsers,
    );
    return installationUsers.length > 0
      ? installationUsers
      : creator ? [creator] : [];
  }

  if (data.chatId) {
    const installationUsers = await getUsersByBotInstallationChatId(
      db,
      data.chatId,
    );
    return installationUsers.length > 0
      ? installationUsers
      : creator ? [creator] : [];
  }

  return creator ? [creator] : [];
}

async function userBelongsToBotInstallationChat(db, telegramUserId, chatId) {
  const result = await db.query(
    `SELECT 1
       FROM bot_installation_users biu
       JOIN bot_installations bi ON bi.id = biu.bot_installation_id
       JOIN users u ON u.id = biu.user_id
      WHERE u.telegram_id = $1
        AND bi.telegram_chat_id = $2
        AND bi.chat_type IN ('group', 'supergroup', 'channel')
        AND bi.bot_status = 'active'
      LIMIT 1`,
    [telegramUserId, chatId],
  );

  return result.rowCount > 0;
}

async function getUsersByBotInstallationChatId(db, telegramChatId) {
  const result = await db.query(
    `SELECT u.*
       FROM bot_installation_users biu
       JOIN bot_installations bi ON bi.id = biu.bot_installation_id
       JOIN users u ON u.id = biu.user_id
      WHERE bi.telegram_chat_id = $1
        AND bi.chat_type IN ('group', 'supergroup', 'channel')
        AND bi.bot_status = 'active'
      ORDER BY
        u.display_name ASC NULLS LAST,
        u.first_name ASC NULLS LAST,
        u.username ASC NULLS LAST,
        u.telegram_id ASC`,
    [telegramChatId],
  );

  return result.rows;
}

async function filterUsersByBotInstallationChatId(db, telegramChatId, users) {
  const telegramIds = uniqueByTelegramId(users).map((user) =>
    Number(user.telegram_id)
  );
  if (telegramIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT u.*
       FROM bot_installation_users biu
       JOIN bot_installations bi ON bi.id = biu.bot_installation_id
       JOIN users u ON u.id = biu.user_id
      WHERE bi.telegram_chat_id = $1
        AND u.telegram_id = ANY($2::bigint[])
        AND bi.chat_type IN ('group', 'supergroup', 'channel')
        AND bi.bot_status = 'active'
      ORDER BY
        u.display_name ASC NULLS LAST,
        u.first_name ASC NULLS LAST,
        u.username ASC NULLS LAST,
        u.telegram_id ASC`,
    [telegramChatId, telegramIds],
  );

  return result.rows;
}

async function resolveBank(db, data) {
  if (data.bankId) {
    const result = await db.query(
      `SELECT *
         FROM banks
        WHERE id = $1`,
      [data.bankId],
    );

    return result.rows[0] || null;
  }

  if (data.bank) {
    const result = await db.query(
      `SELECT *
         FROM banks
        WHERE lower(name) = lower($1)`,
      [data.bank],
    );

    return result.rows[0] || null;
  }

  return null;
}

async function getAgendaRow(db, id) {
  const result = await db.query(
    `SELECT
            ap.*,
            to_char(ap.due_date, 'DD/MM/YYYY') AS due_date_text,
            creator.telegram_id AS created_by_telegram_id,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', apm.id,
                        'user_id', u.id,
                        'telegram_id', u.telegram_id,
                        'username', u.username,
                        'first_name', u.first_name,
                        'last_name', u.last_name,
                        'display_name', u.display_name,
                        'is_responsible', apm.is_responsible,
                        'is_paid', apm.is_paid,
                        'paid_at', apm.paid_at,
                        'amount_share', apm.amount_share,
                        'created_at', apm.created_at,
                        'updated_at', apm.updated_at
                    )
                    ORDER BY u.display_name, u.telegram_id
                ) FILTER (WHERE apm.id IS NOT NULL),
                '[]'::json
            ) AS members
         FROM agenda_payments ap
         JOIN users creator ON creator.id = ap.created_by_user_id
         LEFT JOIN agenda_payment_members apm ON apm.agenda_payment_id = ap.id
         LEFT JOIN users u ON u.id = apm.user_id
         WHERE ap.id = $1
         GROUP BY ap.id, creator.telegram_id`,
    [id],
  );

  return result.rows[0] || null;
}

/**
 * Inserts a new agenda payment.
 * @param {Object} data - The data to insert.
 * @param {Function} next - Callback called with the inserted agenda or false.
 */
async function insetAgendaPayment(data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");

    const creator = await upsertUser(db, data);
    if (data.chatId) {
      const canCreate = await userBelongsToBotInstallationChat(
        db,
        creator.telegram_id,
        data.chatId,
      );
      if (!canCreate) {
        const error = new Error(
          "User does not belong to the selected group/channel",
        );
        error.status = 403;
        throw error;
      }
    }

    const bank = await resolveBank(db, data);
    if (!bank) {
      await db.query("ROLLBACK");
      return next(false);
    }

    const pixKey = await db.query(
      `SELECT pk.id
             FROM pix_keys pk
             WHERE pk.user_id = $1
               AND pk.pix = $2
               AND pk.bank_id = $3
             LIMIT 1`,
      [creator.id, data.pix, bank.id],
    );

    const agendaResult = await db.query(
      `INSERT INTO agenda_payments (
                created_by_user_id,
                chat_id,
                message_thread_id,
                topic_id,
                due_date,
                title,
                total_amount,
                description,
                pix_key_id,
                pix,
                bank,
                is_fully_paid
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12
            )
            RETURNING *`,
      [
        creator.id,
        data.chatId,
        data.messageThreadId ?? null,
        data.topicId ?? null,
        parseDueDate(data.date),
        data.title,
        parseMoney(data.amount),
        data.description,
        pixKey.rows[0]?.id ?? null,
        data.pix,
        bank.name,
        data.isPaid ?? false,
      ],
    );

    const agenda = agendaResult.rows[0];
    const responsibleUsers = await resolveResponsibleUsers(db, data, creator);
    const amountShare = responsibleUsers.length > 0
      ? parseMoney(data.amount) / responsibleUsers.length
      : null;

    for (const user of responsibleUsers) {
      await db.query(
        `INSERT INTO agenda_payment_members (
                    agenda_payment_id,
                    user_id,
                    is_responsible,
                    is_paid,
                    paid_at,
                    amount_share
                ) VALUES ($1, $2, TRUE, $3, CASE WHEN $3 THEN NOW() ELSE NULL END, $4)
                ON CONFLICT (agenda_payment_id, user_id)
                DO UPDATE SET
                    is_responsible = TRUE,
                    amount_share = EXCLUDED.amount_share,
                    updated_at = NOW()`,
        [
          agenda.id,
          user.id,
          data.isPaid ?? false,
          amountShare,
        ],
      );
    }

    await updateFullPaymentState(db, agenda.id);
    const inserted = await getAgendaRow(db, agenda.id);
    await db.query("COMMIT");

    return next(mapAgenda(inserted));
  } catch (err) {
    await db.query("ROLLBACK");
    console.log(err);
    if (err.status) {
      return next({ error: err.message, status: err.status });
    }
    return next(false);
  } finally {
    db.release();
  }
}

/**
 * Retrieves unpaid agenda payments by responsible Telegram user.
 * @param {number} senderId - The Telegram user id to search for.
 * @return {Promise<Array|boolean>} Matching agenda payments or false.
 */
async function getAllAgendaPaymentBySender(senderId) {
  try {
    const result = await query(
      `SELECT DISTINCT ap.id, ap.created_at
             FROM agenda_payments ap
             JOIN users creator ON creator.id = ap.created_by_user_id
             LEFT JOIN agenda_payment_members apm ON apm.agenda_payment_id = ap.id
             LEFT JOIN users member_user ON member_user.id = apm.user_id
             WHERE (
                creator.telegram_id = $1
                OR (
                    member_user.telegram_id = $1
                    AND apm.is_responsible = TRUE
                )
             )
               AND ap.is_fully_paid = FALSE
             ORDER BY ap.created_at ASC`,
      [senderId],
    );

    const rows = await Promise.all(
      result.rows.map((row) => getAgendaPaymentById(row.id)),
    );
    return rows.filter(Boolean);
  } catch (error) {
    console.error("Error occurred during query:", error);
    return false;
  }
}

/**
 * Retrieves all unpaid agenda payments.
 * @param {Function} next - Callback called with the result or false.
 */
async function getAllAgendaPayment(next) {
  try {
    const result = await query(
      `SELECT id
             FROM agenda_payments
             WHERE is_fully_paid = FALSE
             ORDER BY created_at ASC`,
    );

    const rows = await Promise.all(
      result.rows.map((row) => getAgendaPaymentById(row.id)),
    );
    return next(rows.filter(Boolean));
  } catch (err) {
    console.log(err);
    return next(false);
  }
}

async function getAllAgendaPaymentsForAdmin() {
  const result = await query(
    `SELECT id
       FROM agenda_payments
      ORDER BY created_at DESC`,
  );

  const rows = await Promise.all(
    result.rows.map((row) => getAgendaPaymentById(row.id)),
  );
  return rows.filter(Boolean);
}

async function getAgendaPaymentById(id) {
  try {
    return mapAgenda(await getAgendaRow({ query }, id)) || false;
  } catch (error) {
    console.error("Error occurred during query:", error);
    return false;
  }
}

/**
 * Deletes an agenda payment by id.
 * @param {string} id - The id of the agenda payment to delete.
 * @return {Promise<Object|boolean>} Deleted agenda payment or false.
 */
async function deleteAgendaPayment(id) {
  if (!id) {
    return false;
  }

  const db = await getClient();

  try {
    await db.query("BEGIN");
    const row = await getAgendaRow(db, id);
    await db.query(
      `DELETE FROM agenda_payments
             WHERE id = $1`,
      [id],
    );
    await db.query("COMMIT");

    return mapAgenda(row) || false;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error occurred during query:", error);
    return false;
  } finally {
    db.release();
  }
}

/**
 * Updates an agenda payment or a responsible member payment state.
 * @param {string} id - The id of the agenda payment to update.
 * @param {Object} data - Allowed fields to update.
 * @param {number} senderId - Optional Telegram user id for member payment state updates.
 * @return {Promise<Object|boolean>} Updated agenda payment or false.
 */
async function updateAgendaPayment(id, data, senderId = null) {
  const db = await getClient();

  try {
    await db.query("BEGIN");

    if (Object.prototype.hasOwnProperty.call(data, "isPaid")) {
      const targetTelegramId = data.telegramId || data.senderId || senderId;
      if (targetTelegramId) {
        const updated = await setMemberPaid(
          db,
          id,
          targetTelegramId,
          data.isPaid,
        );
        if (!updated) {
          await db.query("ROLLBACK");
          return false;
        }
      } else {
        await db.query(
          `UPDATE agenda_payment_members
                     SET
                        is_paid = $2,
                        paid_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
                        updated_at = NOW()
                     WHERE agenda_payment_id = $1
                       AND is_responsible = TRUE`,
          [id, data.isPaid],
        );
        await updateFullPaymentState(db, id);
      }
    }

    if (
      Array.isArray(data.members) || Array.isArray(data.responsibleUserIds) ||
      Array.isArray(data.responsibleTelegramIds)
    ) {
      const creator = await findUserByTelegramId(
        db,
        data.senderId || data.telegramId || senderId,
      );
      const members = await resolveResponsibleUsers(db, data, creator);
      const agenda = await getAgendaRow(db, id);
      const amountShare = members.length > 0
        ? parseMoney(agenda.total_amount) / members.length
        : null;

      await db.query(
        `UPDATE agenda_payment_members
                 SET
                    is_responsible = FALSE,
                    updated_at = NOW()
                 WHERE agenda_payment_id = $1`,
        [id],
      );

      for (const user of members) {
        await db.query(
          `INSERT INTO agenda_payment_members (
                        agenda_payment_id,
                        user_id,
                        is_responsible,
                        amount_share
                    ) VALUES ($1, $2, TRUE, $3)
                    ON CONFLICT (agenda_payment_id, user_id)
                    DO UPDATE SET
                        is_responsible = TRUE,
                        amount_share = EXCLUDED.amount_share,
                        updated_at = NOW()`,
          [id, user.id, amountShare],
        );
      }

      await updateFullPaymentState(db, id);
    }

    const update = buildUpdate(data, agendaColumnMap);
    if (update) {
      await db.query(
        `UPDATE agenda_payments
                 SET ${update.setSql}
                 WHERE id = $${update.values.length + 1}`,
        [...update.values, id],
      );
    }

    const updatedAgenda = await getAgendaRow(db, id);
    await db.query("COMMIT");

    return mapAgenda(updatedAgenda) || false;
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error occurred during query:", error);
    return false;
  } finally {
    db.release();
  }
}

export default {};

export {
  deleteAgendaPayment,
  getAgendaPaymentById,
  getAllAgendaPayment,
  getAllAgendaPaymentBySender,
  getAllAgendaPaymentsForAdmin,
  insetAgendaPayment,
  updateAgendaPayment,
};
