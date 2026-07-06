import {
  upsertBotInstallation,
  upsertBotInstallationTopic,
} from "../api/backendClient.js";

const INSTALLATION_CHAT_TYPES = new Set([
  "group",
  "supergroup",
  "channel",
]);

async function registerBotInstallation(msg) {
  const chat = msg?.chat;

  if (!chat?.id || !INSTALLATION_CHAT_TYPES.has(chat.type)) {
    return null;
  }

  try {
    const installation = await upsertBotInstallation({
      telegramChatId: chat.id,
      chatType: chat.type,
      title: chat.title || null,
      username: chat.username || null,
      addedByTelegramUserId: msg.from?.id || null,
    });

    if (msg.message_thread_id) {
      await upsertBotInstallationTopic({
        telegramChatId: chat.id,
        messageThreadId: msg.message_thread_id,
        name: msg.forum_topic_created?.name ||
          msg.forum_topic_edited?.name ||
          `Topic ${msg.message_thread_id}`,
      });
    }

    return installation;
  } catch (error) {
    console.error("Failed to register bot installation", error);
    return null;
  }
}

export { INSTALLATION_CHAT_TYPES, registerBotInstallation };
