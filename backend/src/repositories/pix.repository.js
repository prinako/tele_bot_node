import { getClient, query } from "../db/postgres.js";
import { upsertUser } from "./users.repository.js";

const pixColumnMap = {
  pix: "pix",
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
    bankId: row.bank_id,
    bank: row.bank_name || row.bank,
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

async function insetPix(data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");
    const user = await upsertUser(db, data);
    const bank = await resolveBank(db, data);
    if (!bank) {
      await db.query("ROLLBACK");
      return next({
        error: true,
        returnData: {
          message: "Bank not found",
          code: "BANK_NOT_FOUND",
        },
      });
    }

    const result = await db.query(
      `INSERT INTO pix_keys (
                user_id,
                bank_id,
                pix
            ) VALUES ($1, $2, $3)
            RETURNING *`,
      [
        user.id,
        bank.id,
        data.pix,
      ],
    );
    await db.query("COMMIT");

    return next({
      error: false,
      returnData: mapPix({
        ...result.rows[0],
        telegram_id: user.telegram_id,
        bank_name: bank.name,
      }),
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
                u.telegram_id,
                b.name AS bank_name
             FROM pix_keys pk
             JOIN users u ON u.id = pk.user_id
             JOIN banks b ON b.id = pk.bank_id
             WHERE u.telegram_id = $1
               AND lower(b.name) = lower($2)
             ORDER BY pk.created_at ASC`,
      [senderId, bank],
    );

    return result.rows.map(mapPix);
  } catch (error) {
    console.error("Error occurred during query:", error);
    return false;
  }
}

async function getAllPixKeys() {
  const result = await query(
    `SELECT
        pk.*,
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.display_name,
        b.name AS bank_name
      FROM pix_keys pk
      JOIN users u ON u.id = pk.user_id
      JOIN banks b ON b.id = pk.bank_id
      ORDER BY pk.created_at DESC`,
  );

  return result.rows.map((row) => ({
    ...mapPix(row),
    owner: {
      id: row.user_id,
      telegramId: toNumberOrNull(row.telegram_id),
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
    },
  }));
}

async function updatePix(id, data, next) {
  const db = await getClient();

  try {
    await db.query("BEGIN");
    const update = buildUpdate(data, pixColumnMap);
    const bank = data.bankId || data.bank ? await resolveBank(db, data) : null;
    if ((data.bankId || data.bank) && !bank) {
      await db.query("ROLLBACK");
      return next({
        error: true,
        returnData: {
          message: "Bank not found",
          code: "BANK_NOT_FOUND",
        },
      });
    }

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

    if (bank) {
      await db.query(
        `UPDATE pix_keys
                 SET
                    bank_id = $2,
                    updated_at = NOW()
                 WHERE id = $1`,
        [id, bank.id],
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
                u.telegram_id,
                b.name AS bank_name
             FROM pix_keys pk
             JOIN users u ON u.id = pk.user_id
             JOIN banks b ON b.id = pk.bank_id
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

export { getAllPixKeys, getUserPixBySenderBank, insetPix, updatePix };
