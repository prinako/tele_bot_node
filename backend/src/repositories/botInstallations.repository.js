import { query } from "../db/postgres.js";

const INSTALLATION_CHAT_TYPES = new Set([
  "group",
  "supergroup",
  "channel",
]);

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
    agendaRegisterTopicId: row.agenda_register_topic_id,
    agendaPaidTopicId: row.agenda_paid_topic_id,
    agendaRegisterTopic: row.register_topic_id
      ? {
        id: row.register_topic_id,
        messageThreadId: Number(row.register_topic_message_thread_id),
        name: row.register_topic_name,
      }
      : null,
    agendaPaidTopic: row.paid_topic_id
      ? {
        id: row.paid_topic_id,
        messageThreadId: Number(row.paid_topic_message_thread_id),
        name: row.paid_topic_name,
      }
      : null,
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

function mapInstallationUser(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    botInstallationId: row.bot_installation_id,
    userId: row.user_id,
    telegramChatId: Number(row.telegram_chat_id),
    telegramUserId: Number(row.telegram_user_id),
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    isAllowed: row.is_allowed,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    messageCount: row.message_count,
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
        added_by_telegram_user_id = COALESCE(
          bot_installations.added_by_telegram_user_id,
          EXCLUDED.added_by_telegram_user_id
        ),
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
    `SELECT
        installations.*,
        register_topic.id AS register_topic_id,
        register_topic.message_thread_id AS register_topic_message_thread_id,
        register_topic.name AS register_topic_name,
        paid_topic.id AS paid_topic_id,
        paid_topic.message_thread_id AS paid_topic_message_thread_id,
        paid_topic.name AS paid_topic_name
       FROM bot_installations installations
       LEFT JOIN bot_installation_topics register_topic
         ON register_topic.id = installations.agenda_register_topic_id
       LEFT JOIN bot_installation_topics paid_topic
         ON paid_topic.id = installations.agenda_paid_topic_id
      WHERE installations.telegram_chat_id = $1`,
    [telegramChatId],
  );

  return mapInstallation(result.rows[0]) || null;
}

async function topicBelongsToInstallation(topicId, botInstallationId) {
  if (!topicId) {
    return true;
  }

  const result = await query(
    `SELECT id
       FROM bot_installation_topics
      WHERE id = $1
        AND bot_installation_id = $2
      LIMIT 1`,
    [topicId, botInstallationId],
  );

  return result.rowCount > 0;
}

async function updateBotInstallationTopicSettings(telegramChatId, data = {}) {
  const installation = await getBotInstallationByTelegramChatId(telegramChatId);
  if (!installation) {
    return null;
  }

  const agendaRegisterTopicId = data.agendaRegisterTopicId || null;
  const agendaPaidTopicId = data.agendaPaidTopicId || null;

  if (
    !(await topicBelongsToInstallation(
      agendaRegisterTopicId,
      installation.id,
    ))
  ) {
    const error = new Error(
      "agendaRegisterTopicId must belong to the selected bot installation",
    );
    error.status = 400;
    throw error;
  }

  if (!(await topicBelongsToInstallation(agendaPaidTopicId, installation.id))) {
    const error = new Error(
      "agendaPaidTopicId must belong to the selected bot installation",
    );
    error.status = 400;
    throw error;
  }

  await query(
    `UPDATE bot_installations
        SET agenda_register_topic_id = $1,
            agenda_paid_topic_id = $2,
            updated_at = NOW()
      WHERE telegram_chat_id = $3`,
    [agendaRegisterTopicId, agendaPaidTopicId, telegramChatId],
  );

  return getBotInstallationByTelegramChatId(telegramChatId);
}

