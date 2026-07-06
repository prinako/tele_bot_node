import {
  getBotInstallationByTelegramChatId,
  getBotInstallations,
  getBotInstallationTopics,
  isInstallationChatType,
  upsertBotInstallation,
  upsertBotInstallationTopic,
} from "../repositories/botInstallations.repository.js";

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireValue(value, message) {
  if (value === undefined || value === null || value === "") {
    throw badRequest(message);
  }
}

async function upsertInstallation(data = {}) {
  requireValue(data.telegramChatId, "telegramChatId is required");
  requireValue(data.chatType, "chatType is required");

  if (!isInstallationChatType(data.chatType)) {
    throw badRequest("chatType must be group, supergroup, or channel");
  }

  return upsertBotInstallation(data);
}

async function listInstallations() {
  return getBotInstallations();
}

async function getInstallation(telegramChatId) {
  return getBotInstallationByTelegramChatId(telegramChatId);
}

async function upsertTopic(data = {}) {
  requireValue(data.telegramChatId, "telegramChatId is required");
  requireValue(data.messageThreadId, "messageThreadId is required");

  const topic = await upsertBotInstallationTopic(data);
  if (!topic) {
    const error = new Error("Bot installation not found");
    error.status = 404;
    throw error;
  }

  return topic;
}

async function listTopics(telegramChatId) {
  const installation = await getBotInstallationByTelegramChatId(telegramChatId);
  if (!installation) {
    return null;
  }

  return getBotInstallationTopics(telegramChatId);
}

export {
  getInstallation,
  listInstallations,
  listTopics,
  upsertInstallation,
  upsertTopic,
};
