import { asTelegramUser } from "./context.js";
import { getCurrentUser } from "../api/backendClient.js";
import { registerTelegramUserAndMembership } from "../utilities/registerTelegramUserAndMembership.js";

// Boundaries here keep asynchronous requests from concurrent updates under the right identity.
export function createUserGuard(bot, { register = registerTelegramUserAndMembership, authorize = getCurrentUser, clear = () => {} } = {}) {
  return (handler, { callback = false, quiet = false } = {}) => async (update, ...args) => {
    if (!update.from?.id) return;
    return asTelegramUser(update.from.id, async () => {
      const msg = callback ? { ...update.message, from: update.from } : update;
      try {
        await register(msg);
        await authorize(); // Backend reads current DB flags on every update; no permission cache.
        await handler(update, ...args);
      } catch (error) {
        if (error.status === 401 || error.status === 403) await clear(update.from.id);
        console.error("Bot operation failed", { status: error.status || 500 });
        if (callback) {
          if (!error.callbackAcknowledged) {
            await bot.answerCallbackQuery(update.id, { text: "Operação não permitida ou indisponível.", show_alert: true }).catch(() => {});
          }
          return;
        }
        if (!quiet && msg.chat?.id) await bot.sendMessage(msg.chat.id,
          error.status === 403 ? "Você não tem permissão para esta operação." : "Não foi possível concluir a operação agora.",
          { message_thread_id: msg.message_thread_id }).catch(() => {});
      }
    });
  };
}