async function upsertBotInstallationTopic(data = {}) {
  const { telegramChatId, messageThreadId } = data;
  const name = data.name || null;

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
        SELECT id, $2, COALESCE($3, $4)
          FROM installation
        ON CONFLICT (bot_installation_id, message_thread_id)
        DO UPDATE SET
          name = COALESCE($3, bot_installation_topics.name),
          is_active = TRUE,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING *
      )
      SELECT upserted.*, installation.telegram_chat_id
        FROM upserted
        JOIN installation ON installation.id = upserted.bot_installation_id`,
    [telegramChatId, messageThreadId, name, `Topic ${messageThreadId}`],
  );

  return mapTopic(result.rows[0]) || null;
}

async function getBotInstallationTopicsByTelegramChatId(telegramChatId) {
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

async function upsertBotInstallationUser(data = {}) {
  const { telegramChatId, telegramUserId } = data;

  const result = await query(
    `WITH installation AS (
        SELECT id, telegram_chat_id
          FROM bot_installations
         WHERE telegram_chat_id = $1
      ), telegram_user AS (
        SELECT id, telegram_id
          FROM users
         WHERE telegram_id = $2
      ), upserted AS (
        INSERT INTO bot_installation_users (
          bot_installation_id,
          user_id,
          telegram_chat_id,
          telegram_user_id
        )
        SELECT
          installation.id,
          telegram_user.id,
          installation.telegram_chat_id,
          telegram_user.telegram_id
        FROM installation
        CROSS JOIN telegram_user
        ON CONFLICT (bot_installation_id, user_id)
        DO UPDATE SET
          telegram_chat_id = EXCLUDED.telegram_chat_id,
          telegram_user_id = EXCLUDED.telegram_user_id,
          last_seen_at = NOW(),
          message_count = bot_installation_users.message_count + 1,
          updated_at = NOW()
        RETURNING *
      )
      SELECT
        upserted.*,
        users.username,
        users.first_name,
        users.last_name,
        users.display_name,
        users.is_admin,
        users.is_allowed
      FROM upserted
      JOIN users ON users.id = upserted.user_id`,
    [telegramChatId, telegramUserId],
  );

  return mapInstallationUser(result.rows[0]) || null;
}

async function getBotInstallationUsersByTelegramChatId(telegramChatId) {
  const result = await query(
    `SELECT
        installation_users.*,
        users.username,
        users.first_name,
        users.last_name,
        users.display_name,
        users.is_admin,
        users.is_allowed
      FROM bot_installation_users installation_users
      JOIN bot_installations installations
        ON installations.id = installation_users.bot_installation_id
      JOIN users
        ON users.id = installation_users.user_id
      WHERE installations.telegram_chat_id = $1
      ORDER BY
        installation_users.last_seen_at DESC,
        users.display_name ASC NULLS LAST,
        users.telegram_id ASC`,
    [telegramChatId],
  );

  return result.rows.map(mapInstallationUser);
}

async function getBotInstallationsByTelegramUserId(telegramUserId) {
  const result = await query(
    `SELECT
        installations.*,
        installation_users.first_seen_at AS membership_first_seen_at,
        installation_users.last_seen_at AS membership_last_seen_at,
        installation_users.message_count AS membership_message_count
      FROM bot_installation_users installation_users
      JOIN bot_installations installations
        ON installations.id = installation_users.bot_installation_id
      JOIN users
        ON users.id = installation_users.user_id
      WHERE users.telegram_id = $1
        AND installations.chat_type IN ('group', 'supergroup', 'channel')
        AND installations.bot_status = 'active'
      ORDER BY
        installation_users.last_seen_at DESC,
        installations.title ASC NULLS LAST,
        installations.telegram_chat_id ASC`,
    [telegramUserId],
  );

  return result.rows.map((row) => ({
    ...mapInstallation(row),
    membership: {
      firstSeenAt: row.membership_first_seen_at,
      lastSeenAt: row.membership_last_seen_at,
      messageCount: row.membership_message_count,
    },
  }));
}

export {
  getBotInstallationByTelegramChatId,
  getBotInstallations,
  getBotInstallationsByTelegramUserId,
  getBotInstallationTopicsByTelegramChatId,
  getBotInstallationUsersByTelegramChatId,
  isInstallationChatType,
  upsertBotInstallation,
  upsertBotInstallationTopic,
  upsertBotInstallationUser,
  updateBotInstallationTopicSettings,
};
