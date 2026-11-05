import { test, after } from "node:test";
import assert from "node:assert/strict";
import { ConversationFlows } from "../src/state/memoryState.js";
import Pix from "../src/agendas/add_pix_to_db.js";
import Agenda from "../src/agendas/agenda_payment.js";
import Paid from "../src/agendas/paid.js";
import SomeonePaid from "../src/agendas/someone_paid.js";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
const bill = {id:"bill-test",_id:"bill-test", title:"Demo", amount:"10.00", date:"01/12/2026", chatId:-10, senderId:123,
  members:[{telegramId:123,isResponsible:true,isPaid:false},{telegramId:456,isResponsible:true,isPaid:false}]};
function fixture(options) {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    requests.push({path,method:init.method || "GET",body:init.body});
    let data = bill;
    if (path === "/api/banks") data = [{name:"Inter"}];
    else if (path === "/api/auth/me") data = {role:"admin"};
    else if (path.endsWith("/bot-installations")) data = [{telegramChatId:-10,title:"Demo group",chatType:"supergroup"}];
    else if (path.endsWith("/users")) data = [{telegramId:123},{telegramId:456}];
    else if (path.startsWith("/api/agenda/user/")) data = [bill];
    else if (path === "/api/pix" && !init.method) data = [{id:"pix",bank:"Inter",pix:"test-key"}];
    else if (path.startsWith("/api/bot-installations/")) data = {};
    return {ok:true,json:async () => data};
  };
  let nextMessage = 0;
  let nextCallback = 0;
  const messages = new Map();
  const acknowledgements = [];
  const bot = {
    async sendMessage(chatId, text, options = {}) {
      const message = {chat:{id:chatId},message_id:++nextMessage,message_thread_id:options.message_thread_id,text,...options};
      messages.set(message.message_id,message); return message;
    },
    async editMessageText(text, options) {
      const message = {...messages.get(options.message_id),text,reply_markup:options.reply_markup};
      messages.set(options.message_id,message); return message;
    },
    async editMessageReplyMarkup(markup, options) {
      const message = {...messages.get(options.message_id),reply_markup:markup};
      messages.set(options.message_id,message); return message;
    },
    async answerCallbackQuery(id) { acknowledgements.push(id); },
  };
  const flows = new ConversationFlows(bot, options);
  function message(chatId=-1, actor=123, topic=0) {return {chat:{id:chatId},from:{id:actor},message_thread_id:topic};}
  function keyboard() {
    return [...messages.values()].reverse().find(m => m.reply_markup?.inline_keyboard?.flat().some(b=>b.callback_data));
  }
  function query(text, msg=keyboard(), actor=123) {
    const button = msg.reply_markup.inline_keyboard.flat().find(b=>!text || b.text.includes(text));
    assert.ok(button, `Missing button ${text}`);
    return {id:`callback-${++nextCallback}`,from:{id:actor},message:msg,data:button.callback_data};
  }
  return {flows,requests,bot,messages,acknowledgements,message,keyboard,query};
}

test("PIX flows isolate actor/chat/topic and reject completed and replaced keyboards", async () => {
  const f=fixture();
  const a=f.message(-1,123,10);
  await f.flows.start(a, bot=>new Pix(bot), flow=>flow.addPix(a));
  const original=f.query("Inter");
  for (const context of [f.message(-2),f.message(-1,456,10),f.message(-1,123,20)]) {
    assert.equal(await f.flows.callback({...original,id:Math.random().toString(),from:context.from,message:{...original.message,chat:context.chat,message_thread_id:context.message_thread_id}}),false);
  }
  await f.flows.callback(original);
  assert.equal(await f.flows.message({...a,chat:{id:-2},text:"wrong-context"}),false);
  assert.equal(await f.flows.message({...a,text:"fake-pix"}),true);
  assert.equal(f.requests.filter(r=>r.path==="/api/pix" && r.method==="POST").length,1);
  assert.equal(f.flows.entries.size,0);
  assert.equal(await f.flows.callback({...original,id:"repeated"}),false);
  await f.flows.start(a, bot=>new Pix(bot), flow=>flow.addPix(a));
  const replaced=f.query("Inter");
  await f.flows.start(a, bot=>new Pix(bot), flow=>flow.addPix(a));
  assert.equal(await f.flows.callback(replaced),false);
  await f.flows.cancel(a);
});

