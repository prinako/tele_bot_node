import { getClient, query } from "../db/postgres.js";

function telegramDisplayName(user = {}) {
  return user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    String(user.firstName || "");
}

function userPayloadFromData(data = {}) {
  const source = data.user || data.sender || data.from || {};
  const telegramId = data.telegramId || data.senderId || source.id ||
    source.telegram_id;

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

function mapUser(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    telegramId: Number(row.telegram_id),
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name || telegramDisplayName(row),
    isAdmin: row.is_admin,
    isAllowed: row.is_allowed,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const userColumnMap = {
  username: "username",
  firstName: "first_name",
  lastName: "last_name",
  displayName: "display_name",
  isAdmin: "is_admin",
  isAllowed: "is_allowed",
};

function allowedTelegramIds() {
  return (process.env.ALLOWED_USERS || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
}

function adminTelegramIds() {
  return (process.env.ADMIN_USERS || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
}

async function upsertUser(db, data = {}) {
  const user = userPayloadFromData(data);
  if (!user.telegramId) {
    throw new Error("telegram_id is required to upsert a user");
  }

  const allowedIds = allowedTelegramIds();
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
      allowedIds.length === 0 || allowedIds.includes(Number(user.telegramId)),
    ],
  );

  return result.rows[0];
}

async function upsertTelegramUser(data = {}) {
  const db = await getClient();

  try {
    return await upsertUser(db, data);
  } finally {
    db.release();
  }
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

async function findUsersByTelegramIds(db, telegramIds) {
  const ids = Array.isArray(telegramIds) ? telegramIds : [telegramIds];

  if (ids.length === 0) {
    return [];
  }

  const result = await db.query(
    `SELECT *
       FROM users
      WHERE telegram_id = ANY($1::bigint[])`,
    [ids],
  );

  return result.rows;
}

async function getUserByTelegramId(telegramId) {
  return mapUser(await findUserByTelegramId({ query }, telegramId));
}

async function getUsersByTelegramIds(telegramIds) {
  return mapUser(await findUserByTelegramId({ query }, telegramId));
}

async function getAllUsers() {
  const result = await query(
    `SELECT *
       FROM users
      ORDER BY
        display_name ASC NULLS LAST,
        telegram_id ASC`,
  );

  return result.rows.map(mapUser);
}

async function updateUserByTelegramId(telegramId, data = {}) {
  const fields = [];
  const values = [];

  for (const [field, column] of Object.entries(userColumnMap)) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      values.push(data[field]);
      fields.push(`${column} = $${values.length}`);
    }
  }

  if (fields.length === 0) {
    return getUserByTelegramId(telegramId);
  }

  values.push(telegramId);
  const result = await query(
    `UPDATE users
        SET ${fields.join(", ")},
            updated_at = NOW()
      WHERE telegram_id = $${values.length}
      RETURNING *`,
    values,
  );

  return mapUser(result.rows[0]) || null;
}

async function getAllowedUsers(db) {
  const result = await db.query(
    `SELECT *
         FROM users
         WHERE is_allowed = TRUE
         ORDER BY
            display_name ASC NULLS LAST,
            telegram_id ASC`,
  );

  return result.rows;
}

async function getAllowedTelegramUsers() {
  return getAllowedUsers({ query });
}

export {
  findUserByTelegramId,
  getAllowedTelegramUsers,
  getAllowedUsers,
  getAllUsers,
  getUserByTelegramId,
  getUsersByTelegramIds,
  mapUser,
  telegramDisplayName,
  updateUserByTelegramId,
  upsertTelegramUser,
  upsertUser,
};
