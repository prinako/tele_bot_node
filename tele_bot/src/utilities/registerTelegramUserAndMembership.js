import { upsertBotInstallationUser, upsertUser } from "../api/backendClient.js";
import { registerBotInstallation } from "./registerBotInstallation.js";

/**
 * Registers a Telegram user and their membership in a bot installation.
 * @param {Message} msg - The Telegram message object.
 * @returns {Object} An object containing the registered installation, user, and membership.
 */
async function registerTelegramUserAndMembership(msg) {
  const installation = await registerBotInstallation(msg);
  const telegramUser = msg?.from;

  if (!telegramUser?.id) {
    return { installation, user: null, membership: null };
  }

  const user = await upsertUser({ from: telegramUser });
  let membership = null;

  if (msg?.chat?.id && installation) {
    membership = await upsertBotInstallationUser({
      telegramChatId: msg.chat.id,
      telegramUserId: telegramUser.id,
    });
  }

  return { installation, user, membership };
}

export { registerTelegramUserAndMembership };
