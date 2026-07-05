import {
  getAllowedTelegramUsers,
  getUserByTelegramId,
  upsertTelegramUser,
} from "../repositories/users.repository.js";

async function upsertUser(data) {
  return upsertTelegramUser(data);
}

async function getAllowedUsers() {
  return getAllowedTelegramUsers();
}

async function getUser(telegramId) {
  return getUserByTelegramId(telegramId);
}

export { getAllowedUsers, getUser, upsertUser };
