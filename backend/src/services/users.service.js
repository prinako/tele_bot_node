import {
  getAllowedTelegramUsers,
  getAllUsers,
  getUserByTelegramId,
  updateUserByTelegramId,
  upsertTelegramUser,
} from "../repositories/users.repository.js";
import {
  getBotInstallationsByTelegramUserId,
} from "../repositories/botInstallations.repository.js";

async function upsertUser(data) {
  return upsertTelegramUser(data);
}

async function getAllowedUsers() {
  return getAllowedTelegramUsers();
}

async function listUsers() {
  return getAllUsers();
}

async function getUser(telegramId) {
  return getUserByTelegramId(telegramId);
}

async function updateUser(telegramId, data) {
  return updateUserByTelegramId(telegramId, data);
}

async function listBotInstallations(telegramUserId) {
  return getBotInstallationsByTelegramUserId(telegramUserId);
}

export {
  getAllowedUsers,
  getUser,
  listBotInstallations,
  listUsers,
  updateUser,
  upsertUser,
};
