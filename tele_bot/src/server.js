import createBot from "./bot.js";
import AgendaPayment from "./agendas/agenda_payment.js";
import SomeonePaid from "./agendas/someone_paid.js";
import SchedulesEveryday from "./schedules/schedules_everyday.js";
import Paid from "./agendas/paid.js";
import Pix from "./agendas/add_pix_to_db.js";
import DeleteAgenda from "./agendas/delete_agenda.js";
import { createUserGuard } from "./auth/guard.js";
import env from "./config/env.js";
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
if (env.botApiToken.length < 32) throw new Error("BOT_API_TOKEN must contain at least 32 characters");
const bot = createBot();
function clearFlows(userId) {
  for (const state of [agendaUsersState, deleteAgendaState, pagouState, paidState, pixState]) delete state[userId];
}
const guard = createUserGuard(bot, { clear: clearFlows });
function onCommand(pattern, handler) { bot.onText(pattern, guard(handler)); }

new SchedulesEveryday(bot);

onCommand(/\/cancel/, (msg) => {
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  clearFlows(userId);
  bot.sendMessage(msg.chat.id, "Operação cancelada", {
    message_thread_id: msg.message_thread_id,
  });
});

// Command /start to initiate the month selection
onCommand(/\/start/, (msg) => {

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Please use /agenda to start the process.", {
    reply_markup: {},
  });
});

// Command /agenda to initiate the month selection
onCommand(/\/agenda/, async (msg) => {
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
    console.error("Failed to start agenda flow:", { code: error.code, status: error.status });
    delete agendaUsersState[userId];
    await bot.sendMessage(
      msg.chat.id,
      "Não consegui iniciar a agenda agora. Tente novamente em alguns instantes.",
      { message_thread_id: msg.message_thread_id },
    );
  }
});

onCommand(/\/help/, (msg) => {
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

onCommand(/\/whopaid/, (msg) => {
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  if (paidState[userId]) {
    paidState[userId] = {};
  }
  paidState[userId] = new SomeonePaid(bot);
  return paidState[userId].addWhoPaid(msg);
});

onCommand(/\/pagou/, (msg) => {
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;
  pagouState[userId] = new Paid(bot);
  return pagouState[userId].paid(msg);
});

onCommand(/\/registerpix/, (msg) => {
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  pixState[userId] = new Pix(bot);
  return pixState[userId].addPix(msg);
});

onCommand(/\/delete/, (msg) => {
  if (!msg.from?.id) {
    return;
  }

  const userId = msg.from.id;

  deleteAgendaState[userId] = new DeleteAgenda(bot);
  deleteAgendaState[userId].deleteAgenda(msg);
});

onCommand(/\/ia/, (msg) => {

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
bot.on("message", guard((msg) => {
  if (!msg.text?.startsWith("/")) handleUserMessage(bot, msg);
}, { quiet: true }));

// Handle callback queries
bot.on("callback_query", guard(async (callbackQuery) => {
  if (callbackQuery.data === "/cancel") {
    clearFlows(callbackQuery.from.id);
    await bot.answerCallbackQuery(callbackQuery.id);
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
    await paidState[userId].handlePaid(callbackQuery);
  }
  if (pixState[userId]) {
    await pixState[userId].handlePix(callbackQuery);
  }
  if (pagouState[userId]) {
    await pagouState[userId].handlePaid(callbackQuery);
  }
  await bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
}, { callback: true }));
