import {
  upsertBotInstallation,
  upsertBotInstallationTopic,
} from "../api/backendClient.js";

const INSTALLATION_CHAT_TYPES = new Set([
  "private",
  "group",
  "supergroup",
  "channel",
]);

function privateChatTitle(user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    null;
}

async function registerBotInstallation(msg) {
  const chat = msg?.chat;

  if (!chat?.id || !INSTALLATION_CHAT_TYPES.has(chat.type)) {
    return null;
  }

  try {
    const installation = await upsertBotInstallation({
      telegramChatId: chat.id,
      chatType: chat.type,
      title: chat.title || privateChatTitle(msg.from) || null,
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
