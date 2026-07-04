import { getClient, query } from '../connectDB/postgres.js';

const agendaColumnMap = {
    chatId: 'chat_id',
    messageThreadId: 'message_thread_id',
    topicId: 'topic_id',
    date: 'due_date',
    title: 'title',
    amount: 'total_amount',
    description: 'description',
    pix: 'pix',
    bank: 'bank',
};

const pixColumnMap = {
    pix: 'pix',
    bank: 'bank',
};

function toNumberOrNull(value) {
    return value === null || value === undefined ? null : Number(value);
}

function telegramDisplayName(user = {}) {
    return user.displayName
        || user.display_name
        || [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ')
        || user.username
        || String(user.telegramId || user.telegram_id || user.senderId || '');
}

function userPayloadFromData(data = {}) {
    const source = data.user || data.sender || data.from || {};
    const telegramId = data.telegramId || data.senderId || source.id || source.telegram_id;

    return {
        telegramId,
        username: source.username ?? data.username ?? null,
        firstName: source.first_name ?? source.firstName ?? data.firstName ?? null,
        lastName: source.last_name ?? source.lastName ?? data.lastName ?? null,
        displayName: telegramDisplayName({
            displayName: data.displayName,
            firstName: source.first_name ?? source.firstName ?? data.firstName,
            lastName: source.last_name ?? source.lastName ?? data.lastName,
            username: source.username ?? data.username,
            telegramId,
        }),
    };
}

function allowedTelegramIds() {
    return (process.env.ALLOWED_USERS || '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter(Boolean);
}

function adminTelegramIds() {
    return (process.env.ADMIN_USERS || '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter(Boolean);
}

function uniqueNumbers(values) {
    return [...new Set(values.map(Number).filter(Boolean))];
}

function responsibleTelegramIds(data) {
    const explicit = data.responsibleUserIds || data.responsibleTelegramIds || data.members;
    if (Array.isArray(explicit) && explicit.length > 0) {
        return uniqueNumbers(explicit.map((member) => member.telegramId || member.senderId || member.id || member));
    }

    const fromEnv = allowedTelegramIds();
    return uniqueNumbers(fromEnv.length > 0 ? [...fromEnv, data.senderId] : [data.senderId]);
}

function parseMoney(value) {
    if (typeof value === 'number') {
        return value;
    }

    const normalized = String(value ?? '')
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
}

function parseDueDate(value) {
    const text = String(value ?? '');
    const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brazilianDate) {
        const [, day, month, year] = brazilianDate;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return text;
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
        paidAt: member.paid_at,
        amountShare: member.amount_share === null || member.amount_share === undefined ? null : String(member.amount_share),
        createdAt: member.created_at,
        updatedAt: member.updated_at,
    };
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
        amount: row.total_amount === null || row.total_amount === undefined ? null : String(row.total_amount),
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

function mapPix(row) {
    if (!row) {
        return row;
    }

    return {
        _id: row.id,
        id: row.id,
        userId: row.user_id,
        pix: row.pix,
        senderId: toNumberOrNull(row.telegram_id),
        telegramId: toNumberOrNull(row.telegram_id),
        bank: row.bank,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function buildUpdate(data, columnMap) {
    const entries = Object.entries(data)
        .filter(([field]) => Object.prototype.hasOwnProperty.call(columnMap, field));

    if (entries.length === 0) {
        return null;
    }

    const sets = entries.map(([field], index) => `${columnMap[field]} = $${index + 1}`);
    const values = entries.map(([field, value]) => {
        if (field === 'date') {
            return parseDueDate(value);
        }

        if (field === 'amount') {
            return parseMoney(value);
        }

        return value;
    });

    return {
        setSql: `${sets.join(', ')}, updated_at = NOW()`,
        values,
    };
}

async function upsertUser(db, data = {}) {
    const user = userPayloadFromData(data);
    if (!user.telegramId) {
        throw new Error('telegram_id is required to upsert a user');
    }

    const result = await db.query(
        `INSERT INTO users (
            telegram_id,
            username,
            first_name,
            last_name,
            display_name,
            is_admin,
            is_allowed,
            last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (telegram_id)
        DO UPDATE SET
            username = COALESCE(EXCLUDED.username, users.username),
            first_name = COALESCE(EXCLUDED.first_name, users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, users.last_name),
            display_name = COALESCE(EXCLUDED.display_name, users.display_name),
            is_admin = EXCLUDED.is_admin,
            is_allowed = EXCLUDED.is_allowed,
            last_seen_at = NOW(),
            updated_at = NOW()
        RETURNING *`,
        [
            user.telegramId,
            user.username,
            user.firstName,
            user.lastName,
            user.displayName,
            adminTelegramIds().includes(Number(user.telegramId)),
            allowedTelegramIds().length === 0 || allowedTelegramIds().includes(Number(user.telegramId)),
        ],
    );

    return result.rows[0];
}

async function findUserByTelegramId(db, telegramId) {
    const result = await db.query(
        `SELECT *
         FROM users
         WHERE telegram_id = $1`,
        [telegramId],
    );

    return result.rows[0] || null;
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

/**
 * Inserts a new agenda payment.
 * @param {Object} data - The data to insert.
 * @param {Function} next - Callback called with the inserted agenda or false.
 */
async function insetAgendaPayment(data, next) {
    const db = await getClient();

    try {
        await db.query('BEGIN');

        const creator = await upsertUser(db, data);
        const pixKey = await db.query(
            `SELECT pk.id
             FROM pix_keys pk
             WHERE pk.user_id = $1
               AND pk.pix = $2
               AND pk.bank = $3
             LIMIT 1`,
            [creator.id, data.pix, data.bank],
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
                data.bank,
                data.isPaid ?? false,
            ],
        );

        const agenda = agendaResult.rows[0];
        const members = responsibleTelegramIds(data);
        const amountShare = members.length > 0 ? parseMoney(data.amount) / members.length : null;

        for (const telegramId of members) {
            const user = await upsertUser(db, { telegramId });
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
        await db.query('COMMIT');

        return next(mapAgenda(inserted));
    } catch (err) {
        await db.query('ROLLBACK');
        console.log(err);
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

        const rows = await Promise.all(result.rows.map((row) => getAgendaPaymentById(row.id)));
        return rows.filter(Boolean);
    } catch (error) {
        console.error('Error occurred during query:', error);
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

        const rows = await Promise.all(result.rows.map((row) => getAgendaPaymentById(row.id)));
        return next(rows.filter(Boolean));
    } catch (err) {
        console.log(err);
        return next(false);
    }
}

async function getAgendaPaymentById(id) {
    try {
        return mapAgenda(await getAgendaRow({ query }, id)) || false;
    } catch (error) {
        console.error('Error occurred during query:', error);
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
        await db.query('BEGIN');
        const row = await getAgendaRow(db, id);
        await db.query(
            `DELETE FROM agenda_payments
             WHERE id = $1`,
            [id],
        );
        await db.query('COMMIT');

        return mapAgenda(row) || false;
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error occurred during query:', error);
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
        await db.query('BEGIN');

        if (Object.prototype.hasOwnProperty.call(data, 'isPaid')) {
            const targetTelegramId = data.telegramId || data.senderId || senderId;
            if (targetTelegramId) {
                const updated = await setMemberPaid(db, id, targetTelegramId, data.isPaid);
                if (!updated) {
                    await db.query('ROLLBACK');
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

        if (Array.isArray(data.members) || Array.isArray(data.responsibleUserIds) || Array.isArray(data.responsibleTelegramIds)) {
            const members = responsibleTelegramIds(data);
            const agenda = await getAgendaRow(db, id);
            const amountShare = members.length > 0 ? parseMoney(agenda.total_amount) / members.length : null;

            await db.query(
                `UPDATE agenda_payment_members
                 SET
                    is_responsible = FALSE,
                    updated_at = NOW()
                 WHERE agenda_payment_id = $1`,
                [id],
            );

            for (const telegramId of members) {
                const user = await upsertUser(db, { telegramId });
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
        await db.query('COMMIT');

        return mapAgenda(updatedAgenda) || false;
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error occurred during query:', error);
        return false;
    } finally {
        db.release();
    }
}

/**
 * Inserts a new PIX key.
 * @param {Object} data - The data to insert.
 * @param {Function} next - Callback called with the old response shape.
 */
async function insetPix(data, next) {
    const db = await getClient();

    try {
        await db.query('BEGIN');
        const user = await upsertUser(db, data);
        const result = await db.query(
            `INSERT INTO pix_keys (
                user_id,
                pix,
                bank
            ) VALUES ($1, $2, $3)
            RETURNING *`,
            [
                user.id,
                data.pix,
                data.bank,
            ],
        );
        await db.query('COMMIT');

        return next({ error: false, returnData: mapPix({ ...result.rows[0], telegram_id: user.telegram_id }) });
    } catch (error) {
        await db.query('ROLLBACK');
        console.log(error);
        return next({ error: true, returnData: error });
    } finally {
        db.release();
    }
}

/**
 * Retrieves PIX keys by sender and bank.
 * @param {number} senderId - The Telegram user id to search for.
 * @param {string} bank - The bank type to search for.
 * @return {Promise<Array|boolean>} Matching PIX keys or false.
 */
async function getUserPixBySenderBank(senderId, bank) {
    try {
        const result = await query(
            `SELECT
                pk.*,
                u.telegram_id
             FROM pix_keys pk
             JOIN users u ON u.id = pk.user_id
             WHERE u.telegram_id = $1
               AND pk.bank = $2
             ORDER BY pk.created_at ASC`,
            [senderId, bank],
        );

        return result.rows.map(mapPix);
    } catch (error) {
        console.error('Error occurred during query:', error);
        return false;
    }
}

/**
 * Updates a PIX key.
 * @param {string} id - The id of the PIX key to update.
 * @param {Object} data - Allowed fields to update.
 * @param {Function} next - Callback called with the updated PIX key or false.
 */
async function updatePix(id, data, next) {
    const db = await getClient();

    try {
        await db.query('BEGIN');
        const update = buildUpdate(data, pixColumnMap);

        if (data.senderId || data.telegramId || data.user) {
            const user = await upsertUser(db, data);
            await db.query(
                `UPDATE pix_keys
                 SET
                    user_id = $2,
                    updated_at = NOW()
                 WHERE id = $1`,
                [id, user.id],
            );
        }

        if (update) {
            await db.query(
                `UPDATE pix_keys
                 SET ${update.setSql}
                 WHERE id = $${update.values.length + 1}`,
                [...update.values, id],
            );
        }

        const result = await db.query(
            `SELECT
                pk.*,
                u.telegram_id
             FROM pix_keys pk
             JOIN users u ON u.id = pk.user_id
             WHERE pk.id = $1`,
            [id],
        );
        await db.query('COMMIT');

        return next(mapPix(result.rows[0]) || false);
    } catch (err) {
        await db.query('ROLLBACK');
        console.log(err);
        return next(false);
    } finally {
        db.release();
    }
}

export default {};

export {
    insetAgendaPayment,
    getAllAgendaPayment,
    getAllAgendaPaymentBySender,
    getAgendaPaymentById,
    deleteAgendaPayment,
    updateAgendaPayment,
    insetPix,
    getUserPixBySenderBank,
    updatePix,
};
