const GREETINGS = new Set(["oi", "ola", "olá", "hello", "hi", "hey"]);

function sendGreeting(bot, msg, text) {
  return bot.sendMessage(
    msg.chat.id,
    text +
      " " +
      msg.from.first_name +
      ", sou a inteligência artificial do bot de faturas.\n\n Vou te ajudar a registrar o pagamento de faturas.\n\nPara saber mais sobre mim, digite /agenda",
    {
      message_thread_id: msg.message_thread_id,
      chat_id: msg.chat.id,
      message_id: msg.message_id,
    },
  );
}

async function handleGreeting(bot, msg, text) {
  try {
    if (GREETINGS.has(text.toLowerCase())) {
      await sendGreeting(bot, msg, text);
    }
  } catch (error) {
    if (process.env.LOG === "true") {
      console.error("Operation failed", { code: error.code, status: error.status });
    }
  }
}

export async function handleUserMessage(bot, msg, flows) {
  if (!msg.text || msg.text.startsWith("/") || !msg.from?.id) return;
  if (!await flows.message(msg)) await handleGreeting(bot, msg, msg.text);
}
