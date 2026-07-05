import { getClient, query } from "../db/postgres.js";
import { upsertUser } from "./users.repository.js";

const pixColumnMap = {
  pix: "pix",
  bank: "bank",
};

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
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
    .filter(([field]) =>
      Object.prototype.hasOwnProperty.call(columnMap, field)
    );

  if (entries.length === 0) {
    return null;
  }

  const sets = entries.map(([field], index) =>
    `${columnMap[field]} = $${index + 1}`
  );
  const values = entries.map(([, value]) => value);

  return {
    setSql: `${sets.join(", ")}, updated_at = NOW()`,
    values,
  };
}

async function insetPix(data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");
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
    await db.query("COMMIT");

    return next({
      error: false,
      returnData: mapPix({ ...result.rows[0], telegram_id: user.telegram_id }),
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    return next({ error: true, returnData: error });
  } finally {
    db.release();
  }
}

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
    console.error("Error occurred during query:", error);
    return false;
  }
}

async function updatePix(id, data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");
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
    await db.query("COMMIT");

    return next(mapPix(result.rows[0]) || false);
  } catch (err) {
    await db.query("ROLLBACK");
    console.log(err);
    return next(false);
  } finally {
    db.release();
  }
}

export { getUserPixBySenderBank, insetPix, updatePix };
