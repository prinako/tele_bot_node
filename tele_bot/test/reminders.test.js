import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
// Prevent the pre-fix constructor from starting a real timer or HTTP request.
const hooks=registerHooks({resolve(specifier,context,next) {
  let source;
  if (specifier==="node-cron") source="export default { schedule() {} };";
  if (specifier.endsWith("/api/backendClient.js")) source="export const getAllAgendaPayment = next => next([]); export const getAllAgendaPayments = async () => [];";
  if (source) return {url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true};
  return next(specifier,context);
}});
const {default:SchedulesEveryday}=await import("../src/schedules/schedules_everyday.js");
hooks.deregister();

function fixture(date, agendas, { failChat } = {}) {
  const messages=[];
  let scheduled;
  const scheduler=new SchedulesEveryday({async sendMessage(chat,text,options) {
    if (chat===failChat) throw new Error("Disposable Telegram failure");
    messages.push({chat,text,options});
  }},{now:()=>new Date(date),loadAgendas:async()=>agendas,
    schedule:(...args)=>{scheduled=args;}});
  return {scheduler,messages,get scheduled(){return scheduled;}};
}
const agenda=(date,extra={})=>({date,chatId:-10,title:"Test",amount:"10.00",description:"Test",bank:"Test",pix:"fake-key",...extra});

test("cron schedules at 09:00 in America/Belem",()=>{
  const f=fixture("2026-11-04T12:00:00Z",[]);
  assert.equal(f.scheduled[0],"0 9 * * *");
  assert.equal(f.scheduled[2].timezone,"America/Belem");
});

test("reminders cross month/year and leap-day boundaries",async()=>{
  for (const [today,due] of [["2026-11-30T12:00:00Z","01/12/2026"],["2026-12-31T12:00:00Z","01/01/2027"],["2028-02-28T12:00:00Z","29/02/2028"],["2028-02-29T12:00:00Z","01/03/2028"]]) {
    const f=fixture(today,[agenda(due)]);
    await f.scheduler._checkIfNeedToNotify();
    assert.equal(f.messages.length,1);
    assert.match(f.messages[0].text,/Faltam 1 dia/);
  }
});

test("calendar date uses Belem rather than UTC and preserves 3/2/1/0 lead times",async()=>{
  const f=fixture("2026-12-01T01:00:00Z",[0,1,2,3,4].map(day=>agenda(day===0?"30/11/2026":`0${day}/12/2026`)));
  await f.scheduler._checkIfNeedToNotify();
  assert.equal(f.messages.length,4);
  assert.match(f.messages[0].text,/Hoje/);
});

test("paid and invalid bills are skipped; one failed chat does not stop others",async()=>{
  const f=fixture("2026-11-04T12:00:00Z",[
    agenda("04/11/2026",{isFullyPaid:true}),agenda("04/11/2026",{isPaid:true}),
    agenda("31/02/2026"),agenda("04/11/2026",{chatId:-20}),agenda("2026-11-04",{messageThreadId:77}),
  ],{failChat:-20});
  await f.scheduler._checkIfNeedToNotify();
  assert.equal(f.messages.length,1);
  assert.equal(f.messages[0].options.message_thread_id,77);
});

test("repeated runs/restarts retain the existing no-durable-history behavior",async()=>{
  const records=[agenda("04/11/2026")];
  const first=fixture("2026-11-04T12:00:00Z",records);
  await first.scheduler._checkIfNeedToNotify(); await first.scheduler._checkIfNeedToNotify();
  assert.equal(first.messages.length,2);
  const restarted=fixture("2026-11-04T12:00:00Z",records);
  await restarted.scheduler._checkIfNeedToNotify(); assert.equal(restarted.messages.length,1);
});
