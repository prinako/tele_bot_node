import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage();
export function asTelegramUser(telegramId, handler) {
  return context.run({ telegramId: String(telegramId) }, handler);
}
export function currentTelegramUser() {
  return context.getStore()?.telegramId;
}
