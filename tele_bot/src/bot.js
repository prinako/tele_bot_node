import { Bot } from "node-telegram-bot-api";
import env from "./config/env.js";

// Construction is side-effect free: init/handleUpdate/startPolling perform getMe.
export default function createBot({ token = env.botToken, transportOptions } = {}) {
  return new Bot(token, transportOptions);
}
