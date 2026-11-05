import { asTelegramUser } from "./context.js";
import { getCurrentUser } from "../api/backendClient.js";
import { registerTelegramUserAndMembership } from "../utilities/registerTelegramUserAndMembership.js";

async function notifyCallbackFailure(bot, error, update) {
  if (error.callbackAcknowledged) return;
  await bot.answerCallbackQuery(update.id, {
    text: "Operação não permitida ou indisponível.", show_alert: true,
  }).catch(() => {});
}

async function notifyFailure(bot, error, update, msg, { callback, quiet }) {
  if (callback) return notifyCallbackFailure(bot, error, update);
  if (quiet) return;
  if (!msg.chat?.id) return;
  const text = error.status === 403
    ? "Você não tem permissão para esta operação."
    : "Não foi possível concluir a operação agora.";
  await bot.sendMessage(msg.chat.id, text, {
    message_thread_id: msg.message_thread_id,
  }).catch(() => {});
}

async function handleFailure({ bot, clear }, error, update, msg, options) {
  if ([401, 403].includes(error.status)) await clear(update.from.id);
  console.error("Bot operation failed", { status: error.status || 500 });
  await notifyFailure(bot, error, update, msg, options);
}

async function runGuardedUpdate(dependencies, handler, options, update, args) {
  const msg = options.callback ? { ...update.message, from: update.from } : update;
  try {
    await dependencies.register(msg);
    // Read current backend flags on every update; no permission cache.
    await dependencies.authorize();
    await handler(update, ...args);
  } catch (error) {
    await handleFailure(dependencies, error, update, msg, options);
  }
}

async function guardUpdate(dependencies, handler, options, update, ...args) {
  if (!update.from?.id) return;
  return asTelegramUser(update.from.id,
    () => runGuardedUpdate(dependencies, handler, options, update, args));
}

// Keep all asynchronous work under the sender's identity, including error handling.
export function createUserGuard(bot, { register = registerTelegramUserAndMembership, authorize = getCurrentUser, clear = () => {} } = {}) {
  const dependencies = { bot, register, authorize, clear };
  return (handler, { callback = false, quiet = false } = {}) =>
    guardUpdate.bind(null, dependencies, handler, { callback, quiet });
}
