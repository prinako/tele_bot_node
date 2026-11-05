import createBot from "./bot.js";
import { createTelegramClient } from "./api/telegramClient.js";
import { createUserGuard } from "./auth/guard.js";
import { ConversationFlows } from "./state/memoryState.js";
import { handleUserMessage } from "./handlers/handleUserMessage.js";
import AgendaPayment from "./agendas/agenda_payment.js";
import SomeonePaid from "./agendas/someone_paid.js";
import Paid from "./agendas/paid.js";
import Pix from "./agendas/add_pix_to_db.js";
import DeleteAgenda from "./agendas/delete_agenda.js";

export function logBotError(message, error, extra = {}) {
  // SDK/network messages and stacks can contain request URLs and credentials.
  console.error(message, { ...extra, name: error?.name, code: error?.code, status: error?.errorCode || error?.status });
}

export function createTelegramIntegration({ token, transportOptions, guardOptions, flowOptions } = {}) {
  const bot = createBot({ token, transportOptions });
  const client = createTelegramClient(bot.api);
  const flows = new ConversationFlows(client, flowOptions);
  const guard = createUserGuard(client, { ...guardOptions, clear: actorId => flows.clearUser(actorId) });
  const command = (name, handler) => {
    const guarded = guard(handler);
    bot.command(name, ctx => guarded({ ...ctx.message, from: ctx.from }));
  };

  // A matched command is terminal: it does not fall through into the message flow.
  command("cancel", async msg => {
    await flows.cancel(msg);
    await client.sendMessage(msg.chat.id, "Operação cancelada", { message_thread_id: msg.message_thread_id });
  });
  command("start", msg => client.sendMessage(msg.chat.id, "Please use /agenda to start the process.", {
    message_thread_id: msg.message_thread_id,
  }));
  command("agenda", msg => flows.start(msg, scoped => new AgendaPayment(scoped), flow => flow.start(msg)));
  command("help", msg => client.sendMessage(msg.chat.id,
    "Comandos disponíveis:\n /agenda - Para registrar o pagamento de fatura em pendente.\n /cancel - Para cancelar a operação atual.\n /pagou - Para adicionar quem pagou a parte dele.\n /registerpix - Para registrar sua chave PIX.\n /delete - Para deletar uma fatura registrada.\n /whopaid - Para saber quem pagou.\n /ia - Para conversar com o bot.",
    { message_thread_id: msg.message_thread_id }));
  command("whopaid", msg => flows.start(msg, scoped => new SomeonePaid(scoped), flow => flow.addWhoPaid(msg)));
  command("pagou", msg => flows.start(msg, scoped => new Paid(scoped), flow => flow.paid(msg)));
  command("registerpix", msg => flows.start(msg, scoped => new Pix(scoped), flow => flow.addPix(msg)));
  command("delete", async msg => {
    await flows.cancel(msg);
    await new DeleteAgenda(client).deleteAgenda(msg);
  });
  command("ia", msg => client.sendMessage(msg.chat.id,
    "Oi, sou a inteligência artificial do bot de faturas.\n\nNo momento, sou apenas um bot de faturas.\n\nPara saber mais sobre mim, digite /help",
    { message_thread_id: msg.message_thread_id }));

  const message = guard(msg => handleUserMessage(client, msg, flows), { quiet: true });
  const callback = guard(query => flows.callback(query), { callback: true });
  bot.on("message", ctx => message({ ...ctx.message, from: ctx.from }));
  bot.on("callback_query", ctx => callback({ ...ctx.callbackQuery, from: ctx.from }));
  bot.catch((error, ctx) => logBotError("Telegram update failed", error, { updateId: ctx.update.update_id }));
  return { bot, client, flows };
}
