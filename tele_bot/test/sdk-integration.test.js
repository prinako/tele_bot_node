import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Bot } from "node-telegram-bot-api";
import { sdkFixture } from "../test-support/sdkFixture.js";

const originalFetch = globalThis.fetch;
const names = ["BOT_TOKEN","BOT_API_TOKEN","BACKEND_URL","LOG","BILLS_THREAD_ID","PAID_THREAD_ID","CHAT_ID"];
const previous = names.map(name=>process.env[name]);
process.env.BOT_TOKEN="999:fixture-token";
process.env.BOT_API_TOKEN="fixture-service-credential-".repeat(3);
process.env.BACKEND_URL="http://backend.invalid";
process.env.LOG="false";
process.env.BILLS_THREAD_ID="17";
process.env.PAID_THREAD_ID="19";
process.env.CHAT_ID="-10";
const {createTelegramIntegration} = await import("../src/integration.js");
const {default:createBot} = await import("../src/bot.js");
await import("../src/server.js");
after(()=>{
  globalThis.fetch=originalFetch;
  names.forEach((name,index)=>{ if (previous[index]===undefined) delete process.env[name]; else process.env[name]=previous[index]; });
});

test("real v2 bot construction and entrypoint import do not start polling or requests",()=>{
  const bot=createBot({token:"999:fixture-token",transportOptions:{fetch:()=>assert.fail("Construction made a request")}});
  assert.ok(bot instanceof Bot);
  assert.equal(bot.isRunning(),false);
  assert.equal(typeof bot.api.sendMessage,"function");
});

test("real command routing is terminal, exact, addressed to this bot, and authorized once",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  try {
    await f.bot.handleUpdate(f.message("/start@telebot_test_bot argument"));
    assert.equal(f.telegramCalls.filter(c=>c.method==="sendMessage").length,1);
    assert.equal(f.backendCalls.filter(c=>c.path==="/api/auth/me").length,1);
    assert.ok(f.backendCalls.every(c=>c.actor==="123"));
    assert.ok(f.backendCalls.every(c=>c.options.headers.Authorization===`Bearer ${process.env.BOT_API_TOKEN}`));
    assert.equal(f.telegramCalls.at(-1).params.chat_id,"-10");
    assert.equal(f.telegramCalls.at(-1).params.message_thread_id,"7");
    await f.bot.handleUpdate(f.message("/start@another_bot"));
    await f.bot.handleUpdate(f.message("/start-extra"));
    assert.equal(f.telegramCalls.filter(c=>c.method==="sendMessage").length,1);
    assert.equal(f.telegramCalls.filter(c=>c.method==="getMe").length,1);
    assert.equal(f.telegramCalls.filter(c=>c.method==="getUpdates").length,0);
  } finally {f.flows.dispose();await f.bot.close();}
});

test("callbacks use the callback actor, perform v2 edits, complete PIX and reject replays",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  try {
    await f.bot.handleUpdate(f.message("/registerpix"));
    const old=f.callback();
    assert.equal(old.callback_query.message.from.id,999);
    await f.bot.handleUpdate(old);
    const edit=f.telegramCalls.find(c=>c.method==="editMessageText");
    assert.equal(edit.params.chat_id,"-10");
    assert.equal(edit.params.message_id,String(old.callback_query.message.message_id));
    assert.deepEqual(JSON.parse(edit.params.reply_markup),{inline_keyboard:[]});
    await f.bot.handleUpdate(f.message("fixture-pix-key"));
    assert.equal(f.flows.entries.size,0);
    const inserts=f.backendCalls.filter(c=>c.path==="/api/pix" && c.options.method==="POST");
    assert.equal(inserts.length,1);
    assert.equal(inserts[0].actor,"123");
    assert.equal(JSON.parse(inserts[0].options.body).senderId,123);
    await f.bot.handleUpdate({...old,callback_query:{...old.callback_query,id:"replay"}});
    assert.equal(f.backendCalls.filter(c=>c.path==="/api/pix" && c.options.method==="POST").length,1);
    for (const id of [old.callback_query.id,"replay"]) {
      assert.equal(f.telegramCalls.filter(c=>c.method==="answerCallbackQuery" && c.params.callback_query_id===id).length,1);
    }
    assert.ok(f.telegramCalls.some(c=>c.method==="editMessageReplyMarkup" && c.params.message_id===edit.params.message_id));
    assert.ok(f.backendCalls.every(c=>c.actor==="123"));
  } finally {f.flows.dispose();await f.bot.close();}
});

test("blocked users fail closed, clear existing flows and receive one callback acknowledgement",async()=>{
  const blocked=new Set();
  const f=sdkFixture(createTelegramIntegration,{blocked});
  try {
    await f.bot.handleUpdate(f.message("/registerpix"));
    const query=f.callback();blocked.add("123");
    await f.bot.handleUpdate(query);
    assert.equal(f.flows.entries.size,0);
    assert.equal(f.telegramCalls.filter(c=>c.method==="answerCallbackQuery" && c.params.callback_query_id===query.callback_query.id).length,1);
    assert.equal(f.backendCalls.filter(c=>c.path==="/api/pix").length,0);
    await f.bot.handleUpdate(f.message("/registerpix"));
    assert.equal(f.flows.entries.size,0);
  } finally {f.flows.dispose();await f.bot.close();}
});