test("one user can maintain separate chats/topics; cancellation and expiry invalidate every flow type", async () => {
  let time=0;
  const f=fixture({now:()=>time});
  const contexts=[f.message(-1,123,1),f.message(-1,123,2),f.message(-2),f.message(-1,456,1)];
  for (const msg of contexts) await f.flows.start(msg,bot=>new Pix(bot),flow=>flow.addPix(msg));
  assert.equal(f.flows.entries.size,4);
  await f.flows.cancel(contexts[0]); assert.equal(f.flows.entries.size,3);
  await f.flows.clearUser(123); assert.equal(f.flows.entries.size,1);
  await f.flows.clearUser(456);
  for (const [Type,method] of [[Pix,"addPix"],[Agenda,"start"],[Paid,"paid"],[SomeonePaid,"addWhoPaid"]]) {
    const msg=f.message();
    await f.flows.start(msg,bot=>new Type(bot),flow=>flow[method](msg));
    const stale=f.query();
    await f.flows.cancel(msg);
    assert.equal(await f.flows.callback(stale),false);
    assert.deepEqual(f.messages.get(stale.message.message_id).reply_markup.inline_keyboard,[]);
    await f.flows.start(msg,bot=>new Type(bot),flow=>flow[method](msg));
    const expired=f.query(); time+=16*60*1000;
    assert.equal(await f.flows.callback(expired),false);
    assert.equal(f.flows.entries.size,0);
  }
});

test("repeated concurrent payment callbacks perform one write and acknowledge each callback once", async () => {
  const f=fixture(); const msg=f.message();
  await f.flows.start(msg,bot=>new Paid(bot),flow=>flow.paid(msg));
  const first=f.query(); const repeated={...first,id:"second"};
  assert.deepEqual(await Promise.all([f.flows.callback(first),f.flows.callback(repeated)]),[true,false]);
  assert.equal(f.requests.filter(r=>r.method==="PATCH").length,1);
  assert.equal(f.acknowledgements.filter(id=>id===first.id).length,1);
  assert.equal(f.flows.entries.size,0);
});

test("member selection invalidates the previous keyboard revision and closes after confirmation", async () => {
  const f=fixture(); const msg=f.message();
  await f.flows.start(msg,bot=>new SomeonePaid(bot),flow=>flow.addWhoPaid(msg));
  await f.flows.callback(f.query());
  const toggle=f.query("❌"); await f.flows.callback(toggle);
  assert.equal(await f.flows.callback({...toggle,id:"old-toggle"}),false);
  const done=f.query("Confirmar"); await f.flows.callback(done);
  assert.equal(f.flows.entries.size,0);
  assert.equal(await f.flows.callback({...done,id:"old-done"}),false);
});

test("agenda completes through valid steps and rejects a replayed final confirmation", async () => {
  const f=fixture(); const msg=f.message();
  await f.flows.start(msg,bot=>new Agenda(bot),flow=>flow.start(msg));
  await f.flows.callback(f.query("Demo group"));
  await f.flows.callback(f.query()); // month
  await f.flows.callback(f.query()); // day
  await f.flows.callback(f.query("Inter"));
  await f.flows.callback(f.query()); // existing PIX
  await f.flows.message({...msg,text:"Test bill"});
  await f.flows.message({...msg,text:"10.00"});
  const done=f.query("Confirmar");
  await f.flows.callback(done);
  assert.equal(f.requests.filter(r=>r.path==="/api/agenda" && r.method==="POST").length,1);
  assert.equal(f.flows.entries.size,0);
  assert.equal(await f.flows.callback({...done,id:"old-agenda"}),false);
});

test("callback failures close the flow and are acknowledged once", async () => {
  const f=fixture(); const msg=f.message();
  await f.flows.start(msg,bot=>({bot,stage:"choose",async begin() {
    await bot.sendMessage(msg.chat.id,"Choose",{reply_markup:{inline_keyboard:[[{text:"Fail",callback_data:"fail"}]]}});
  },async handleCallback() {throw Object.assign(new Error("Disposable failure"),{status:403});}}),flow=>flow.begin());
  const query=f.query("Fail");
  await assert.rejects(f.flows.callback(query),{status:403,callbackAcknowledged:true});
  assert.equal(f.acknowledgements.filter(id=>id===query.id).length,1);
  assert.equal(f.flows.entries.size,0);
});
