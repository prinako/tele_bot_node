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
import { ConversationFlows } from "./state/memoryState.js";

/**
 * Creates a new instance of the bot.
 *
 * @returns {TelegramBot} The bot instance.
 */
if (env.botApiToken.length < 32) {
  throw new Error("BOT_API_TOKEN must contain at least 32 characters");
}

const bot = createBot();

const flows = new ConversationFlows(bot);

const guard = createUserGuard(
  bot, 
  { 
    clear: (actorId) => flows.clearUser(actorId) 
  }
);

function onCommand(pattern, handler) { bot.onText(pattern, guard(handler)); }

new SchedulesEveryday(bot);

onCommand(/\/cancel/, async (msg) => {
  await flows.cancel(msg);
  await bot.sendMessage(
    msg.chat.id, "Operação cancelada", { 
      message_thread_id: msg.message_thread_id 
    }
  );
});

// Command /start to initiate the month selection
onCommand(/\/start/, (msg) => {

  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Please use /agenda to start the process.", {
    reply_markup: {},
  });
});

// Command /agenda to initiate the month selection
onCommand(/\/agenda/, (msg) => flows.start(
    msg, 
    scopedBot => new AgendaPayment(scopedBot),
    flow => flow.start(msg)
  )
);

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

onCommand(/\/whopaid/, (msg) => flows.start(msg, scopedBot => new SomeonePaid(scopedBot), flow => flow.addWhoPaid(msg)));
onCommand(/\/pagou/, (msg) => flows.start(msg, scopedBot => new Paid(scopedBot), flow => flow.paid(msg)));
onCommand(/\/registerpix/, (msg) => flows.start(msg, scopedBot => new Pix(scopedBot), flow => flow.addPix(msg)));
onCommand(/\/delete/, async (msg) => {
  await flows.cancel(msg);
  await new DeleteAgenda(bot).deleteAgenda(msg);
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

// Keep registration and current backend permission checks around every update.
bot.on("message", guard((msg) => handleUserMessage(bot, msg, flows), { quiet: true }));
bot.on("callback_query", guard((query) => flows.callback(query), { callback: true }));
