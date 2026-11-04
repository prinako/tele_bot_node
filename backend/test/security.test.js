import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import express from "express";
import { createApp } from "../src/app.js";
import { createAuthentication, validateSecurityConfig } from "../src/security/auth.js";
import { createAuthorization } from "../src/security/authorize.js";

const salt = "ab".repeat(16);
const password = "test-password-long-enough";
const config = { nodeEnv: "development", botApiToken: "test-service-token-".repeat(3),
  adminPasswordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  corsOrigins: ["http://localhost:3001"], cookieSecure: false };
const origin = config.corsOrigins[0];

async function harness(t, { allowed = true, admin = false, creator = false, membership = true, responsible = true, realApp = false } = {}) {
  let time = Date.now();
  const calls = [];
  const query = async (sql, args) => {
    calls.push({ sql, args });
    let rows = [];
    if (sql.startsWith("SELECT * FROM users")) rows = [{ id: "user-a", telegram_id: "123", is_allowed: allowed, is_admin: admin }];
    else if (sql.includes("FROM agenda_payments")) rows = [{ created_by_user_id: creator ? "user-a" : "user-b", chat_id: "-10" }];
    else if (sql.includes("FROM bot_installation_users")) rows = membership ? [{}] : [];
    else if (sql.includes("FROM agenda_payment_members")) rows = responsible ? [{}] : [];
    else if (sql.includes("FROM pix_keys")) rows = [{ user_id: "user-b" }];
    return { rows, rowCount: rows.length };
  };
  let app;
  if (realApp) app = createApp({ config, dbQuery: query, now: () => time });
  else {
    app = express();
    const auth = createAuthentication(config, { now: () => time });
    app.use(express.json());
    app.post("/api/auth/login", auth.login);
    app.use(auth.authenticate);
    app.post("/api/auth/logout", auth.logout);
    app.use(createAuthorization(query));
    app.use((req, res) => res.json({ body: req.body, role: req.auth.role }));
  }
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  async function request(path, { method = "GET", actor, token, cookie, body, source } = {}) {
    return fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: {
      ...(source !== undefined && { Origin: source }),
      ...(token !== undefined && { Authorization: `Bearer ${token}` }),
      ...(actor !== undefined && { "X-Telegram-User-Id": actor }),
      ...(cookie && { Cookie: cookie }),
      ...(body !== undefined && { "Content-Type": "application/json" }),
    }, ...(body !== undefined && { body: JSON.stringify(body) }) });
  }
  return { request, calls, advance: (ms) => { time += ms; }, bot: (path, options = {}) => request(path, { token: config.botApiToken, actor: "123", ...options }) };
}

