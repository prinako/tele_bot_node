import SchedulesEveryday from "./schedules/schedules_everyday.js";
import { logBotError } from "./integration.js";

// Own signals and error logging rather than run(), whose fatal log includes raw errors.
export async function runBot({ bot, client, flows }, {
  signals = process,
  createSchedule = transport => new SchedulesEveryday(transport),
} = {}) {
  let stopping = false;
  let scheduler;
  const stop = () => { stopping = true; bot.stop(); };
  // Register lifecycle only at explicit startup. handleUpdate() in tests has no timers.
  const resources = Object.assign(async (_ctx, next) => next(), {
    init() { if (!stopping) scheduler = createSchedule(client); },
    async close() { await scheduler?.task?.destroy(); },
  });
  bot.use(resources);
  signals.on("SIGINT", stop);
  signals.on("SIGTERM", stop);
  try {
    await bot.startPolling(undefined, {
      onError: error => logBotError("Telegram polling retry", error),
    });
    if (!stopping) throw new Error("Telegram polling stopped unexpectedly");
  } finally {
    signals.off("SIGINT", stop);
    signals.off("SIGTERM", stop);
    try { await bot.close(); }
    finally { flows.dispose(); }
  }
}
