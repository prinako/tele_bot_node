import { moneyToCents, formatCents, equalShareCents } from "../utils/money.js";
import { getClient, query } from "../db/postgres.js";
import {
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

/**
 * @param {Object} data - The data to resolve the responsible users.
 * @return {Array|null} The responsible users or null.
 */
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

/**
 * @param {number|string} value - The value to parse as due date.
 * @return {string} The parsed due date.
 */
function parseDueDate(value) {
  const text = String(value ?? "");
  const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilianDate) {
    const [, day, month, year] = brazilianDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return text;
}

/**
 * @param {Object} row - The row to map the agenda.
 * @return {Object} The mapped agenda.
 */
function mapAgenda(row) {
  if (!row) {
    return row;
  }

  const members = Array.isArray(row.members) ? row.members.map(mapMember) : [];
  const total = moneyToCents(row.total_amount, { allowZero: true });
  const allocated = members.filter((member) => member.isResponsible !== false)
    .reduce((sum, member) => sum + moneyToCents(member.amountShare ?? "0", { allowZero: true }), 0n);
  const surplus = allocated > total ? allocated - total : 0n;

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
    allocatedAmount: formatCents(allocated),
    surplusAmount: formatCents(surplus),
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

/**
 * @param {Object} data - The data to build the update.
 * @param {Object} columnMap - The column map.
 * @return {Object|null} The build update.
 */
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
      return formatCents(moneyToCents(value));
    }

    return value;
  });

  return {
    setSql: `${sets.join(", ")}, updated_at = NOW()`,
    values,
  };
}

/**
 * @param {Object} db - The database client.
 * @param {Object} data - The data to resolve the responsible users.
 * @param {Object} creator - The creator user.
 * @return {Promise<Array>} The resolved responsible users.
 */
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

    const allowedIds = new Set(
      installationUsers.map((user) => Number(user.telegram_id)),
    );
    const hasInvalidUser = uniqueUsers.some((user) =>
      !allowedIds.has(Number(user.telegram_id))
    );
    if (hasInvalidUser) {
      const error = new Error(
        "Selected responsible users must belong to the selected group/channel",
      );
      error.status = 403;
      throw error;
    }

    return installationUsers.length > 0
      ? installationUsers
      : creator ? [creator] : [];
  }

  return creator ? [creator] : [];
}

/**
 * @param {Object} db - The database client.
 * @param {number} telegramUserId - The Telegram user id.
 * @param {number} chatId - The chat id.
 * @return {Promise<boolean>} True if the user belongs to the chat, false otherwise.
 */
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

/**
 * @param {Object} db - The database client.
 * @param {number} telegramChatId - The Telegram chat id.
 * @param {Array} users - The users to filter.
 * @return {Promise<Array>} The filtered users.
 */
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

/**
 * @param {Object} db - The database client.
 * @param {Object} data - The data to resolve the bank.
 * @return {Promise<Object|null>} The resolved bank or null.
 */
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

/**
 * @param {Object} db - The database client.
 * @param {number} id - The id of the agenda.
 * @return {Promise<Object|null>} The agenda row or null.
 */
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
                        'amount_share', apm.amount_share::text,
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
 * @return {Promise<Object|boolean>} The inserted agenda or false.
 */
async function insetAgendaPayment(data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");

    const totalCents = moneyToCents(data.amount);
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
        formatCents(totalCents),
        data.description,
        pixKey.rows[0]?.id ?? null,
        data.pix,
        bank.name,
        data.isPaid ?? false,
      ],
    );

    const agenda = agendaResult.rows[0];
    const responsibleUsers = await resolveResponsibleUsers(db, data, creator);
    const amountShare = formatCents(equalShareCents(totalCents, responsibleUsers.length));

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
    console.error("Database operation failed", { code: err.code });
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
 * @return {Promise<Array|{ error: string, status: number }>} The matching agenda payments or false.
 */