test("startup rejects missing credentials, wildcard origins, and insecure production", () => {
  assert.doesNotThrow(() => validateSecurityConfig(config));
  for (const patch of [{ botApiToken: "" }, { adminPasswordHash: "plain-text" }, { corsOrigins: ["*"] }, { nodeEnv: "production" }]) {
    assert.throws(() => validateSecurityConfig({ ...config, ...patch }));
  }
});
test("real app rejects unauthenticated reads/writes, forged actors, and bad tokens", async (t) => {
  const h = await harness(t, { realApp: true });
  assert.equal((await h.request("/health")).status, 200);
  for (const [path, method] of [["/api/admin/pix", "GET"], ["/api/users/123", "PATCH"], ["/api/agenda/bill", "DELETE"]]) {
    assert.equal((await h.request(path, { method, actor: "123" })).status, 401);
  }
  assert.equal((await h.bot("/api/auth/me", { token: "wrong" })).status, 401);
  assert.equal(h.calls.length, 0);
});
test("session login, CSRF checks, rotation, logout and expiry", async (t) => {
  const h = await harness(t);
  assert.equal((await h.request("/api/auth/login", { method: "POST", body: { password }, source: "https://evil.example" })).status, 403);
  assert.equal((await h.request("/api/auth/login", { method: "POST", body: { password: "wrong" }, source: origin })).status, 401);
  const login = await h.request("/api/auth/login", { method: "POST", body: { password }, source: origin });
  assert.equal(login.status, 200);
  const header = login.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Strict/i);
  const cookie = header.split(";")[0];
  assert.equal((await h.request("/api/admin/pix", { cookie })).status, 200);
  assert.equal((await h.request("/api/users/123", { method: "PATCH", cookie, body: {} })).status, 403);
  assert.equal((await h.request("/api/users/123", { method: "PATCH", cookie, body: {}, source: "https://evil.example" })).status, 403);
  assert.equal((await h.request("/api/users/123", { method: "PATCH", cookie, body: {}, source: origin })).status, 200);
  const rotated = await h.request("/api/auth/login", { method: "POST", cookie, body: { password }, source: origin });
  const next = rotated.headers.get("set-cookie").split(";")[0];
  assert.notEqual(next, cookie);
  assert.equal((await h.request("/api/auth/me", { cookie })).status, 401);
  assert.equal((await h.request("/api/auth/logout", { method: "POST", cookie: next, source: origin })).status, 204);
  assert.equal((await h.request("/api/auth/me", { cookie: next })).status, 401);
  const again = await h.request("/api/auth/login", { method: "POST", body: { password }, source: origin });
  h.advance(3600001);
  assert.equal((await h.request("/api/auth/me", { cookie: again.headers.get("set-cookie").split(";")[0] })).status, 401);
});
test("login is rate limited and recovers after its window", async (t) => {
  const h = await harness(t);
  for (let i = 0; i < 10; i++) assert.equal((await h.request("/api/auth/login", { method: "POST", body: {}, source: origin })).status, 401);
  assert.equal((await h.request("/api/auth/login", { method: "POST", body: { password }, source: origin })).status, 429);
  h.advance(60001);
  assert.equal((await h.request("/api/auth/login", { method: "POST", body: { password }, source: origin })).status, 200);
});
test("service without actor is restricted to observed registration and pending scheduler reads", async (t) => {
  const h = await harness(t);
  assert.equal((await h.bot("/api/users/upsert", { actor: undefined, method: "POST", body: { from: { id: 123 } } })).status, 200);
  assert.equal((await h.bot("/api/agenda", { actor: undefined })).status, 200);
  assert.equal((await h.bot("/api/admin/pix", { actor: undefined })).status, 403);
  assert.equal((await h.bot("/api/agenda/bill", { actor: undefined, method: "DELETE" })).status, 403);
});
test("blocked users fail closed; admin Telegram user still needs is_allowed", async (t) => {
  const h = await harness(t, { allowed: false, admin: true });
  assert.equal((await h.bot("/api/auth/me")).status, 403);
  assert.equal((await h.bot("/api/agenda/bill", { method: "PATCH", body: { isPaid: true } })).status, 403);
});
test("ordinary member cannot administer users, banks, installations or list all PIX", async (t) => {
  const h = await harness(t);
  for (const [path, method] of [["/api/users", "GET"], ["/api/users/123", "PATCH"], ["/api/admin/pix", "GET"], ["/api/banks", "POST"], ["/api/bot-installations/-10/topic-settings", "PATCH"]]) {
    assert.equal((await h.bot(path, { method, body: method === "GET" ? undefined : {} })).status, 403);
  }
  assert.equal((await h.bot("/api/banks")).status, 200);
  assert.equal((await h.bot("/api/users/123/bot-installations")).status, 200);
  assert.equal((await h.bot("/api/users/456/bot-installations")).status, 403);
});
test("allowed admin Telegram user can manage resources", async (t) => {
  const h = await harness(t, { admin: true });
  assert.equal((await h.bot("/api/users/456", { method: "PATCH", body: { isAdmin: true } })).status, 200);
});
test("PIX access is owner-scoped and create identity cannot be forged", async (t) => {
  const h = await harness(t);
  assert.equal((await h.bot("/api/pix?senderId=456&bank=Inter")).status, 403);
  assert.equal((await h.bot("/api/pix?senderId=123&bank=Inter")).status, 200);
  assert.equal((await h.bot("/api/pix/other", { method: "PATCH", body: { pix: "replacement" } })).status, 403);
  const created = await h.bot("/api/pix", { method: "POST", body: { pix: "fake-test-key", senderId: 456, user: { id: 456 }, bank: "Inter" } });
  assert.equal((await created.json()).body.telegramId, "123");
});
test("agenda creation binds actor and requires selected group membership", async (t) => {
  const h = await harness(t);
  const result = await h.bot("/api/agenda", { method: "POST", body: { chatId: -10, senderId: 456, user: { id: 456 }, isPaid: true } });
  const { body } = await result.json();
  assert.equal(body.senderId, "123"); assert.equal(body.telegramId, "123"); assert.equal(body.user, undefined); assert.equal(body.isPaid, false);
  const outside = await harness(t, { membership: false });
  assert.equal((await outside.bot("/api/agenda", { method: "POST", body: { chatId: -10 } })).status, 403);
});
test("creator manages bill and confirms another member, but cannot move bill to an unrelated group", async (t) => {
  const h = await harness(t, { creator: true });
  assert.equal((await h.bot("/api/agenda/bill", { method: "PATCH", body: { title: "Updated" } })).status, 200);
  assert.equal((await h.bot("/api/agenda/bill/members/456/paid", { method: "PATCH" })).status, 200);
  assert.equal((await h.bot("/api/agenda/bill", { method: "DELETE" })).status, 200);
  const outside = await harness(t, { creator: true, membership: false });
  assert.equal((await outside.bot("/api/agenda/bill", { method: "PATCH", body: { chatId: -99 } })).status, 403);
});
test("member may update only their own responsible share, not another identity or bill fields", async (t) => {
  const h = await harness(t);
  assert.equal((await h.bot("/api/agenda/bill/members/123/paid", { method: "PATCH" })).status, 200);
  assert.equal((await h.bot("/api/agenda/bill", { method: "PATCH", body: { isPaid: false, telegramId: 123 } })).status, 200);
  for (const body of [{ isPaid: true }, { isPaid: true, telegramId: 456 }, { isPaid: true, telegramId: 123, title: "forged" }]) {
    assert.equal((await h.bot("/api/agenda/bill", { method: "PATCH", body })).status, 403);
  }
  assert.equal((await h.bot("/api/agenda/bill/members/456/paid", { method: "PATCH" })).status, 403);
  assert.equal((await h.bot("/api/agenda/bill", { method: "DELETE" })).status, 403);
  const notResponsible = await harness(t, { responsible: false });
  assert.equal((await notResponsible.bot("/api/agenda/bill/members/123/paid", { method: "PATCH" })).status, 403);
});
test("outsider cannot read a group bill or its members", async (t) => {
  const h = await harness(t, { membership: false });
  assert.equal((await h.bot("/api/agenda/bill")).status, 403);
  assert.equal((await h.bot("/api/agenda/bill/members")).status, 403);
});

test("ordinary bill creation cannot overwrite responsible users' registered profiles", async (t) => {
  const h = await harness(t);
  const response = await h.bot("/api/agenda", { method: "POST", body: { chatId: -10, members: [{ telegramId: 456, username: "forged-profile" }] } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).body.members, [456]);
});

test("real app issues browser sessions and checks delegated identity on /api/auth/me", async (t) => {
  const h = await harness(t, { realApp: true });
  const response = await h.request("/api/auth/login", { method: "POST", body: { password }, source: origin });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const me = await h.request("/api/auth/me", { cookie, actor: "999" });
  assert.deepEqual(await me.json(), { role: "admin", telegramId: null });
  const delegated = await h.bot("/api/auth/me");
  assert.deepEqual(await delegated.json(), { role: "user", telegramId: "123" });
  const blocked = await harness(t, { realApp: true, allowed: false });
  assert.equal((await blocked.bot("/api/auth/me")).status, 403);
});
