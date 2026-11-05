import { randomBytes } from "node:crypto";

export function conversationKey(update) {
  const message = update.message || update;
  if (!update.from?.id || !message.chat?.id) return null;
  return `${update.from.id}:${message.chat.id}:${message.message_thread_id || 0}`;
}

// One active interaction per actor/chat/topic; different conversations run independently.
export class ConversationFlows {
  constructor(bot, { ttlMs = 15 * 60 * 1000, now = Date.now } = {}) {
    this.bot = bot;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
    this.queues = new Map();
  }

  async serialize(key, work) {
    if (!key) return false;
    const operation = (this.queues.get(key) || Promise.resolve()).catch(() => {}).then(work);
    this.queues.set(key, operation);
    try { return await operation; }
    finally { if (this.queues.get(key) === operation) this.queues.delete(key); }
  }

  active(entry) {
    return this.entries.get(entry.key) === entry && this.now() < entry.expires;
  }

  async remove(entry) {
    if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    clearTimeout(entry.timer);
    entry.tokens.clear();
    await Promise.all([...entry.keyboardIds].map(messageId =>
      this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: entry.chatId, message_id: messageId,
      }).catch(() => {})));
  }

  async drain(entry) {
    while (entry.pending.length) await Promise.all(entry.pending.splice(0));
  }

  markup(entry, markup) {
    entry.tokens.clear();
    if (!markup?.inline_keyboard) return markup;
    const inline_keyboard = markup.inline_keyboard.map(row => row.map(button => {
      if (!button.callback_data) return button;
      const token = randomBytes(12).toString("base64url");
      entry.tokens.set(token, { data: button.callback_data, stage: entry.flow.stage });
      return { ...button, callback_data: token };
    }));
    return { ...markup, inline_keyboard };
  }

  async acknowledge(entry, target, id, options) {
    if (entry.acknowledged.has(id)) return;
    entry.acknowledged.add(id);
    return target.answerCallbackQuery(id, options).catch(() => {});
  }

  isMessageContext(entry, property, chatId, options) {
    if (String(chatId) !== String(entry.chatId)) return false;
    if (property !== "sendMessage") return true;
    return (options.message_thread_id || 0) === entry.topicId;
  }

  prepareMessage(entry, property, args) {
    const optionsIndex = property === "sendMessage" ? 2 : 1;
    const options = { ...args[optionsIndex] };
    const chatId = property === "sendMessage" ? args[0] : options.chat_id;
    const isContext = this.isMessageContext(entry, property, chatId, options);
    if (isContext) {
      if (property === "editMessageReplyMarkup") args[0] = this.markup(entry, args[0]);
      else options.reply_markup = this.markup(entry, options.reply_markup);
    }
    args[optionsIndex] = options;
    const markup = property === "editMessageReplyMarkup" ? args[0] : options.reply_markup;
    return { args, options, isContext, markup };
  }

  async trackKeyboard(entry, request, response) {
    if (!request.isContext) return;
    const hasCallbacks = request.markup?.inline_keyboard?.some(row =>
      row.some(button => button.callback_data));
    if (!hasCallbacks) return;
    entry.keyboardId = response?.message_id ?? request.options.message_id;
    entry.keyboardIds.add(entry.keyboardId);
    if (!this.active(entry)) await this.remove(entry);
  }

  async sendScopedMessage(entry, target, property, args) {
    if (!this.active(entry)) return;
    const request = this.prepareMessage(entry, property, args);
    const response = await target[property](...request.args);
    await this.trackKeyboard(entry, request, response);
    return response;
  }

  trackOperation(entry, operation) {
    // Legacy interaction methods may omit await; drain still observes their failures.
    operation.catch(() => {});
    entry.pending.push(operation);
    return operation;
  }

  scopedProperty(entry, target, property) {
    if (property === "answerCallbackQuery") {
      return (id, options) => this.acknowledge(entry, target, id, options);
    }
    if (["sendMessage", "editMessageText", "editMessageReplyMarkup"].includes(property)) {
      return (...args) => this.trackOperation(entry,
        this.sendScopedMessage(entry, target, property, args));
    }
    const value = target[property];
    return typeof value === "function" ? value.bind(target) : value;
  }

  scopedBot(entry) {
    return new Proxy(this.bot, { get: this.scopedProperty.bind(this, entry) });
  }

  async start(message, factory, begin) {
    const key = conversationKey(message);
    return this.serialize(key, async () => {
      const previous = this.entries.get(key);
      if (previous) await this.remove(previous);
      const entry = { key, actorId:message.from.id, chatId:message.chat.id,
        topicId:message.message_thread_id || 0, tokens:new Map(), keyboardIds:new Set(), pending:[], acknowledged:new Set(),
        expires:this.now() + this.ttlMs };
      this.entries.set(key, entry);
      entry.flow = factory(this.scopedBot(entry));
      entry.timer = setTimeout(() => { this.remove(entry).catch(() => {}); }, this.ttlMs);
      entry.timer.unref();
      try {
        const started = await begin(entry.flow);
        await this.drain(entry);
        if (started === false) await this.remove(entry);
        return entry.flow;
      } catch (error) { await this.remove(entry); throw error; }
    });
  }

  async message(message) {
    const key = conversationKey(message);
    return this.serialize(key, async () => {
      const entry = this.entries.get(key);
      if (!entry) return false;
      if (!this.active(entry)) { await this.remove(entry); return false; }
      if (!entry.flow.acceptsText?.()) return false;
      try {
        const completed = await entry.flow.handleResponse(message);
        await this.drain(entry);
        if (completed) await this.remove(entry);
        return true;
      } catch (error) { await this.remove(entry); throw error; }
    });
  }

  async callback(query) {
    const key = conversationKey(query);
    if (!key) {
      await this.bot.answerCallbackQuery(query.id, { text: "Esta opção expirou." }).catch(() => {});
      return false;
    }
    return this.serialize(key, async () => {
      const entry = this.entries.get(key);
      const selection = entry?.tokens.get(query.data);
      if (!entry || !this.active(entry) || !selection ||
        query.message.message_id !== entry.keyboardId || selection.stage !== entry.flow.stage) {
        if (entry && !this.active(entry)) await this.remove(entry);
        await this.bot.answerCallbackQuery(query.id, {text:"Esta opção expirou. Inicie a operação novamente."}).catch(() => {});
        return false;
      }
      entry.tokens.delete(query.data);
      try {
        const callback = { ...query, data:selection.data };
        if (selection.data === "/cancel") { await this.remove(entry); return true; }
        const completed = await entry.flow.handleCallback(callback);
        await this.drain(entry);
        if (completed) await this.remove(entry);
        return true;
      } catch (error) {
        await this.remove(entry);
        if (!entry.acknowledged.has(query.id)) {
          await entry.flow.bot.answerCallbackQuery(query.id, {
            text: "Não foi possível concluir a operação agora.", show_alert: true,
          });
        }
        error.callbackAcknowledged = true;
        throw error;
      } finally {
        if (!entry.acknowledged.has(query.id)) {
          await this.bot.answerCallbackQuery(query.id).catch(() => {});
        }
        entry.acknowledged.delete(query.id);
      }
    });
  }

  async cancel(message) {
    const key = conversationKey(message);
    return this.serialize(key, async () => {
      const entry = this.entries.get(key);
      if (entry) await this.remove(entry);
    });
  }

  async clearUser(actorId) {
    await Promise.all([...this.entries.values()].filter(entry => entry.actorId === actorId).map(entry => this.remove(entry)));
  }
}
