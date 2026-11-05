import { test } from "node:test";
import assert from "node:assert/strict";
import { createUserGuard } from "../src/auth/guard.js";
import { currentTelegramUser } from "../src/auth/context.js";

test("guard keeps concurrent Telegram identities isolated and registers before checking permissions", async () => {
  const seen = [];
  const guard = createUserGuard({}, {
    register: async () => { seen.push(`register:${currentTelegramUser()}`); },
    authorize: async () => { await new Promise((r) => setImmediate(r)); seen.push(`auth:${currentTelegramUser()}`); },
  });
  const handler = guard(async (msg) => {
    await new Promise((r) => setImmediate(r));
    assert.equal(currentTelegramUser(), String(msg.from.id));
  });
  await Promise.all([handler({ from: { id: 123 } }), handler({ from: { id: 456 } })]);
  assert.equal(currentTelegramUser(), undefined);
  for (const id of [123, 456]) assert.ok(seen.indexOf(`register:${id}`) < seen.indexOf(`auth:${id}`));
});
test("blocked user cannot run handler; callback is acknowledged and state cleared", async () => {
  let executed = false;
  let cleared;
  let acknowledgement;
  const guard = createUserGuard({ answerCallbackQuery: async (...args) => { acknowledgement = args; } }, {
    register: async () => {},
    authorize: async () => { throw Object.assign(new Error("blocked"), { status: 403 }); },
    clear: (id) => { cleared = id; },
  });
  await guard(() => { executed = true; }, { callback: true })({ id: "cb", from: { id: 123 }, message: { chat: { id: -10 } } });
  assert.equal(executed, false); assert.equal(cleared, 123); assert.equal(acknowledgement[0], "cb");
});
test("authorization outage fails closed without running commands", async () => {
  let executed = false;
  const guard = createUserGuard({}, { register: async () => { throw new Error("offline"); }, authorize: async () => {} });
  await guard(() => { executed = true; }, { quiet: true })({ from: { id: 123 } });
  assert.equal(executed, false);
});

test("backend client sends service credential and the current actor, with no actor outside update context", async () => {
  const { asTelegramUser } = await import("../src/auth/context.js");
  const { getCurrentUser } = await import("../src/api/backendClient.js");
  const original = globalThis.fetch;
  const headers = [];
  try {
    globalThis.fetch = async (_url, options) => {
      headers.push(options.headers);
      return { ok: true, json: async () => ({ role: "user" }) };
    };
    await asTelegramUser(123, () => getCurrentUser());
    await getCurrentUser();
    assert.match(headers[0].Authorization, /^Bearer /);
    assert.equal(headers[0]["X-Telegram-User-Id"], "123");
    assert.equal(headers[1]["X-Telegram-User-Id"], undefined);
  } finally { globalThis.fetch = original; }
});

test("already acknowledged callback errors are not acknowledged twice", async () => {
  let cleared;
  const guard = createUserGuard({answerCallbackQuery: async () => assert.fail("Duplicate acknowledgement")}, {
    register: async () => {}, authorize: async () => {}, clear: async id => {cleared=id;},
  });
  await guard(async () => {
    throw Object.assign(new Error("Denied after acknowledgement"), {status:403,callbackAcknowledged:true});
  }, {callback:true})({id:"acknowledged",from:{id:123},message:{chat:{id:-10}}});
  assert.equal(cleared,123);
});

test("message failures preserve thread context and quiet handlers suppress replies", async () => {
  const sent=[];
  const guard=createUserGuard({sendMessage:async (...args)=>sent.push(args)}, {
    register:async () => {}, authorize:async () => {throw Object.assign(new Error("Denied"), {status:403});},
  });
  const msg={from:{id:123},chat:{id:-10},message_thread_id:42};
  await guard(() => assert.fail("Denied handler ran"))(msg);
  assert.equal(sent[0][0],-10);
  assert.equal(sent[0][2].message_thread_id,42);
  assert.match(sent[0][1],/permissão/);
  await guard(() => assert.fail("Denied quiet handler ran"),{quiet:true})(msg);
  assert.equal(sent.length,1);
});
