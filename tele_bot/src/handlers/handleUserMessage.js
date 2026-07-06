import { agendaUsersState, pixState } from "../state/memoryState.js";

const GREETINGS = new Set(["oi", "ola", "olá", "hello", "hi", "hey"]);

function sendGreeting(bot, msg, text) {
  bot.sendMessage(
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

function handleGreeting(bot, msg, text) {
  try {
    if (GREETINGS.has(text.toLowerCase())) {
      sendGreeting(bot, msg, text);
    }
  } catch (error) {
    if (process.env.LOG) {
      console.error(error);
    }
  }
}

function syncAgendaStageTracker(userId) {
  const agenda = agendaUsersState[userId];
  if (!agenda) {
    return;
  }

  if (agenda.stage === "title" || agenda.stage === "newPix") {
    agenda.stageTracker = true;
  }
}

function handleAgendaResponse(userId, msg) {
  syncAgendaStageTracker(userId);

  const agenda = agendaUsersState[userId];
  if (!agenda?.stageTracker) {
    return;
  }

  const isCompleted = agenda.handleResponse(msg);
  if (isCompleted) {
    delete agendaUsersState[userId];
  }
}

function handlePixResponse(userId, msg) {
  const pix = pixState[userId];
  if (!pix?.isStagePixChave) {
    return;
  }

  const isCompleted = pix.handleResponse(msg);
  if (isCompleted) {
    delete pixState[userId];
  }
}

export function handleUserMessage(bot, msg) {
  const text = msg.text;

  if (process.env.LOG) {
    console.debug(msg);
  }

  if (!text || text === "/cancel" || !msg.from?.id) {
    return;
  }

  handleGreeting(bot, msg, text);
  handleAgendaResponse(msg.from.id, msg);
  handlePixResponse(msg.from.id, msg);
}
