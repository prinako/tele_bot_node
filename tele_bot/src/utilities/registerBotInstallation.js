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
      const topicName =
        msg.forum_topic_created?.name ||
        msg.forum_topic_edited?.name ||
        msg.reply_to_message?.forum_topic_created?.name ||
        msg.reply_to_message?.forum_topic_edited?.name ||
        null;

      if (process.env.LOG === "true") {
        console.log("Registering topic:", {
          telegramChatId: chat.id,
          messageThreadId: msg.message_thread_id,
          topicName,
          forumTopicCreated: msg.forum_topic_created,
          forumTopicEdited: msg.forum_topic_edited,
        });
      }

      await upsertBotInstallationTopic({
        telegramChatId: chat.id,
        messageThreadId: msg.message_thread_id,
        name: topicName,
      });
    }

    return installation;
  } catch (error) {
    console.error("Failed to register bot installation", error);
    return null;
  }
}

export { INSTALLATION_CHAT_TYPES, registerBotInstallation };