test("real middleware preserves concurrent actor/chat/topic isolation and scoped cancellation",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  const a={actor:123,chat:-10,topic:7}; const b={actor:456,chat:-20,topic:8}; const c={actor:123,chat:-10,topic:9};
  try {
    await Promise.all([a,b,c].map(context=>f.bot.handleUpdate(f.message("/registerpix",context))));
    assert.equal(f.flows.entries.size,3);
    const qa=f.callback(f.keyboard(a.chat,a.topic));
    const qb=f.callback(f.keyboard(b.chat,b.topic),{actor:456});
    await f.bot.handleUpdate({...qa,callback_query:{...qa.callback_query,id:"wrong-actor",from:qb.callback_query.from}});
    assert.equal(f.telegramCalls.filter(call=>call.method==="editMessageText").length,0);
    await Promise.all([f.bot.handleUpdate(qa),f.bot.handleUpdate(qb)]);
    await f.bot.handleUpdate(f.message("/cancel",a));
    assert.equal(f.flows.entries.size,2);
    await f.bot.handleUpdate(f.message("fixture-b-pix",b));
    const insert=f.backendCalls.find(call=>call.path==="/api/pix" && call.options.method==="POST");
    assert.equal(insert.actor,"456");
    assert.equal(JSON.parse(insert.options.body).senderId,456);
    await f.bot.handleUpdate({...qa,callback_query:{...qa.callback_query,id:"cancelled"}});
    assert.equal(f.flows.entries.size,1);
  } finally {f.flows.dispose();await f.bot.close();}
});

test("real middleware finishes an agenda without changing exact-cent preview or thread context",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  try {
    await f.bot.handleUpdate(f.message("/agenda"));
    for (const text of ["Fixture group",undefined,undefined,"Inter",undefined]) {
      await f.bot.handleUpdate(f.callback(f.keyboard(),{text}));
    }
    await f.bot.handleUpdate(f.message("Fixture bill"));
    await f.bot.handleUpdate(f.message("10.00"));
    const done=f.callback(f.keyboard(),{text:"Confirmar"});
    await f.bot.handleUpdate(done);
    assert.equal(f.flows.entries.size,0);
    const insert=f.backendCalls.find(c=>c.path==="/api/agenda" && c.options.method==="POST");
    assert.equal(insert.actor,"123");
    assert.equal(JSON.parse(insert.options.body).amount,"10.00");
    const summary=f.telegramCalls.find(c=>c.method==="sendMessage" && c.params.text.includes("Total das cotas"));
    assert.match(summary.params.text,/Excedente de arredondamento: R\$ 0\.02/);
    assert.equal(summary.params.parse_mode,"Markdown");
    await f.bot.handleUpdate({...done,callback_query:{...done.callback_query,id:"old-done"}});
    assert.equal(f.backendCalls.filter(c=>c.path==="/api/agenda" && c.options.method==="POST").length,1);
  } finally {f.flows.dispose();await f.bot.close();}
});


test("scheduled reminders use real v2 parameter encoding without an acting user",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  const {default:Scheduler}=await import("../src/schedules/schedules_everyday.js");
  let scheduled;
  const scheduler=new Scheduler(f.client, {now:()=>new Date("2026-11-30T12:00:00Z"),
    schedule:(...args)=>{scheduled=args;},loadAgendas:async()=>[{
      date:"01/12/2026",chatId:-10,topicId:73,title:"Fixture bill",amount:"10.00",allocatedAmount:"10.02",surplusAmount:"0.02",members:[],
    }]});
  await scheduler._checkIfNeedToNotify();
  const call=f.telegramCalls.find(c=>c.method==="sendMessage");
  assert.equal(call.params.chat_id,"-10");
  assert.equal(call.params.message_thread_id,"73");
  assert.equal(call.params.parse_mode,"Markdown");
  assert.match(call.params.text,/Faltam 1 dia/);
  assert.match(call.params.text,/Excedente de arredondamento: R\$ 0\.02/);
  assert.equal(scheduled[2].timezone,"America/Belem");
  f.flows.dispose();await f.bot.close();
});


test("real middleware rejects replaced and expired keyboards",async()=>{
  let now=0;
  const f=sdkFixture(createTelegramIntegration,{now:()=>now});
  try {
    await f.bot.handleUpdate(f.message("/registerpix"));
    const replaced=f.callback();
    await f.bot.handleUpdate(f.message("/registerpix"));
    const current=f.callback();
    await f.bot.handleUpdate(replaced);
    assert.equal(f.telegramCalls.filter(c=>c.method==="editMessageText").length,0);
    now+=16*60*1000;
    await f.bot.handleUpdate(current);
    assert.equal(f.flows.entries.size,0);
    assert.equal(f.telegramCalls.filter(c=>c.method==="editMessageText").length,0);
  } finally {f.flows.dispose();await f.bot.close();}
});

test("concurrent callbacks through real middleware confirm payment once",async()=>{
  const f=sdkFixture(createTelegramIntegration);
  try {
    await f.bot.handleUpdate(f.message("/pagou"));
    const first=f.callback();
    const repeated={...first,callback_query:{...first.callback_query,id:"duplicate-payment"}};
    await Promise.all([f.bot.handleUpdate(first),f.bot.handleUpdate(repeated)]);
    assert.equal(f.backendCalls.filter(c=>c.options.method==="PATCH").length,1);
    for (const id of [first.callback_query.id,"duplicate-payment"]) {
      assert.equal(f.telegramCalls.filter(c=>c.method==="answerCallbackQuery" && c.params.callback_query_id===id).length,1);
    }
    assert.equal(f.flows.entries.size,0);
  } finally {f.flows.dispose();await f.bot.close();}
});
