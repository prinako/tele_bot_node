// The project conversation interface stays independent of SDK middleware/context.
// Only this adapter calls Telegram's wire API, using v2 parameter objects.
function normalizeMarkup(markup, { editing = false } = {}) {
  if (markup?.inline_keyboard) {
    return { inline_keyboard: markup.inline_keyboard.filter(row => row.length) };
  }
  if (editing || !markup || !Object.keys(markup).length) return undefined;
  return markup;
}

export function createTelegramClient(api) {
  return {
    sendMessage(chatId, text, options = {}) {
      // message_id was never a sendMessage parameter; edits keep their message_id.
      const { message_id, ...other } = options;
      return api.sendMessage({ ...other, chat_id: chatId, text,
        reply_markup: normalizeMarkup(options.reply_markup) });
    },
    editMessageText(text, options = {}) {
      return api.editMessageText({ ...options, text,
        reply_markup: normalizeMarkup(options.reply_markup, { editing: true }) });
    },
    editMessageReplyMarkup(replyMarkup, options = {}) {
      return api.editMessageReplyMarkup({ ...options,
        reply_markup: normalizeMarkup(replyMarkup, { editing: true }) });
    },
    answerCallbackQuery(id, options = {}) {
      return api.answerCallbackQuery({ ...options, callback_query_id: id });
    },
  };
}
