import { after, test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Replace the database boundary before loading the real service and controller.
// This file never opens a pool or reads a database URL.
const database = {};
globalThis.__agendaCreationDatabase = database;
const databaseModule = `
  export const getClient = () => globalThis.__agendaCreationDatabase.connect();
  export const query = () => { throw new Error("Unexpected pool query"); };
`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith("/db/postgres.js")) {
      return {
        url: `data:text/javascript,${encodeURIComponent(databaseModule)}`,
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});
const { createAgendaPayment } = await import("../src/services/agenda.service.js");
const { create } = await import("../src/controllers/agenda.controller.js");
hooks.deregister();
after(() => { delete globalThis.__agendaCreationDatabase; });

test("connection acquisition failure reaches the controller error handler", { timeout: 1000 }, async () => {
  const failure = new Error("Disposable connection unavailable");
  database.connect = async () => { throw failure; };
  const received = [];
  const response = {
    status() { assert.fail("Connection failure must reach error middleware"); },
  };
  await create({ body: {} }, response, (error) => received.push(error));
  assert.deepEqual(received, [failure]);
});

function transactionFixture({ failInsert = false } = {}) {
  const statements = [];
  let released = false;
  const row = {
    id: "test-bill", created_by_user_id: "test-user", created_by_telegram_id: "123",
    chat_id: -10, total_amount: "10.00", title: "Test bill", members: [],
  };
  database.connect = async () => ({
    async query(sql) {
      statements.push(sql.trim());
      if (sql.includes("INSERT INTO users")) return { rows: [{ id: "test-user", telegram_id: 123 }] };
      if (sql.includes("FROM banks")) return { rows: [{ id: "test-bank", name: "Test bank" }] };
      if (sql.includes("INSERT INTO agenda_payments")) {
        if (failInsert) throw Object.assign(new Error("Test insert failure"), { code: "TEST" });
        return { rows: [row] };
      }
      if (sql.includes("json_agg")) return { rows: [row] };
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  });
  return { statements, get released() { return released; } };
}

const draft = { senderId: 123, chatId: -10, amount: "10.00", bank: "Test bank" };

test("successful creation resolves with the bill and releases its client", async () => {
  const fixture = transactionFixture();
  const bill = await createAgendaPayment(draft);
  assert.equal(bill.id, "test-bill");
  assert.equal(bill.amount, "10.00");
  assert.equal(fixture.statements[0], "BEGIN");
  assert.equal(fixture.statements.at(-1), "COMMIT");
  assert.equal(fixture.released, true);
});

test("failed transaction retains the failure response and rolls back/releases", async () => {
  const fixture = transactionFixture({ failInsert: true });
  assert.equal(await createAgendaPayment(draft), false);
  assert.equal(fixture.statements.at(-1), "ROLLBACK");
  assert.equal(fixture.statements.includes("COMMIT"), false);
  assert.equal(fixture.released, true);
});
