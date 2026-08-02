import createBot from "./bot.js";
import AgendaPayment from "./agendas/agenda_payment.js";
import SomeonePaid from "./agendas/someone_paid.js";
import SchedulesEveryday from "./schedules/schedules_everyday.js";
import Paid from "./agendas/paid.js";
import Pix from "./agendas/add_pix_to_db.js";
import DeleteAgenda from "./agendas/delete_agenda.js";
import { registerTelegramUserAndMembership } from "./utilities/registerTelegramUserAndMembership.js";
import { handleUserMessage } from "./handlers/handleUserMessage.js";
import {
  agendaUsersState,
  deleteAgendaState,
  pagouState,
  paidState,
  pixState,
} from "./state/memoryState.js";

/**
 * Creates a new instance of the bot.
 *
 * @returns {TelegramBot} The bot instance.
 */
const bot = createBot();

new SchedulesEveryday(bot);

const trackedRegistrationMessages = new Set();

/**
 * Generates a unique key for a Telegram registration message.
 *
 * @param {Object} msg - The Telegram message object.
 * @returns {string} The generated key.
 */
function registrationKey(msg = {}) {
  return [
    msg.chat?.id || "no-chat",
    msg.message_id || "no-message",
    msg.from?.id || "no-from",
  ].join(":");
}

/**
 * Registers a Telegram user and their membership in a bot installation.
 *
 * @param {Object} msg - The Telegram message object.
 */
function trackTelegramUserAndMembership(msg) {
  const key = registrationKey(msg);
  if (trackedRegistrationMessages.has(key)) {
    return;
  }

  trackedRegistrationMessages.add(key);
  if (trackedRegistrationMessages.size > 1000) {
    trackedRegistrationMessages.clear();
  }

  void registerTelegramUserAndMembership(msg).catch((error) => {
    console.error("Failed to register Telegram user/membership:", error);
  });
}

bot.onText(/\/cancel/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  if (agendaUsersState[userId]) {
    delete agendaUsersState[userId];
  }
  if (paidState[userId]) {
    delete paidState[userId];
  }
  if (pixState[userId]) {
    delete pixState[userId];
  }
  bot.sendMessage(msg.chat.id, "Operação cancelada", {
    message_thread_id: msg.message_thread_id,
  });
});

// Command /start to initiate the month selection
bot.onText(/\/start/, (msg) => {
  trackTelegramUserAndMembership(msg);

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Please use /agenda to start the process.", {
    reply_markup: {},
  });
});

// Command /agenda to initiate the month selection
bot.onText(/\/agenda/, async (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;
  if (agendaUsersState[userId]) {
    delete agendaUsersState[userId];
  }
  agendaUsersState[userId] = new AgendaPayment(bot);

  try {
    const started = await agendaUsersState[userId].start(msg);
    if (!started) {
      delete agendaUsersState[userId];
    }
  } catch (error) {
    console.error("Failed to start agenda flow:", error);
    delete agendaUsersState[userId];
    await bot.sendMessage(
      msg.chat.id,
      "Não consegui iniciar a agenda agora. Tente novamente em alguns instantes.",
      { message_thread_id: msg.message_thread_id },
    );
  }
});

bot.onText(/\/help/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  bot.sendMessage(
    msg.chat.id,
    "Comandos disponíveis:\n /agenda - Para registrar o pagamento de fatura em pendente.\n /cancel - Para cancelar a operação atual.\n /pagou - Para adicionar quem pagou a parte dele.\n /registerpix - Para registrar sua chave PIX.\n /delete - Para deletar uma fatura registrada.\n /whopaid - Para saber quem pagou.\n /ia - Para conversar com o bot.",
    {
      message_thread_id: msg.message_thread_id,
      chat_id: msg.chat.id,
      message_id: msg.message_id,
    },
  );
});

bot.onText(/\/whopaid/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  if (paidState[userId]) {
    paidState[userId] = {};
  }
  paidState[userId] = new SomeonePaid(bot);
  paidState[userId].addWhoPaid(msg);
});

bot.onText(/\/pagou/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;
  pagouState[userId] = new Paid(bot);
  pagouState[userId].paid(msg);
});

bot.onText(/\/registerpix/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  pixState[userId] = new Pix(bot);
  pixState[userId].addPix(msg);
});

bot.onText(/\/delete/, (msg) => {
  trackTelegramUserAndMembership(msg);
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  deleteAgendaState[userId] = new DeleteAgenda(bot);
  deleteAgendaState[userId].deleteAgenda(msg);
});

bot.onText(/\/ia/, (msg) => {
  trackTelegramUserAndMembership(msg);

  bot.sendMessage(
    msg.chat.id,
    "Oi, sou a inteligência artificial do bot de faturas.\n\nNo momento, sou apenas um bot de faturas.\n\nPara saber mais sobre mim, digite /help",
    {
      message_thread_id: msg.message_thread_id,
      chat_id: msg.chat.id,
      message_id: msg.message_id,
    },
  );
});

// Handle user responses
bot.on("message", (msg) => {
  trackTelegramUserAndMembership(msg);
  handleUserMessage(bot, msg);
});

// Handle callback queries
bot.on("callback_query", async (callbackQuery) => {
  if (callbackQuery.message) {
    trackTelegramUserAndMembership({
      ...callbackQuery.message,
      from: callbackQuery.from,
    });
  }

  if (callbackQuery.data === "/cancel") {
    return;
  }
  // Get the user ID of the message
  const userId = callbackQuery.from.id;

  if (agendaUsersState[userId]) {
    const isCompleted = await agendaUsersState[userId].handleKeyboard(
      callbackQuery,
    );
    if (isCompleted) {
      delete agendaUsersState[userId];
    }
  }
  if (paidState[userId]) {
    paidState[userId].handlePaid(callbackQuery);
  }
  if (pixState[userId]) {
    pixState[userId].handlePix(callbackQuery);
  }
  if (pagouState[userId]) {
    pagouState[userId].handlePaid(callbackQuery);
  }
});
