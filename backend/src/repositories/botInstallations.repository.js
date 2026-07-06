import { query } from "../db/postgres.js";

const INSTALLATION_CHAT_TYPES = new Set(["group", "supergroup", "channel"]);

function mapInstallation(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    telegramChatId: Number(row.telegram_chat_id),
    chatType: row.chat_type,
    title: row.title,
    username: row.username,
    addedByTelegramUserId: row.added_by_telegram_user_id
      ? Number(row.added_by_telegram_user_id)
      : null,
    botStatus: row.bot_status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTopic(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    botInstallationId: row.bot_installation_id,
    telegramChatId: Number(row.telegram_chat_id),
    messageThreadId: Number(row.message_thread_id),
    name: row.name,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isInstallationChatType(chatType) {
  return INSTALLATION_CHAT_TYPES.has(chatType);
}

async function upsertBotInstallation(data = {}) {
  const {
    telegramChatId,
    chatType,
    title = null,
    username = null,
    addedByTelegramUserId = null,
  } = data;

  const result = await query(
    `INSERT INTO bot_installations (
        telegram_chat_id,
        chat_type,
        title,
        username,
        added_by_telegram_user_id
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (telegram_chat_id)
      DO UPDATE SET
        chat_type = EXCLUDED.chat_type,
        title = EXCLUDED.title,
        username = EXCLUDED.username,
        bot_status = 'active',
        last_seen_at = NOW(),
        updated_at = NOW()
      RETURNING *`,
    [
      telegramChatId,
      chatType,
      title,
      username,
      addedByTelegramUserId,
    ],
  );

  return mapInstallation(result.rows[0]);
}

async function getBotInstallations() {
  const result = await query(
    `SELECT *
       FROM bot_installations
      ORDER BY
        title ASC NULLS LAST,
        telegram_chat_id ASC`,
  );

  return result.rows.map(mapInstallation);
}

async function getBotInstallationByTelegramChatId(telegramChatId) {
  const result = await query(
    `SELECT *
       FROM bot_installations
      WHERE telegram_chat_id = $1`,
    [telegramChatId],
  );

  return mapInstallation(result.rows[0]) || null;
}

async function upsertBotInstallationTopic(data = {}) {
  const { telegramChatId, messageThreadId } = data;
  const name = data.name || `Topic ${messageThreadId}`;

  const result = await query(
    `WITH installation AS (
        SELECT id, telegram_chat_id
          FROM bot_installations
         WHERE telegram_chat_id = $1
      ), upserted AS (
        INSERT INTO bot_installation_topics (
          bot_installation_id,
          message_thread_id,
          name
        )
        SELECT id, $2, $3
          FROM installation
        ON CONFLICT (bot_installation_id, message_thread_id)
        DO UPDATE SET
          name = COALESCE(EXCLUDED.name, bot_installation_topics.name),
          is_active = TRUE,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING *
      )
      SELECT upserted.*, installation.telegram_chat_id
        FROM upserted
        JOIN installation ON installation.id = upserted.bot_installation_id`,
    [telegramChatId, messageThreadId, name],
  );

  return mapTopic(result.rows[0]) || null;
}

async function getBotInstallationTopics(telegramChatId) {
  const result = await query(
    `SELECT topics.*, installations.telegram_chat_id
       FROM bot_installation_topics topics
       JOIN bot_installations installations
         ON installations.id = topics.bot_installation_id
      WHERE installations.telegram_chat_id = $1
      ORDER BY
        topics.message_thread_id ASC`,
    [telegramChatId],
  );

  return result.rows.map(mapTopic);
}

export {
  getBotInstallationByTelegramChatId,
  getBotInstallations,
  getBotInstallationTopics,
  isInstallationChatType,
  upsertBotInstallation,
  upsertBotInstallationTopic,
};
