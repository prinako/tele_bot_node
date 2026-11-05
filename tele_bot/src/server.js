import { pathToFileURL } from "node:url";
import env from "./config/env.js";
import { createTelegramIntegration, logBotError } from "./integration.js";
import { runBot } from "./lifecycle.js";

export async function main({ 
  config = env, 
  createIntegration = createTelegramIntegration, 
  run = runBot 
} = {}) {
  if (config.botApiToken.length < 32) throw new Error("BOT_API_TOKEN must contain at least 32 characters");
  if (!config.botToken) throw new Error("BOT_TOKEN is required");
  await run(createIntegration({ token: config.botToken }));
}

// Importing the real integration/entrypoint never starts polling or a scheduler.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    logBotError("Telegram bot stopped", error);
    process.exitCode = 1;
  });
}
