function backendResult(path, options, actor, { group, bill }) {
  if (path === "/api/auth/me") return { role: "admin", telegramId: actor };
  if (path === "/api/banks") return [{ name: "Inter" }];
  if (path.endsWith("/bot-installations")) return [group];
  if (path === "/api/bot-installations/upsert") return group;
  if (path.endsWith("/users")) return [{ telegramId: 123 }, { telegramId: 456 }];
  if (path.startsWith("/api/agenda/user/")) return [bill];
  if (path === "/api/pix" && !options.method) return [{ id: "pix", bank: "Inter", pix: "fixture-key" }];
  if (path.startsWith("/api/agenda")) return bill;
  return {};
}

function createBackendFetch({ blocked, backendCalls, group, bill }) {
  return async (url, options = {}) => {
    const path = new URL(url).pathname;
    const actor = options.headers?.["X-Telegram-User-Id"];
    backendCalls.push({ path, actor, options });
    if (path === "/api/auth/me" && blocked.has(actor)) {
      return { ok: false, status: 403, json: async () => ({ error: "Blocked" }) };
    }
    const result = backendResult(path, options, actor, { group, bill });
    return { ok: true, status: 200, json: async () => result };
  };
}

function createTelegramFetch({ telegramCalls, messages, identity, telegramOverride }) {
  let messageId = 0;
  return async (url, init) => {
    const method = new URL(url).pathname.split("/").at(-1);
    const params = Object.fromEntries(new URLSearchParams(init.body));
    telegramCalls.push({method,params});
    const override = await telegramOverride?.(method, params, init);
    if (override) return override;
    let result = true;
    if (method === "getMe") result = identity;
    else if (method === "sendMessage") {
      result = {message_id:++messageId, date:1, from:identity, chat:{id:Number(params.chat_id),type:"supergroup"},
        text:params.text,message_thread_id:params.message_thread_id ? Number(params.message_thread_id) : undefined,
        reply_markup:params.reply_markup ? JSON.parse(params.reply_markup) : undefined};
      messages.set(`${params.chat_id}:${result.message_id}`,result);
    } else if (method.startsWith("editMessage")) {
      const key = `${params.chat_id}:${params.message_id}`;
      result = {...messages.get(key),text:params.text,reply_markup:params.reply_markup ? JSON.parse(params.reply_markup) : undefined};
      messages.set(key,result);
    } else if (method === "getUpdates") throw new Error("Polling is forbidden in update-routing tests");
    return Response.json({ok:true,result});
  };
}

function createUpdates(messages) {
  let updateId = 0;
  function message(text, {actor=123,chat=-10,topic=7}={}) {
    return {update_id:++updateId,message:{message_id:10000+updateId,date:1,
      from:{id:actor,is_bot:false,first_name:`Fixture ${actor}`},chat:{id:chat,type:"supergroup",title:"Fixture group"},
      message_thread_id:topic,is_topic_message:true,text}};
  }
  function keyboard(chat=-10, topic=7) {
    const msg = [...messages.values()].reverse().find(m=>m.chat.id===chat && m.message_thread_id===topic && m.reply_markup?.inline_keyboard?.flat().some(b=>b.callback_data));
    if (!msg) throw new Error("No fixture keyboard");
    return msg;
  }
  function callback(msg=keyboard(), {actor=123, text}={}) {
    const button=msg.reply_markup.inline_keyboard.flat().find(b=>!text || b.text.includes(text));
    if (!button) throw new Error(`No fixture button ${text}`);
    return {update_id:++updateId,callback_query:{id:`query-${updateId}`,from:{id:actor,is_bot:false,first_name:"Fixture"},chat_instance:"fixture",message:msg,data:button.callback_data}};
  }
  return { message, keyboard, callback };
}

// Imported only by tests; synthetic identities/credentials and in-memory transports.
export function sdkFixture(createIntegration, { blocked = new Set(), now, telegramOverride } = {}) {
  const telegramCalls = [];
  const backendCalls = [];
  const messages = new Map();
  const identity = { id:999, is_bot:true, first_name:"Fixture bot", username:"telebot_test_bot" };
  const group = { telegramChatId:-10, title:"Fixture group", chatType:"supergroup" };
  const bill = { id:"fixture-bill", _id:"fixture-bill", senderId:123, chatId:-10, title:"Fixture bill",
    date:"01/12/2026", amount:"10.00", allocatedAmount:"10.02", surplusAmount:"0.02", description:"Fixture",
    members:[{telegramId:123,isResponsible:true,isPaid:false}] };
  globalThis.fetch = createBackendFetch({ blocked, backendCalls, group, bill });
  const telegramFetch = createTelegramFetch({ telegramCalls, messages, identity, telegramOverride });
  const integration = createIntegration({token:"999:fixture-token",transportOptions:{fetch:telegramFetch,maxRetries:0},flowOptions: now ? {now} : undefined});
  return {...integration,telegramCalls,backendCalls,messages,...createUpdates(messages),identity};
}