async function getAllAgendaPaymentBySender(senderId) {
  try {
    const result = await query(
      `SELECT DISTINCT ap.id, ap.created_at
             FROM agenda_payments ap
             JOIN users creator ON creator.id = ap.created_by_user_id
             LEFT JOIN agenda_payment_members apm ON apm.agenda_payment_id = ap.id
             LEFT JOIN users member_user ON member_user.id = apm.user_id
             WHERE (creator.telegram_id = $1 OR (member_user.telegram_id = $1 AND apm.is_responsible = TRUE))
              AND ap.is_fully_paid = FALSE
             ORDER BY ap.created_at ASC`,
      [senderId],
    );

    const rows = await Promise.all(
      result.rows.map((row) => getAgendaPaymentById(row.id)),
    );
    return rows.filter(Boolean);
  } catch (error) {
    console.error("Error occurred during query:", { code: error.code, status: error.status });
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
    console.error("Database operation failed", { code: err.code });
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
    console.error("Error occurred during query:", { code: error.code, status: error.status });
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
    console.error("Error occurred during query:", { code: error.code, status: error.status });
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
    // All payment and allocation writes take the parent lock first.
    const locked = await db.query("SELECT * FROM agenda_payments WHERE id = $1 FOR UPDATE", [id]);
    const agenda = locked.rows[0];
    if (!agenda) {
      await db.query("ROLLBACK");
      return false;
    }

    const memberFields = ["members", "responsibleUserIds", "responsibleTelegramIds"];
    const changingMembers = memberFields.some((field) => Object.hasOwn(data, field));
    const changingAmount = Object.hasOwn(data, "amount");
    if (changingMembers || changingAmount) {
      const paid = await db.query(`SELECT 1 FROM agenda_payment_members
        WHERE agenda_payment_id = $1 AND is_responsible = TRUE AND is_paid = TRUE LIMIT 1`, [id]);
      if (paid.rowCount) {
        throw Object.assign(new Error("Mark all responsible payments unpaid before editing the amount or members"), { status: 409, code: "PAID_SHARE_EDIT" });
      }
      const total = moneyToCents(changingAmount ? data.amount : agenda.total_amount);
      let members;
      if (changingMembers) {
        for (const field of memberFields) {
          if (Object.hasOwn(data, field) && (!Array.isArray(data[field]) || !data[field].length)) {
            throw Object.assign(new Error("Select at least one responsible member"), { status: 400 });
          }
        }
        if (!explicitResponsibleUsers(data)?.length) {
          throw Object.assign(new Error("Invalid responsible members"), { status: 400 });
        }
        members = await resolveResponsibleUsers(db, { ...data, chatId: data.chatId ?? agenda.chat_id }, null);
      } else {
        const result = await db.query(`SELECT user_id AS id FROM agenda_payment_members
          WHERE agenda_payment_id = $1 AND is_responsible = TRUE`, [id]);
        members = result.rows;
      }
      const share = formatCents(equalShareCents(total, members.length));
      if (changingMembers) {
        await db.query(`UPDATE agenda_payment_members SET is_responsible = FALSE, updated_at = NOW()
          WHERE agenda_payment_id = $1`, [id]);
      }
      for (const user of members) {
        await db.query(`INSERT INTO agenda_payment_members (agenda_payment_id, user_id, is_responsible, amount_share)
          VALUES ($1, $2, TRUE, $3)
          ON CONFLICT (agenda_payment_id, user_id) DO UPDATE SET
            is_responsible = TRUE, amount_share = EXCLUDED.amount_share, updated_at = NOW()`, [id, user.id, share]);
      }
      await updateFullPaymentState(db, id);
    }

    const update = buildUpdate(data, agendaColumnMap);
    if (update) {
      await db.query(`UPDATE agenda_payments SET ${update.setSql} WHERE id = $${update.values.length + 1}`, [...update.values, id]);
    }
    if (Object.hasOwn(data, "isPaid")) {
      const target = data.telegramId || data.senderId || senderId;
      if (target) {
        if (!await setMemberPaid(db, id, target, data.isPaid)) {
          await db.query("ROLLBACK");
          return false;
        }
      } else {
        await db.query(`UPDATE agenda_payment_members SET is_paid = $2,
          paid_at = CASE WHEN $2 THEN NOW() ELSE NULL END, updated_at = NOW()
          WHERE agenda_payment_id = $1 AND is_responsible = TRUE`, [id, data.isPaid]);
        await updateFullPaymentState(db, id);
      }
    }
    const updated = await getAgendaRow(db, id);
    await db.query("COMMIT");
    return mapAgenda(updated) || false;
  } catch (error) {
    await db.query("ROLLBACK");
    if (error.status) throw error;
    console.error("Error occurred during query:", { code: error.code });
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
