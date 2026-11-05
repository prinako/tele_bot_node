import { test, after } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { sdkFixture } from "../test-support/sdkFixture.js";

const originalFetch=globalThis.fetch;
process.env.BOT_TOKEN="999:fixture-token";
process.env.BOT_API_TOKEN="fixture-service-token-".repeat(3);
process.env.BACKEND_URL="http://backend.invalid";
process.env.LOG="false";
const {createTelegramIntegration}=await import("../src/integration.js");
const {runBot}=await import("../src/lifecycle.js");
after(()=>{globalThis.fetch=originalFetch;});

for (const signal of ["SIGINT","SIGTERM"]) {
  test(`${signal} stops real polling, destroys the scheduler and removes signal listeners`,async()=>{
    let pollStarted;
    const started=new Promise(resolve=>{pollStarted=resolve;});
    const f=sdkFixture(createTelegramIntegration,{telegramOverride:async(method,_params,init)=>{
      if (method!=="getUpdates") return;
      pollStarted();
      return new Promise((_resolve,reject)=>{
        const abort=()=>reject(new DOMException("Fixture shutdown","AbortError"));
        if (init.signal.aborted) abort();
        else init.signal.addEventListener("abort",abort,{once:true});
      });
    }});
    const signals=new EventEmitter();
    let schedules=0;
    let destroyed=0;
    const running=runBot(f,{signals,createSchedule:client=>{
      assert.equal(client,f.client);schedules++;
      return {task:{async destroy(){destroyed++;}}};
    }});
    await started;
    assert.equal(f.bot.isRunning(),true);
    assert.equal(schedules,1);
    signals.emit(signal);
    await running;
    assert.equal(f.bot.isRunning(),false);
    assert.equal(destroyed,1);
    assert.equal(signals.listenerCount("SIGINT"),0);
    assert.equal(signals.listenerCount("SIGTERM"),0);
    assert.equal(f.flows.entries.size,0);
    assert.equal(f.telegramCalls.some(c=>c.method==="close"),false);
  });
}

test("fatal real SDK polling rejection tears down resources and propagates",async()=>{
  const f=sdkFixture(createTelegramIntegration,{telegramOverride:async method=>{
    if (method==="getUpdates") return Response.json({ok:false,error_code:401,description:"Fixture unauthorized"},{status:401});
  }});
  const signals=new EventEmitter();let destroyed=0;
  await assert.rejects(runBot(f,{signals,createSchedule:()=>({task:{async destroy(){destroyed++;}}})}),{errorCode:401});
  assert.equal(destroyed,1);
  assert.equal(f.bot.isRunning(),false);
  assert.equal(signals.listenerCount("SIGTERM"),0);
});

test("real CLI entrypoint exits nonzero on fatal polling and redacts SDK error text",async()=>{
  const entry=fileURLToPath(new URL("../src/server.js",import.meta.url));
  const script=`
    process.env.BOT_TOKEN="999:fixture-never-log-token";
    process.env.BOT_API_TOKEN="fixture-service-token-".repeat(3);
    process.env.LOG="false";
    globalThis.fetch=async url=>{
      const method=new URL(url).pathname.split("/").at(-1);
      if(method==="getMe") return Response.json({ok:true,result:{id:999,is_bot:true,first_name:"Fixture",username:"fixture_bot"}});
      if(method==="getUpdates") return Response.json({ok:false,error_code:401,description:"fixture-never-log-token"},{status:401});
      throw new Error("Unexpected external request");
    };
    process.argv[1]=${JSON.stringify(entry)};
    await import(${JSON.stringify(new URL("../src/server.js",import.meta.url).href)});
  `;
  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  await assert.rejects(promisify(execFile)(process.execPath,["--input-type=module","--eval",script],{timeout:5000,env:childEnvironment}),error=>{
    assert.equal(error.code,1);
    assert.equal(error.killed,false);
    assert.match(error.stderr,/Telegram bot stopped/);
    assert.doesNotMatch(error.stderr,/fixture-never-log-token|https:\/\/api.telegram.org/);
    return true;
  });
});
