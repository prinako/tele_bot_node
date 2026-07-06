import {
  getBotInstallationByTelegramChatId,
  getBotInstallations,
  getBotInstallationTopicsByTelegramChatId,
  getBotInstallationUsersByTelegramChatId,
  isInstallationChatType,
  upsertBotInstallation,
  upsertBotInstallationTopic,
  upsertBotInstallationUser,
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
    throw badRequest("chatType must be private, group, supergroup, or channel");
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

  return getBotInstallationTopicsByTelegramChatId(telegramChatId);
}

async function upsertInstallationUser(data = {}) {
  requireValue(data.telegramChatId, "telegramChatId is required");
  requireValue(data.telegramUserId, "telegramUserId is required");

  const installationUser = await upsertBotInstallationUser(data);
  if (!installationUser) {
    const error = new Error("Bot installation or user not found");
    error.status = 404;
    throw error;
  }

  return installationUser;
}

async function listUsers(telegramChatId) {
  const installation = await getBotInstallationByTelegramChatId(telegramChatId);
  if (!installation) {
    return null;
  }

  return getBotInstallationUsersByTelegramChatId(telegramChatId);
}

export {
  getInstallation,
  listInstallations,
  listTopics,
  listUsers,
  upsertInstallation,
  upsertInstallationUser,
  upsertTopic,
};
