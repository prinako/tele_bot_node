import { test } from "node:test";
import assert from "node:assert/strict";
import { upsertUser } from "../src/repositories/users.repository.js";

test("new-user allow/admin seeds fail closed and do not overwrite existing flags", async () => {
  const oldAllowed = process.env.ALLOWED_USERS;
  const oldAdmin = process.env.ADMIN_USERS;
  try {
    process.env.ALLOWED_USERS = "123";
    process.env.ADMIN_USERS = "456";
    const calls = [];
    const db = { query: async (sql, values) => { calls.push({sql, values}); return { rows: [{}] }; } };
    for (const id of [123, 456, 789]) await upsertUser(db, { telegramId: id });
    assert.equal(calls[0].values[6], true);
    assert.equal(calls[1].values[5], true);
    assert.equal(calls[1].values[6], true);
    assert.equal(calls[2].values[6], false);
    const conflictUpdate = calls[0].sql.split("DO UPDATE SET")[1];
    assert.doesNotMatch(conflictUpdate, /is_allowed\s*=/);
    assert.doesNotMatch(conflictUpdate, /is_admin\s*=/);
    process.env.ALLOWED_USERS = ""; process.env.ADMIN_USERS = "";
    await upsertUser(db, { telegramId: 123 });
    assert.equal(calls.at(-1).values[6], false);
  } finally {
    if (oldAllowed === undefined) delete process.env.ALLOWED_USERS; else process.env.ALLOWED_USERS = oldAllowed;
    if (oldAdmin === undefined) delete process.env.ADMIN_USERS; else process.env.ADMIN_USERS = oldAdmin;
  }
});
